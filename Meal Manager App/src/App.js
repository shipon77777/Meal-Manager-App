import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { 
  Users, 
  ShoppingCart, 
  Utensils, 
  LayoutDashboard, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  Wallet,
  CreditCard,
  Lock,
  Unlock,
  ShieldCheck,
  AlertCircle,
  LogOut,
  Settings,
  AlertTriangle,
  Zap,
  History,
  Bell,
  Crown
} from 'lucide-react';

// --- ফায়ারবেস কনফিগারেশন ---
const firebaseConfig = {
  apiKey: "AIzaSyCA4ZiHZT1ebHvsuDalF-ZUmI9etoCClm8",
  authDomain: "talukdar-meal-managment-system.firebaseapp.com",
  projectId: "talukdar-meal-managment-system",
  storageBucket: "talukdar-meal-managment-system.firebasestorage.app",
  messagingSenderId: "343333599497",
  appId: "1:343333599497:web:5f086f6b5014623fd07bd8",
  measurementId: "G-47XHE03SV4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'talukdar-meal-system'; 
const APP_NAME = "তালুকদার মিল ম্যানেজার";

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [members, setMembers] = useState([]);
  const [bazarList, setBazarList] = useState([]);
  const [meals, setMeals] = useState({}); 
  const [deposits, setDeposits] = useState([]);
  const [fines, setFines] = useState([]); 
  const [bills, setBills] = useState({ wifi: 0, current: 0, rent: 0 });
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [permError, setPermError] = useState(null);
  
  const [isManager, setIsManager] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [dbPin, setDbPin] = useState("1234"); 
  const [pinError, setPinError] = useState(false);

  const [newMemberName, setNewMemberName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPinChange, setShowPinChange] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');

  // Step 1: Authentication & Loading Timeout
  useEffect(() => {
    // ৫ সেকেন্ডের ব্যাকআপ টাইমার - ডাটা থাকুক বা না থাকুক লোডিং বন্ধ হবে
    const backupTimer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => {
      unsubscribe();
      clearTimeout(backupTimer);
    };
  }, []);

  // Step 2: Data Listeners
  useEffect(() => {
    if (!user) return;
    
    const logError = (name) => (err) => {
      console.error(`${name} sync error:`, err);
      if (err.code === 'permission-denied') {
        setPermError(`ফায়ারবেস পারমিশন এরর: ${name} লোড করা যাচ্ছে না।`);
      }
    };

    // Settings
    const pinRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'manager_config');
    const unsubPin = onSnapshot(pinRef, (docSnap) => {
      if (docSnap.exists()) { setDbPin(docSnap.data().pin || "1234"); }
    }, logError("PIN"));

    const billsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'fixed_bills');
    const unsubBills = onSnapshot(billsRef, (docSnap) => {
      if (docSnap.exists()) { setBills(docSnap.data()); }
    }, logError("Bills"));

    const noticeRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'notice_config');
    const unsubNotice = onSnapshot(noticeRef, (docSnap) => {
      if (docSnap.exists()) { setNotice(docSnap.data().text || ''); }
    }, logError("Notice"));

    // Collections
    const membersRef = collection(db, 'artifacts', appId, 'public', 'data', 'members');
    const unsubMembers = onSnapshot(membersRef, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false); // ডাটা পাওয়া গেলে সাথে সাথে লোডিং বন্ধ
    }, logError("Members"));

    const bazarRef = collection(db, 'artifacts', appId, 'public', 'data', 'bazar');
    const unsubBazar = onSnapshot(bazarRef, (snapshot) => {
      setBazarList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, logError("Bazar"));

    const mealsRef = collection(db, 'artifacts', appId, 'public', 'data', 'meals');
    const unsubMeals = onSnapshot(mealsRef, (snapshot) => {
      const mealsData = {};
      snapshot.docs.forEach(doc => { mealsData[doc.id] = doc.data(); });
      setMeals(mealsData);
    }, logError("Meals"));

    const depositsRef = collection(db, 'artifacts', appId, 'public', 'data', 'deposits');
    const unsubDeposits = onSnapshot(depositsRef, (snapshot) => {
      setDeposits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, logError("Deposits"));

    const finesRef = collection(db, 'artifacts', appId, 'public', 'data', 'fines');
    const unsubFines = onSnapshot(finesRef, (snapshot) => {
      setFines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, logError("Fines"));

    return () => { 
      unsubPin(); unsubBills(); unsubNotice(); unsubMembers(); unsubBazar(); unsubMeals(); unsubDeposits(); unsubFines(); 
    };
  }, [user]);

  // Actions
  const handleManagerLogin = (e) => {
    e.preventDefault();
    if (managerPin === dbPin) {
      setIsManager(true);
      setShowManagerModal(false);
      setManagerPin('');
      setPinError(false);
    } else {
      setPinError(true);
      setManagerPin('');
    }
  };

  const changePin = async () => {
    if (!user || newPinInput.length !== 4) return;
    try {
      const pinRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'manager_config');
      await setDoc(pinRef, { pin: newPinInput });
      setShowPinChange(false);
      setNewPinInput('');
      alert("পিন পরিবর্তন সফল হয়েছে!");
    } catch (err) { console.error(err); }
  };

  const updateNotice = async (e) => {
    e.preventDefault();
    if (!isManager || !user) return;
    const text = e.target.noticeText.value;
    try {
      const noticeRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'notice_config');
      await setDoc(noticeRef, { text });
      alert("নোটিশ আপডেট সফল!");
    } catch (err) { console.error(err); }
  };

  const updateBills = async (e) => {
    e.preventDefault();
    if (!user) return;
    const form = e.target;
    try {
      const billsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'fixed_bills');
      await setDoc(billsRef, {
        wifi: Number(form.wifi.value),
        current: Number(form.current.value),
        rent: Number(form.rent.value)
      });
      alert("বিল আপডেট সফল হয়েছে!");
    } catch (err) { console.error(err); }
  };

  const addMember = async () => {
    if (!isManager || !user || !newMemberName.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'members'), {
        name: newMemberName.trim(),
        isManagerTag: false,
        createdAt: new Date().toISOString()
      });
      setNewMemberName('');
      alert("মেম্বার যোগ হয়েছে!");
    } catch (err) { console.error(err); }
  };

  const toggleManagerTag = async (id, currentStatus) => {
    if (!isManager || !user) return;
    try {
      const memberRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', id);
      await updateDoc(memberRef, { isManagerTag: !currentStatus });
      alert("ম্যানেজার ট্যাগ আপডেট হয়েছে!");
    } catch (err) { console.error(err); }
  };

  const deleteMember = async (id) => {
    if (!isManager || !user) return;
    if (window.confirm("আপনি কি নিশ্চিতভাবে এই মেম্বারকে ডিলিট করতে চান?")) {
      try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id)); } catch (err) { console.error(err); }
    }
  };

  const updateMeal = async (memberId, count) => {
    if (!isManager || !user) return;
    try {
      const dayRef = doc(db, 'artifacts', appId, 'public', 'data', 'meals', selectedDate);
      const currentDayData = meals[selectedDate] || {};
      await setDoc(dayRef, { ...currentDayData, [memberId]: Number(count) });
    } catch (err) { console.error(err); }
  };

  const addBazarEntry = async (e) => {
    e.preventDefault();
    if (!isManager || !user) return;
    const form = e.target;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bazar'), {
        item: form.item.value,
        amount: Number(form.amount.value),
        type: form.type.value, 
        memberId: form.memberId.value,
        date: form.date.value
      });
      form.reset();
      alert("বাজার খরচ যোগ হয়েছে!");
    } catch (err) { console.error(err); }
  };

  const addDepositEntry = async (e) => {
    e.preventDefault();
    if (!isManager || !user) return;
    const form = e.target;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'deposits'), {
        memberId: form.memberId.value,
        amount: Number(form.amount.value),
        date: new Date().toISOString(),
        userName: getMemberName(form.memberId.value)
      });
      form.reset();
      alert("টাকা জমা করা হয়েছে!");
    } catch (err) { console.error(err); }
  };

  const addFineEntry = async (e) => {
    e.preventDefault();
    if (!isManager || !user) return;
    const form = e.target;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'fines'), {
        memberId: form.memberId.value,
        reason: form.reason.value,
        date: new Date().toISOString().split('T')[0]
      });
      form.reset();
      alert("দণ্ড (২ মিল) যোগ হয়েছে!");
    } catch (err) { console.error(err); }
  };

  const deleteDeposit = async (id) => {
    if (!isManager || !user) return;
    if (window.confirm("এই জমার রেকর্ডটি মুছতে চান?")) {
      try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'deposits', id)); } catch (err) { console.error(err); }
    }
  };

  // Calculations
  const cashBazar = bazarList.filter(item => item.type === 'cash' || !item.type).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const creditBazar = bazarList.filter(item => item.type === 'credit').reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const totalBazar = cashBazar + creditBazar;
  
  const totalFineMealCount = fines.length * 2;
  const totalMealsFromRecords = Object.values(meals).reduce((acc, day) => acc + Object.values(day).reduce((dayAcc, count) => dayAcc + (Number(count) || 0), 0), 0);
  
  const grandTotalMealFactor = totalMealsFromRecords + totalFineMealCount;
  const mealRate = grandTotalMealFactor > 0 ? (totalBazar / grandTotalMealFactor).toFixed(2) : 0;

  const totalDeposits = deposits.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const currentFunding = (totalDeposits - cashBazar).toFixed(2); 

  const totalFixedBills = (Number(bills.wifi) || 0) + (Number(bills.current) || 0) + (Number(bills.rent) || 0);
  const billPerMember = members.length > 0 ? (totalFixedBills / members.length) : 0;

  const getMemberStats = (memberId) => {
    const memberMeals = Object.values(meals).reduce((acc, day) => acc + (Number(day[memberId]) || 0), 0);
    const memberDeposits = deposits.filter(d => d.memberId === memberId).reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    const memberFineCount = fines.filter(f => f.memberId === memberId).length;
    
    const memberEquivalentFineMeals = memberFineCount * 2;
    const totalPayableMeals = memberMeals + memberEquivalentFineMeals;
    const mealCost = (totalPayableMeals * mealRate);
    
    const totalCost = (mealCost + billPerMember).toFixed(2);
    const balance = (memberDeposits - totalCost).toFixed(2);
    
    return { 
      meals: memberMeals, 
      cost: totalCost, 
      balance, 
      fineMeals: memberEquivalentFineMeals, 
      mealCost: mealCost.toFixed(2), 
      paid: memberDeposits 
    };
  };

  const getMemberName = (id) => members.find(m => m.id === id)?.name || "অজানা";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 font-medium font-sans">সার্ভারের সাথে কানেক্ট হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      {/* Error Notifications */}
      {permError && (
        <div className="fixed top-20 left-4 right-4 z-[200] bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <AlertCircle size={24} />
          <p className="text-sm font-bold">{permError}</p>
          <button onClick={() => setPermError(null)} className="ml-auto bg-white/20 p-1 rounded-lg">X</button>
        </div>
      )}

      {/* Manager Login Pop-up */}
      {showManagerModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800">ম্যানেজার লগইন</h3>
            <form onSubmit={handleManagerLogin} className="space-y-4 pt-2">
              <input type="password" maxLength={4} value={managerPin} onChange={(e) => { setManagerPin(e.target.value); setPinError(false); }} placeholder="পিন দিন" className={`w-full p-4 rounded-2xl border ${pinError ? 'border-red-500 bg-red-50' : 'border-slate-200'} text-center text-2xl tracking-[1rem] font-black focus:ring-2 focus:ring-blue-100 outline-none`} autoFocus />
              {pinError && <p className="text-red-500 text-xs font-bold">ভুল পিন!</p>}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setShowManagerModal(false)} className="p-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50">বাতিল</button>
                <button type="submit" className="p-4 bg-blue-600 text-white rounded-2xl font-black">প্রবেশ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Status Bar */}
      <div className={`sticky top-0 w-full z-[60] shadow-sm ${isManager ? 'bg-green-600 border-b border-green-700' : 'bg-white border-b border-slate-200'}`}>
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className={`flex items-center gap-2.5 ${isManager ? 'text-white' : 'text-slate-600'}`}>
            {isManager ? <ShieldCheck size={18} /> : <Lock size={16} />}
            <span className="text-sm font-bold">{isManager ? 'ম্যানেজার মোড' : 'ভিউ মোড'}</span>
          </div>
          <button onClick={() => isManager ? setIsManager(false) : setShowManagerModal(true)} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${isManager ? 'bg-white/10 text-white border border-white/20' : 'bg-blue-600 text-white'}`}>
            {isManager ? 'লগআউট' : 'লগইন'}
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{APP_NAME}</h1>
          <p className="text-slate-500 text-sm italic">ডিজিটাল মিল এবং ফান্ডিং ট্র্যাকার</p>
        </header>

        {/* Tab Logic ... (Dashboard, Meals, Bazar, Members sections remain same as previous version) */}
        {/* Tab Navigation determines display */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {notice && (
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
                <div className="bg-orange-500 p-2 rounded-xl text-white"><Bell size={20} className="animate-ring" /></div>
                <div>
                  <h4 className="text-xs font-black text-orange-600 uppercase tracking-wider mb-1">নোটিশ</h4>
                  <p className="text-sm font-bold text-orange-900 leading-relaxed">{notice}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-l-green-500">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><Wallet size={12}/> মোট ফান্ডিং</p>
                <h2 className="text-lg font-black text-green-600">৳{currentFunding}</h2>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-l-blue-500">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">নগদ বাজার</p>
                <h2 className="text-lg font-black">৳{cashBazar}</h2>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-l-red-500">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">বাকি বাজার</p>
                <h2 className="text-lg font-black text-red-500">৳{creditBazar}</h2>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">মিল রেট</p>
                <h2 className="text-lg font-black text-green-600">৳{mealRate}</h2>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">জনপ্রতি বিল</p>
                <h2 className="text-lg font-black text-indigo-600">৳{billPerMember.toFixed(0)}</h2>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">মোট মিল</p>
                <h2 className="text-lg font-black text-orange-500">{totalMealsFromRecords}</h2>
              </div>
            </div>
            <div className="bg-indigo-600 p-5 rounded-3xl text-white grid grid-cols-3 gap-4">
               <div className="flex flex-col"><span className="text-[10px] uppercase font-bold opacity-70">ওয়াইফাই</span><span className="font-black text-lg">৳{bills.wifi}</span></div>
               <div className="flex flex-col border-x border-white/20 px-4"><span className="text-[10px] uppercase font-bold opacity-70">কারেন্ট</span><span className="font-black text-lg">৳{bills.current}</span></div>
               <div className="flex flex-col"><span className="text-[10px] uppercase font-bold opacity-70">বাসা ভাড়া</span><span className="font-black text-lg">৳{bills.rent}</span></div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-4 bg-slate-50 border-b font-bold text-sm text-slate-600">সদস্যদের হিসাবের সামারি</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                    <tr><th className="p-4">নাম</th><th className="p-4">মিল (দণ্ড)</th><th className="p-4">খরচের হিসাব</th><th className="p-4">মোট জমা</th><th className="p-4">ব্যালেন্স</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map(m => { 
                      const stats = getMemberStats(m.id); 
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="p-4 flex items-center gap-2">
                            <span className="font-medium">{m.name}</span>
                            {m.isManagerTag && <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-amber-200 uppercase"><Crown size={8}/> ম্যানেজার</span>}
                          </td>
                          <td className="p-4 font-bold text-blue-600">{stats.meals} <span className="text-orange-500 text-xs">(+{stats.fineMeals})</span></td>
                          <td className="p-4 text-[10px] leading-tight text-slate-500">মিল: ৳{stats.mealCost}<br/>বিল: ৳{billPerMember.toFixed(0)}</td>
                          <td className="p-4 font-bold text-green-600">৳{stats.paid}</td>
                          <td className={`p-4 font-black ${Number(stats.balance) >= 0 ? 'text-green-600' : 'text-red-500'}`}>৳{stats.balance}</td>
                        </tr>
                      ); 
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs follow the same structure as provided in the prompt file... */}
        {activeTab === 'meals' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
              <CalendarIcon size={20} className="text-blue-600" />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="flex-1 bg-transparent border-none font-bold text-slate-700 outline-none" />
            </div>
            <div className="grid gap-3">
              {members.length === 0 ? <p className="p-10 text-center text-slate-400 italic">মেম্বার যোগ করা নেই।</p> :
                members.map(m => (
                  <div key={m.id} className="bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between">
                    <span className="font-bold">{m.name}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateMeal(m.id, Math.max(0, (meals[selectedDate]?.[m.id] || 0) - 0.5))} disabled={!isManager} className="w-10 h-10 rounded-xl bg-slate-100 font-bold">-</button>
                      <span className="w-8 text-center font-black text-blue-600">{meals[selectedDate]?.[m.id] || 0}</span>
                      <button onClick={() => updateMeal(m.id, (meals[selectedDate]?.[m.id] || 0) + 0.5)} disabled={!isManager} className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold">+</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'bazar' && (
          <div className="space-y-6">
            {isManager && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="bg-white p-6 rounded-3xl shadow-sm border space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={18} className="text-blue-600"/> বাজার খরচ যোগ</h3>
                  <form onSubmit={addBazarEntry} className="space-y-3">
                    <input name="item" placeholder="আইটেম" className="w-full p-3 rounded-xl border outline-none text-sm" required />
                    <input name="amount" type="number" placeholder="টাকা" className="w-full p-3 rounded-xl border outline-none text-sm" required />
                    <select name="memberId" className="w-full p-3 rounded-xl border bg-white outline-none text-sm" required>
                      <option value="">সদস্য নির্বাচন করুন</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-3 rounded-xl border outline-none text-sm" required />
                    <div className="flex gap-4 p-1 text-xs font-bold"><label className="flex items-center gap-2"><input type="radio" name="type" value="cash" defaultChecked /> নগদ</label><label className="flex items-center gap-2"><input type="radio" name="type" value="credit" /> বাকি</label></div>
                    <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold active:scale-95 text-sm">সেভ করুন</button>
                  </form>
                </section>
                <section className="bg-white p-6 rounded-3xl shadow-sm border space-y-4">
                  <h3 className="font-bold flex items-center gap-2 text-orange-600"><AlertTriangle size={18}/> দণ্ড (২ মিল)</h3>
                  <form onSubmit={addFineEntry} className="space-y-3">
                    <input name="reason" placeholder="দণ্ডের কারণ" className="w-full p-3 rounded-xl border outline-none text-sm" required />
                    <select name="memberId" className="w-full p-3 rounded-xl border bg-white outline-none text-sm" required>
                      <option value="">সদস্য নির্বাচন করুন</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <button className="w-full bg-orange-600 text-white p-3 rounded-xl font-bold active:scale-95 text-sm">দণ্ড দিন</button>
                  </form>
                </section>
              </div>
            )}
            <div className="bg-white rounded-3xl shadow-sm border overflow-hidden divide-y">
              <div className="p-4 bg-slate-50 font-bold text-sm">সাম্প্রতিক লেনদেন ও দণ্ড</div>
              {fines.map(f => (
                <div key={f.id} className="p-4 flex justify-between items-center bg-orange-50/30">
                  <div><p className="font-bold text-orange-700">দণ্ড: {f.reason}</p><p className="text-[10px] text-slate-500">{getMemberName(f.memberId)} - {f.date}</p></div>
                  <span className="font-black text-orange-600">+২ মিল</span>
                </div>
              ))}
              {bazarList.map(item => (
                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                  <div><p className="font-bold text-slate-700">{item.item} ({getMemberName(item.memberId)})</p><p className="text-[10px] text-slate-400">{item.date} - {item.type === 'credit' ? 'বাকি' : 'নগদ'}</p></div>
                  <span className="font-black text-slate-800">৳{item.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-6">
            {isManager ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="bg-white p-6 rounded-3xl shadow-sm border space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Bell size={18} className="text-orange-500" /> নোটিশ আপডেট</h3>
                  <form onSubmit={updateNotice} className="space-y-3">
                    <textarea name="noticeText" defaultValue={notice} placeholder="নোটিশ লিখুন..." className="w-full p-3 rounded-xl border outline-none text-sm h-24 resize-none" />
                    <button className="w-full bg-orange-500 text-white p-3 rounded-xl font-bold text-xs active:scale-95">আপডেট করুন</button>
                  </form>
                </section>
                <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4">
                  <div className="flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Plus size={18} className="text-blue-600" /> নতুন সদস্য যোগ</h3><button onClick={() => setShowPinChange(!showPinChange)} className="text-blue-600 text-[10px] font-bold border border-blue-100 px-2 py-1 rounded-lg">পিন বদলান</button></div>
                  {showPinChange ? (<div className="flex gap-2"><input type="password" maxLength={4} value={newPinInput} onChange={(e) => setNewPinInput(e.target.value)} placeholder="নতুন ৪ সংখ্যার পিন" className="flex-1 p-3 rounded-xl border outline-none text-sm" /><button onClick={changePin} className="bg-green-600 text-white px-4 rounded-xl font-bold text-xs">সেভ</button></div>) :
                    (<div className="flex gap-2"><input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="নাম" className="flex-1 p-3 rounded-xl border outline-none text-sm" /><button onClick={addMember} className="bg-blue-600 text-white px-6 rounded-xl font-bold text-xs">যোগ</button></div>)}
                </div>
                <section className="bg-white p-6 rounded-3xl shadow-sm border space-y-4">
                   <h3 className="font-bold flex items-center gap-2 text-indigo-600"><Zap size={18}/> ফিক্সড বিল সেট করুন</h3>
                   <form onSubmit={updateBills} className="grid grid-cols-3 gap-2">
                     <div><label className="text-[10px] font-bold text-slate-400 block mb-1">ওয়াইফাই</label><input name="wifi" type="number" defaultValue={bills.wifi} className="w-full p-2 text-xs rounded-lg border outline-none font-bold" required /></div>
                     <div><label className="text-[10px] font-bold text-slate-400 block mb-1">কারেন্ট</label><input name="current" type="number" defaultValue={bills.current} className="w-full p-2 text-xs rounded-lg border outline-none font-bold" required /></div>
                     <div><label className="text-[10px] font-bold text-slate-400 block mb-1">ভাড়া</label><input name="rent" type="number" defaultValue={bills.rent} className="w-full p-2 text-xs rounded-lg border outline-none font-bold" required /></div>
                     <button className="col-span-3 bg-indigo-600 text-white p-2 rounded-xl font-bold text-[10px] mt-1">আপডেট</button>
                   </form>
                </section>
                <section className="bg-white p-6 rounded-3xl shadow-sm border space-y-4">
                  <h3 className="font-bold flex items-center gap-2 text-green-600"><Wallet size={18}/> টাকা জমা (পেমেন্ট)</h3>
                  <form onSubmit={addDepositEntry} className="flex gap-2">
                    <select name="memberId" className="flex-1 p-3 rounded-xl border bg-white outline-none font-bold text-sm" required>
                      <option value="">মেম্বার নির্বাচন করুন</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input name="amount" type="number" placeholder="টাকা" className="w-24 p-3 rounded-xl border outline-none font-bold text-sm" required />
                    <button className="bg-green-600 text-white px-8 rounded-xl font-bold text-xs">জমা</button>
                  </form>
                </section>
              </div>
            ) : (
              <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
                <AlertCircle className="mx-auto text-slate-300" size={48} /><p className="text-slate-500 font-medium italic">ম্যানেজার মোডে লগইন করলে মেম্বার যোগ, পেমেন্ট এবং নোটিশ এন্ট্রি করা যাবে।</p>
                <button onClick={() => setShowManagerModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-100">ম্যানেজার লগইন</button>
              </div>
            )}
            <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
               <div className="p-4 bg-slate-50 border-b flex items-center gap-2 font-bold text-slate-600 text-sm"><History size={16}/> পেমেন্ট হিস্ট্রি</div>
               <div className="max-h-[400px] overflow-y-auto divide-y">
                  {deposits.length === 0 ? <p className="p-10 text-center text-slate-400 italic">এখনও কোন পেমেন্ট রেকর্ড নেই।</p> :
                    deposits.slice().reverse().map(d => (
                      <div key={d.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                        <div className="flex items-center gap-3"><div className="bg-green-100 p-2 rounded-lg text-green-600"><CreditCard size={16}/></div><div><p className="font-bold text-slate-700">{getMemberName(d.memberId)}</p><p className="text-[10px] text-slate-400">{new Date(d.date).toLocaleString('en-GB')}</p></div></div>
                        <div className="flex items-center gap-4"><span className="font-black text-green-600">৳{d.amount}</span>{isManager && <button onClick={() => deleteDeposit(d.id)} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button>}</div>
                      </div>
                    ))}
               </div>
            </div>
            <div className="grid gap-3 pt-4">
              <h3 className="font-bold text-slate-600 text-sm px-1 flex items-center gap-2"><Users size={16}/> মেম্বার লিস্ট ও কন্ট্রোল</h3>
              {members.map(m => (
                <div key={m.id} className="bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">{m.name.charAt(0).toUpperCase()}</div>
                    <div className="flex flex-col"><span className="font-bold text-slate-700 flex items-center gap-2">{m.name}{m.isManagerTag && <Crown size={14} className="text-amber-500" fill="currentColor"/>}</span><span className="text-[10px] text-slate-400 font-black uppercase">{m.isManagerTag ? 'ম্যানেজার' : 'সদস্য'}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isManager && (<><button onClick={() => toggleManagerTag(m.id, m.isManagerTag)} className={`p-2 rounded-xl border transition-all ${m.isManagerTag ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-500'}`}><Crown size={18} /></button><button onClick={() => deleteMember(m.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button></>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 w-full bg-white border-t flex justify-around p-3 z-50 shadow-xl">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}><LayoutDashboard size={22} /><span className="text-[10px] font-bold">ড্যাশবোর্ড</span></button>
        <button onClick={() => setActiveTab('meals')} className={`flex flex-col items-center gap-1 ${activeTab === 'meals' ? 'text-blue-600' : 'text-slate-400'}`}><Utensils size={22} /><span className="text-[10px] font-bold">মিল</span></button>
        <button onClick={() => setActiveTab('bazar')} className={`flex flex-col items-center gap-1 ${activeTab === 'bazar' ? 'text-blue-600' : 'text-slate-400'}`}><ShoppingCart size={22} /><span className="text-[10px] font-bold">বাজার</span></button>
        <button onClick={() => setActiveTab('members')} className={`flex flex-col items-center gap-1 ${activeTab === 'members' ? 'text-blue-600' : 'text-slate-400'}`}><Users size={22} /><span className="text-[10px] font-bold">ম্যানেজার</span></button>
      </nav>
    </div>
  );
};

export default App;
