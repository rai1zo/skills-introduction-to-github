import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  Activity,
  HeartPulse,
  Users,
  User,
  Baby,
  Stethoscope,
  LogOut,
  Mic,
  MicOff,
  Settings,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Toaster, toast } from 'sonner';

/* ========= TYPES ========= */

type UserRole = 'patient' | 'staff' | 'family' | 'admin';

interface UserType {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface StoredUser extends UserType {
  password: string;
}

type FontSize = 'sm' | 'md' | 'lg' | 'xl';
type ContrastMode = 'normal' | 'high';
type ColorBlindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
type UserMode = 'standard' | 'elderly' | 'child' | 'professional';

/* ========= AUTH CONTEXT ========= */

interface AuthContextValue {
  user: UserType | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const HOSPITAL_USER_KEY = 'hospital_user';
const HOSPITAL_USERS_KEY = 'hospital_users';

function getStoredUsers(): StoredUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOSPITAL_USERS_KEY);
    const parsed: StoredUser[] = raw ? JSON.parse(raw) : [];

    // Ensure demo user exists
    const hasDemo = parsed.some((u) => u.email === 'demo@hospital.com');
    if (!hasDemo) {
      const demoUser: StoredUser = {
        id: 'demo-1',
        email: 'demo@hospital.com',
        name: 'Demo Staff User',
        role: 'staff',
        password: 'demo123',
      };
      const updated = [...parsed, demoUser];
      localStorage.setItem(HOSPITAL_USERS_KEY, JSON.stringify(updated));
      return updated;
    }
    return parsed;
  } catch {
    return [];
  }
}

function setStoredUsers(users: StoredUser[]) {
  localStorage.setItem(HOSPITAL_USERS_KEY, JSON.stringify(users));
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(HOSPITAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const isAuthenticated = !!user;

  useEffect(() => {
    // Initialize demo user on mount
    getStoredUsers();
  }, []);

  const login = async (email: string, password: string) => {
    const users = getStoredUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) {
      toast.error('Invalid email or password');
      throw new Error('Invalid credentials');
    }
    const { password: _pw, ...clean } = found;
    setUser(clean);
    localStorage.setItem(HOSPITAL_USER_KEY, JSON.stringify(clean));
    toast.success(`Welcome back, ${clean.name}`);
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ) => {
    const users = getStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      toast.error('This email is already registered');
      throw new Error('Email exists');
    }
    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      password,
      role,
    };
    const updated = [...users, newUser];
    setStoredUsers(updated);
    const { password: _pw, ...clean } = newUser;
    setUser(clean);
    localStorage.setItem(HOSPITAL_USER_KEY, JSON.stringify(clean));
    toast.success('Account created, welcome!');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(HOSPITAL_USER_KEY);
    toast.info('Logged out');
  };

  const value = useMemo(
    () => ({ user, isAuthenticated, login, signup, logout }),
    [user, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

/* ========= ACCESSIBILITY CONTEXT ========= */

interface AccessibilityState {
  fontSize: FontSize;
  contrast: ContrastMode;
  colorBlindMode: ColorBlindMode;
  userMode: UserMode;
  reduceMotion: boolean;
  voiceEnabled: boolean;
}

interface AccessibilityContextValue extends AccessibilityState {
  setFontSize: (size: FontSize) => void;
  setContrast: (c: ContrastMode) => void;
  setColorBlindMode: (m: ColorBlindMode) => void;
  setUserMode: (m: UserMode) => void;
  setReduceMotion: (b: boolean) => void;
  setVoiceEnabled: (b: boolean) => void;
  speak: (text: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(
  undefined
);

const ACCESS_KEY = 'hospital_accessibility';

const defaultAccessibility: AccessibilityState = {
  fontSize: 'md',
  contrast: 'normal',
  colorBlindMode: 'none',
  userMode: 'standard',
  reduceMotion: false,
  voiceEnabled: false,
};

function getStoredAccessibility(): AccessibilityState {
  if (typeof window === 'undefined') return defaultAccessibility;
  try {
    const raw = localStorage.getItem(ACCESS_KEY);
    return raw ? { ...defaultAccessibility, ...JSON.parse(raw) } : defaultAccessibility;
  } catch {
    return defaultAccessibility;
  }
}

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AccessibilityState>(() =>
    getStoredAccessibility()
  );

  useEffect(() => {
    localStorage.setItem(ACCESS_KEY, JSON.stringify(state));
    const root = document.documentElement;
    root.setAttribute('data-font-size', state.fontSize);
    root.setAttribute('data-contrast', state.contrast);
    root.setAttribute('data-user-mode', state.userMode);
    root.setAttribute('data-reduce-motion', String(state.reduceMotion));
    root.setAttribute('data-colorblind-mode', state.colorBlindMode);
  }, [state]);

  const speak = (text: string) => {
    if (!state.voiceEnabled) return;
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  };

  const value: AccessibilityContextValue = {
    ...state,
    setFontSize: (fontSize) => setState((s) => ({ ...s, fontSize })),
    setContrast: (contrast) => setState((s) => ({ ...s, contrast })),
    setColorBlindMode: (colorBlindMode) => setState((s) => ({ ...s, colorBlindMode })),
    setUserMode: (userMode) => setState((s) => ({ ...s, userMode })),
    setReduceMotion: (reduceMotion) => setState((s) => ({ ...s, reduceMotion })),
    setVoiceEnabled: (voiceEnabled) => {
      setState((s) => ({ ...s, voiceEnabled }));
      toast.info(voiceEnabled ? 'Voice guidance enabled' : 'Voice guidance disabled');
    },
    speak,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used inside provider');
  return ctx;
};

/* ========= ERROR BOUNDARY ========= */

export class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-6 bg-red-900/40 border border-red-400 rounded-2xl text-red-200 space-y-3">
          <h2 className="text-xl font-bold">⚠ Something went wrong.</h2>
          <button
            onClick={this.reset}
            className="hc-btn-primary bg-red-600 hover:bg-red-700 text-white"
          >
            Refresh Component
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ========= ACCESSIBILITY TOOLBAR ========= */

export function AccessibilityToolbar() {
  const a11y = useAccessibility();

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-3 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10">
      <button
        onClick={() => a11y.setVoiceEnabled(!a11y.voiceEnabled)}
        className="hc-btn-outline flex items-center gap-2"
      >
        {a11y.voiceEnabled ? <MicOff size={18} /> : <Mic size={18} />} Voice
      </button>

      <button
        onClick={() =>
          a11y.setFontSize(a11y.fontSize === 'md' ? 'xl' : 'md')
        }
        className="hc-btn-outline"
      >
        A++
      </button>

      <button
        onClick={() =>
          a11y.setContrast(a11y.contrast === 'normal' ? 'high' : 'normal')
        }
        className="hc-btn-outline"
      >
        Contrast
      </button>

      <button
        onClick={() =>
          a11y.setUserMode(
            a11y.userMode === 'elderly'
              ? 'child'
              : a11y.userMode === 'child'
              ? 'professional'
              : a11y.userMode === 'professional'
              ? 'standard'
              : 'elderly'
          )
        }
        className="hc-btn-outline"
      >
        {a11y.userMode}
      </button>
    </div>
  );
}

/* ========= BASIC UI PRIMITIVES ========= */

function Card(props: { children: ReactNode; className?: string }) {
  const { children, className = '' } = props;
  return (
    <div
      className={`hc-card rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }
) {
  const { children, className = '', ...rest } = props;
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...rest}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return (
    <textarea
      className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...rest}
    />
  );
}

/* ========= ICON + ANALYTICS SUMMARY ========= */

function BedIcon(props: { size?: number }) {
  const size = props.size ?? 20;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="text-white"
    >
      <rect x="3" y="10" width="18" height="6" rx="1" fill="currentColor" />
      <rect x="4" y="7" width="6" height="3" rx="1" fill="currentColor" />
    </svg>
  );
}

const AnalyticsSummary = () => {
  const cards = [
    {
      label: 'Total Patients',
      value: '47',
      icon: Users,
    },
    {
      label: 'Avg LOS',
      value: '4.8 days',
      icon: Activity,
    },
    {
      label: 'Bed Occupancy',
      value: '82%',
      icon: BedIcon,
    },
    {
      label: 'Satisfaction',
      value: '94%',
      icon: HeartPulse,
    },
    {
      label: 'On-Time Discharge',
      value: '89%',
      icon: Stethoscope,
    },
  ];

  return (
    <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 p-1 shadow-2xl">
      <div className="grid gap-4 rounded-3xl bg-slate-950/85 p-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/80">
              <c.icon size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-300">{c.label}</div>
              <div className="text-lg font-semibold text-white">{c.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ========= DOCTOR/NURSE CLINICAL PANEL ========= */

const mockPatients = [
  {
    id: 1,
    name: 'Sarah Johnson',
    age: 62,
    condition: 'Hip Replacement',
    room: '302B',
    predictedLOS: 5,
    currentDay: 3,
    status: 'On-track',
    vitals: { hr: 72, bp: '120/80', temp: '98.6°F', o2: '98%' },
    lastNote: 'Physical therapy progressing well',
    progress: [
      { day: 1, expected: 20, actual: 18 },
      { day: 2, expected: 40, actual: 42 },
      { day: 3, expected: 60, actual: 61 },
      { day: 4, expected: 80, actual: 0 },
      { day: 5, expected: 100, actual: 0 },
    ],
  },
  {
    id: 2,
    name: 'Michael Lee',
    age: 54,
    condition: 'Pneumonia',
    room: '210A',
    predictedLOS: 7,
    currentDay: 5,
    status: 'At-risk',
    vitals: { hr: 96, bp: '130/88', temp: '100.2°F', o2: '92%' },
    lastNote: 'O2 saturation trending low — monitor closely',
    progress: [
      { day: 1, expected: 15, actual: 10 },
      { day: 2, expected: 30, actual: 25 },
      { day: 3, expected: 45, actual: 35 },
      { day: 4, expected: 60, actual: 50 },
      { day: 5, expected: 75, actual: 55 },
    ],
  },
];

const DoctorNursePanel = () => {
  const [selectedId, setSelectedId] = useState<number>(mockPatients[0].id);
  const selected = mockPatients.find((p) => p.id === selectedId) ?? mockPatients[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr,1.6fr]">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Patients</h2>
          <div className="hc-badge bg-blue-500/10 text-blue-200">LOS AI</div>
        </div>
        <div className="space-y-2 text-sm">
          {mockPatients.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                selectedId === p.id
                  ? 'border-blue-500 bg-blue-600/10'
                  : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-white">{p.name}</div>
                  <div className="text-xs text-slate-400">
                    {p.condition} • Room {p.room}
                  </div>
                </div>
                <div className="hc-badge bg-slate-800 text-xs text-slate-200">
                  LOS {p.currentDay}/{p.predictedLOS}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-300">
                <span className="rounded-full bg-slate-800 px-2 py-1">Status: {p.status}</span>
                <span className="rounded-full bg-slate-800 px-2 py-1">Age {p.age}</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-lg font-semibold">{selected.name}</div>
            <div className="text-sm text-slate-400">
              {selected.condition} • Room {selected.room}
            </div>
          </div>
          <div className="ml-auto flex gap-2 text-xs">
            <span className="hc-badge bg-emerald-500/10 text-emerald-300">
              Predicted LOS: {selected.predictedLOS} days
            </span>
            <span className="hc-badge bg-blue-500/10 text-blue-300">
              Day {selected.currentDay}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-2xl bg-slate-900/80 p-3">
            <div className="text-slate-400">Heart Rate</div>
            <div className="text-lg font-semibold text-white">{selected.vitals.hr} bpm</div>
          </div>
          <div className="rounded-2xl bg-slate-900/80 p-3">
            <div className="text-slate-400">Blood Pressure</div>
            <div className="text-lg font-semibold text-white">{selected.vitals.bp}</div>
          </div>
          <div className="rounded-2xl bg-slate-900/80 p-3">
            <div className="text-slate-400">Temperature</div>
            <div className="text-lg font-semibold text-white">{selected.vitals.temp}</div>
          </div>
          <div className="rounded-2xl bg-slate-900/80 p-3">
            <div className="text-slate-400">Oxygen</div>
            <div className="text-lg font-semibold text-white">{selected.vitals.o2}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr,1fr]">
          <div className="rounded-2xl bg-slate-900/80 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              Recovery Progress
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selected.progress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis stroke="#64748b" domain={[0, 110]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      border: '1px solid #1e293b',
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="expected" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl bg-slate-900/80 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Clinical Notes</div>
              <span className="hc-badge bg-purple-500/10 text-purple-200 text-[10px]">
                AI summary
              </span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-200">
              {selected.lastNote}
            </div>
            <div className="text-[11px] text-slate-400">
              Actions: optimise pain management, monitor fluids, maintain physio schedule.
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <button className="hc-btn-outline">Escalate</button>
              <button className="hc-btn-outline">Message family</button>
              <button className="hc-btn-outline">Order labs</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

/* ========= PATIENT VIEW ========= */

const PatientView = () => {
  const currentDay = 3;
  const totalDays = 6;
  const percent = Math.round((currentDay / totalDays) * 100);

  const timeline = [
    { day: 1, label: 'Admission & Initial Assessment', done: true },
    { day: 2, label: 'Surgery Completed', done: true },
    { day: 3, label: 'First Physical Therapy', done: true, today: true },
    { day: 4, label: 'Pain Management Review', done: false },
    { day: 5, label: 'Discharge Planning', done: false },
    { day: 6, label: 'Expected Discharge', done: false },
  ];

  const schedule = [
    { time: '09:00', label: 'Blood test', type: 'test' },
    { time: '11:00', label: 'Doctor round', type: 'consult' },
    { time: '14:00', label: 'Physiotherapy session', type: 'therapy' },
    { time: '18:00', label: 'Pain medication', type: 'med' },
  ];

  const messages = [
    "You're making excellent progress!",
    'Every step forward counts – you are doing great.',
    'Your care team is proud of your efforts.',
    'Rest, recover, and let us take care of the rest.',
  ];
  const motivational =
    messages[Math.floor((Date.now() / 60000) % messages.length)];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.7fr,1.2fr]">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">My Recovery Journey</h2>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
            <span>
              Day {currentDay} of {totalDays}
            </span>
            <span>{percent}% complete</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-800">
            <div
              className="h-3 rounded-full bg-emerald-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-slate-300">
            Recovery Timeline
          </div>
          <ol className="space-y-2 text-xs">
            {timeline.map((t) => (
              <li
                key={t.day}
                className="flex items-start gap-2 rounded-xl bg-slate-900/80 p-2"
              >
                <div
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    t.done
                      ? 'bg-emerald-500 text-slate-900'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {t.done ? '✓' : t.day}
                </div>
                <div>
                  <div className="font-semibold">
                    {t.label}{' '}
                    {t.today && (
                      <span className="ml-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">Day {t.day}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <div className="text-xs font-semibold text-slate-300">
            Today&apos;s Schedule
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {schedule.map((s) => (
              <li
                key={s.time}
                className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{s.time}</span>
                  <span className="font-medium text-slate-100">{s.label}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                    s.type === 'test'
                      ? 'bg-purple-500/20 text-purple-300'
                      : s.type === 'consult'
                      ? 'bg-blue-500/20 text-blue-300'
                      : s.type === 'therapy'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {s.type}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-500/20 via-blue-500/10 to-purple-500/20">
          <div className="text-xs font-semibold text-emerald-300">
            Motivational Message
          </div>
          <div className="mt-2 text-sm">{motivational}</div>
        </Card>
      </div>
    </div>
  );
};

/* ========= FAMILY PORTAL ========= */

const FamilyPortal = () => {
  const team = [
    { name: 'Dr. Emily Peterson', role: 'Lead Surgeon' },
    { name: 'Sarah Thompson', role: 'Primary Nurse' },
    { name: 'Alex Rivera', role: 'Physiotherapist' },
  ];

  const updates = [
    {
      type: 'positive',
      title: 'Recovery on track',
      description: 'Walking distance improved during morning physiotherapy.',
    },
    {
      type: 'info',
      title: 'Lab results pending',
      description: 'Blood tests sent at 08:30, results expected by 12:00.',
    },
    {
      type: 'neutral',
      title: 'Next step',
      description: 'Pain management review scheduled tomorrow at 10:00.',
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr,1.2fr]">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Family Status Overview</h2>

        {/* Status cards */}
        <div className="grid gap-3 text-xs md:grid-cols-2">
          <div className="space-y-1 rounded-2xl bg-emerald-500/10 p-3">
            <div className="text-slate-300">Expected Discharge</div>
            <div className="text-base font-semibold text-emerald-300">
              2 days (Dec 3)
            </div>
          </div>
          <div className="space-y-1 rounded-2xl bg-blue-500/10 p-3">
            <div className="text-slate-300">Current Status</div>
            <div className="text-base font-semibold text-blue-300">
              Stable, recovering well
            </div>
          </div>
        </div>

        {/* Recent updates */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300">Recent Updates</div>
          <div className="space-y-2 text-xs">
            {updates.map((u, i) => (
              <div
                key={i}
                className={`rounded-2xl p-3 ${
                  u.type === 'positive'
                    ? 'bg-emerald-500/10 text-emerald-100'
                    : u.type === 'info'
                    ? 'bg-blue-500/10 text-blue-100'
                    : 'bg-slate-800 text-slate-100'
                }`}
              >
                <div className="font-semibold">{u.title}</div>
                <div className="text-[11px] opacity-80">{u.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Visiting info */}
        <div className="text-xs text-slate-300">
          <div className="font-semibold">Visiting Information</div>
          <div className="mt-1 text-slate-400">
            Visiting hours: 10:00 – 20:00 • Room: 302B • Max 2 visitors at a time
          </div>
        </div>
      </Card>

      {/* Right column: care team + message box */}
      <Card className="space-y-4">
        <div>
          <div className="text-xs font-semibold text-slate-300">Care Team</div>
          <div className="mt-2 space-y-2 text-xs">
            {team.map((m) => (
              <div
                key={m.name}
                className="flex items-center gap-3 rounded-xl bg-slate-900/80 p-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                  <User size={16} />
                </div>
                <div>
                  <div className="font-semibold text-slate-100">{m.name}</div>
                  <div className="text-[11px] text-slate-400">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message care team */}
        <div>
          <div className="mb-2 text-xs font-semibold text-slate-300">
            Message care team (non-urgent)
          </div>
          <Textarea
            rows={4}
            placeholder="Write your question here…"
            className="text-xs"
          />
          <Button
            className="mt-2 w-full bg-blue-600 text-xs"
            onClick={() => toast.success('Message sent (mock)')}
          >
            Send (response in 2–4 hours)
          </Button>
        </div>

        <div className="text-[11px] text-slate-400">
          For urgent concerns, please contact the nurses station directly at extension
          302.
        </div>
      </Card>
    </div>
  );
};

/* ========= ADMIN OPERATIONS DASHBOARD ========= */

const AdminOperations = () => {
  const bedForecast = [
    { day: 'Today', occupied: 82 },
    { day: '+1', occupied: 80 },
    { day: '+2', occupied: 78 },
    { day: '+3', occupied: 81 },
    { day: '+4', occupied: 79 },
    { day: '+5', occupied: 77 },
    { day: '+6', occupied: 76 },
  ];

  const workload = [
    { unit: 'ICU', workload: 94 },
    { unit: 'Emergency', workload: 88 },
    { unit: 'Surgery', workload: 76 },
    { unit: 'Cardiology', workload: 68 },
    { unit: 'General', workload: 59 },
  ];

  const supplies = [
    { item: 'Surgical masks', status: 'Sufficient' },
    { item: 'IV fluids', status: 'Reorder needed' },
    { item: 'Antibiotics', status: 'Sufficient' },
    { item: 'Pain medication', status: 'Reorder needed' },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {/* Bed management */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bed Management</h2>
          <div className="text-xs text-slate-400">82 / 100 beds occupied</div>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bedForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  border: '1px solid #1e293b',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="occupied"
                stroke="#22c55e"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="text-xs text-slate-400">
          Forecasted occupancy supports planning for elective surgeries and discharge
          logistics.
        </div>
      </Card>

      {/* Workload + supplies */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Staff Workload & Supplies</h2>

        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workload}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="unit" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  border: '1px solid #1e293b',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="workload" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-slate-300">
            Supply Forecast
          </div>
          <div className="grid gap-2 text-xs md:grid-cols-2">
            {supplies.map((s) => (
              <div
                key={s.item}
                className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2"
              >
                <span>{s.item}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    s.status === 'Sufficient'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

/* ========= ELDERLY PATIENT VIEW ========= */

const ElderlyPatientView = () => {
  const { speak } = useAccessibility();

  const actions = [
    { label: 'Call Nurse', color: 'bg-red-500', key: 'nurse' },
    { label: 'Call Family', color: 'bg-blue-500', key: 'family' },
    { label: 'My Medicine', color: 'bg-emerald-500', key: 'medicine' },
    { label: 'My Schedule', color: 'bg-purple-500', key: 'schedule' },
    { label: 'How I Feel', color: 'bg-amber-500', key: 'feel' },
    { label: 'Help', color: 'bg-slate-500', key: 'help' },
  ];

  useEffect(() => {
    speak(
      'Welcome. Large buttons are available: call nurse, call family, medicine, schedule, how I feel, and help.'
    );
  }, [speak]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
      <Card className="space-y-4">
        <h2 className="text-2xl font-semibold">Hello, we&apos;re here to help you 💙</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((a) => (
            <button
              key={a.key}
              className={`flex min-h-[60px] items-center justify-center rounded-2xl text-lg font-semibold text-slate-950 ${a.color}`}
              onClick={() => speak(`${a.label} button pressed`)}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="rounded-2xl bg-yellow-500/20 p-3 text-lg text-yellow-100">
          <div className="font-semibold">Reminder</div>
          <div className="mt-1">
            It&apos;s almost time for your evening medicine. A nurse will visit you
            soon.
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Your Stay</div>
            <div className="text-sm text-slate-400">
              We&apos;re looking after you carefully.
            </div>
          </div>
        </div>
        <div className="grid gap-3 text-center text-xl font-semibold">
          <div className="rounded-2xl bg-slate-900/80 p-4">
            <div className="text-sm text-slate-400">Days in hospital</div>
            <div className="mt-1 text-3xl text-slate-50">3</div>
          </div>
          <div className="rounded-2xl bg-slate-900/80 p-4">
            <div className="text-sm text-slate-400">Days until going home</div>
            <div className="mt-1 text-3xl text-emerald-400">2</div>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900/80 p-3 text-lg">
          <div className="text-sm text-slate-400">How you said you feel</div>
          <div className="mt-1 text-2xl">
            😊 Comfortable, just a little tired today.
          </div>
        </div>
      </Card>
    </div>
  );
};

/* ========= CHILD PATIENT VIEW (KIDS MODE) ========= */

function MoodButton(props: {
  label: string;
  emoji: string;
  color: string;
  onSelect: () => void;
}) {
  const { label, emoji, color, onSelect } = props;
  return (
    <button
      className={`flex flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs font-semibold text-slate-950 ${color}`}
      onClick={onSelect}
    >
      <span className="text-xl">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

const ChildPatientView = () => {
  const { speak } = useAccessibility();
  const [stars, setStars] = useState(4);
  const sleepsLeft = 2;

  const addStar = () => {
    setStars((s) => Math.min(10, s + 1));
    speak('You earned a star! You are very brave.');
  };

  useEffect(() => {
    speak('Hi, I am Doctor Bear. I am proud of you. Let us be brave together.');
  }, [speak]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr,1.2fr]">
      {/* Left: Dr Bear, stars, mood */}
      <Card className="space-y-4 bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-yellow-500/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-pink-200">
              Dr. Bear says:
            </div>
            <div className="mt-1 text-xl">
              You&apos;re a superhero! 💫 Thanks for being so brave.
            </div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 text-3xl">
            🐻
          </div>
        </div>

        {/* Stars */}
        <div className="rounded-2xl bg-slate-950/80 p-3">
          <div className="text-xs text-slate-300">Stars collected</div>
          <div className="mt-2 flex flex-wrap items-center gap-1 text-xl">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i}>{i < stars ? '⭐' : '☆'}</span>
            ))}
          </div>
          <Button className="mt-3 bg-pink-500 text-xs" onClick={addStar}>
            Earn a Star
          </Button>
        </div>

        {/* Mood */}
        <div className="rounded-2xl bg-slate-950/80 p-3 text-sm">
          <div className="text-xs text-slate-300">Mood</div>
          <div className="mt-2 flex gap-2">
            <MoodButton
              label="Happy"
              emoji="😊"
              color="bg-emerald-500"
              onSelect={() => speak('Nurse will see that you are happy')}
            />
            <MoodButton
              label="Okay"
              emoji="😐"
              color="bg-yellow-500"
              onSelect={() => speak('Nurse will see that you feel okay')}
            />
            <MoodButton
              label="Sad"
              emoji="😢"
              color="bg-red-500"
              onSelect={() =>
                speak(
                  'Thank you for telling us you feel sad. A nurse will check on you.'
                )
              }
            />
          </div>
        </div>
      </Card>

      {/* Right: sleeps / fun actions / emergency */}
      <Card className="space-y-4 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-sky-500/20">
        <div className="text-sm font-semibold text-slate-100">Going home</div>
        <div className="text-sm">
          Only <span className="font-bold text-yellow-300">{sleepsLeft}</span> more
          sleeps until you go home! 🌙
        </div>
        <div className="flex gap-1 text-2xl">
          {Array.from({ length: sleepsLeft }).map((_, i) => (
            <span key={i}>🌙</span>
          ))}
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-slate-300">
            Fun activities
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {['Play Games 🎮', 'Call Mom & Dad 📞', 'Watch Cartoons 📺', 'Snack Time 🍪'].map(
              (a) => (
                <button
                  key={a}
                  className="rounded-2xl bg-slate-950/80 px-3 py-2 text-left"
                  onClick={() => speak(a)}
                >
                  {a}
                </button>
              )
            )}
          </div>
        </div>

        <Button
          className="mt-1 w-full bg-red-500 text-sm"
          onClick={() =>
            speak(
              'Help button pressed. A nurse is on the way to check on you quickly.'
            )
          }
        >
          HELP! 🆘
        </Button>
      </Card>
    </div>
  );
};

/* ========= AUTH PAGES ========= */

type AuthScreen = 'home' | 'login' | 'signup';

const LoginPage = ({ onSwitch }: { onSwitch: (screen: AuthScreen) => void }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@hospital.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      // error handled with toast in context
    } finally {
      setLoading(false);
    }
  };

  const quickDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    setEmail('demo@hospital.com');
    setPassword('demo123');
    // Trigger login after state update
    setTimeout(() => {
      const fakeEvent = { preventDefault() {} } as unknown as React.FormEvent;
      handleLogin(fakeEvent);
    }, 0);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <Card className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600">
            <Activity size={18} />
          </div>
          <div>
            <div className="text-lg font-semibold">Hospital Command Center</div>
            <div className="text-[11px] text-slate-400">
              AI-assisted hospital command dashboard
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-300">
          Sign in to view dashboards, predictions and accessibility modes.
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div className="space-y-1 text-sm">
            <label>Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label>Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-blue-600"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <Button
          type="button"
          className="w-full bg-emerald-600 text-xs"
          onClick={quickDemo}
        >
          Try Demo Account (demo@hospital.com / demo123)
        </Button>

        <div className="text-center text-xs text-slate-400">
          No account?{' '}
          <button
            className="text-blue-400 underline"
            onClick={() => onSwitch('signup')}
          >
            Sign up
          </button>
        </div>

        <div className="rounded-xl bg-slate-900/80 p-2 text-[11px] text-slate-400">
          Demo credentials: <strong>demo@hospital.com</strong> /{' '}
          <strong>demo123</strong> (role: staff)
        </div>
      </Card>
    </div>
  );
};

const SignupPage = ({ onSwitch }: { onSwitch: (screen: AuthScreen) => void }) => {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password, role);
    } catch {
      // toast handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <Card className="w-full max-w-md space-y-4">
        <div className="text-lg font-semibold">Create your account</div>

        <form onSubmit={handleSignup} className="space-y-3 text-sm">
          <div className="space-y-1">
            <label>Full name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-1">
            <label>Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs"
            >
              <option value="patient">Patient</option>
              <option value="family">Family Member</option>
              <option value="staff">Healthcare Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="space-y-1">
            <label>Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label>Confirm password</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-emerald-600"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <div className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <button
            className="text-blue-400 underline"
            onClick={() => onSwitch('login')}
          >
            Sign in
          </button>
        </div>
      </Card>
    </div>
  );
};

/* ========= HOME PAGE (LANDING) ========= */

const HomePage = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="hc-shell flex flex-col gap-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600">
              <Activity size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold">Hospital Command Center</div>
              <div className="text-[11px] text-slate-400">
                AI-assisted operations for every ward
              </div>
            </div>
          </div>
        </header>

        <main className="grid gap-10 md:grid-cols-[1.5fr,1fr]">
          {/* Left: hero */}
          <section className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold leading-tight">
                One command center for patients, families, doctors and admins.
              </h1>
              <p className="mt-3 text-sm text-slate-300">
                Real-time bed occupancy, patient recovery journeys, family updates and
                AI-powered predictions in a single, accessible dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="hc-btn-primary text-sm"
                onClick={onStart}
              >
                Get started
              </button>
              <button className="hc-btn-outline text-xs">Learn more</button>
            </div>
            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="hc-card-soft rounded-2xl p-3">
                <div className="text-slate-400">AI Length of Stay</div>
                <div className="text-lg font-semibold text-emerald-400">
                  88% accuracy
                </div>
              </div>
              <div className="hc-card-soft rounded-2xl p-3">
                <div className="text-slate-400">Reduction in delays</div>
                <div className="text-lg font-semibold text-emerald-400">
                  23% faster discharge
                </div>
              </div>
              <div className="hc-card-soft rounded-2xl p-3">
                <div className="text-slate-400">Patient satisfaction</div>
                <div className="text-lg font-semibold text-emerald-400">+14 pts</div>
              </div>
            </div>
          </section>

          {/* Right: accessibility & personas */}
          <section className="space-y-4">
            <Card className="space-y-3">
              <div className="text-xs font-semibold text-slate-300">
                Accessibility first
              </div>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>• Elderly mode with large buttons and voice guidance</li>
                <li>• Kids mode with Dr. Bear, stars and emoji</li>
                <li>• Professional mode with compact, dense dashboards</li>
                <li>• WCAG-focused font and contrast controls</li>
              </ul>
            </Card>
            <Card className="space-y-3">
              <div className="text-xs font-semibold text-slate-300">
                Persona examples
              </div>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>• ICU charge nurse tracking at-risk patients</li>
                <li>• Family member checking discharge plan</li>
                <li>• Elderly patient using voice-guided big buttons</li>
                <li>• Admin forecasting beds and supplies</li>
              </ul>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
};

/* ========= MAIN DASHBOARD ========= */

type DashboardTab =
  | 'doctor'
  | 'patient'
  | 'family'
  | 'admin'
  | 'elderly'
  | 'child';

function TabButton(props: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  onClick: () => void;
}) {
  const { active, label, icon: Icon, onClick } = props;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs ${
        active
          ? 'bg-blue-600 text-slate-50'
          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
      }`}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { userMode } = useAccessibility();
  const [tab, setTab] = useState<DashboardTab>('doctor');

  // Auto-switch when userMode changes
  useEffect(() => {
    if (userMode === 'elderly') setTab('elderly');
    else if (userMode === 'child') setTab('child');
    else if (userMode === 'professional') setTab('doctor');
  }, [userMode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="hc-shell flex flex-col gap-4 pb-8">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600">
              <Activity size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold">Hospital Command Center</div>
              <div className="text-[11px] text-slate-400">
                Logged in as {user?.name} ({user?.role})
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              className="border border-slate-700 bg-slate-900 text-xs"
              onClick={logout}
            >
              <LogOut className="mr-1" size={14} /> Logout
            </Button>
          </div>
        </header>

        {/* Analytics strip */}
        <AnalyticsSummary />

        {/* Tabs */}
        <nav className="mt-4 flex flex-wrap gap-2 text-xs">
          <TabButton
            active={tab === 'doctor'}
            onClick={() => setTab('doctor')}
            label="Doctor/Nurse"
            icon={Stethoscope}
          />
          <TabButton
            active={tab === 'patient'}
            onClick={() => setTab('patient')}
            label="Patient View"
            icon={HeartPulse}
          />
          <TabButton
            active={tab === 'family'}
            onClick={() => setTab('family')}
            label="Family Portal"
            icon={Users}
          />
          <TabButton
            active={tab === 'admin'}
            onClick={() => setTab('admin')}
            label="Admin Ops"
            icon={Activity}
          />
          <TabButton
            active={tab === 'elderly'}
            onClick={() => setTab('elderly')}
            label="Elderly Mode"
            icon={User}
          />
          <TabButton
            active={tab === 'child'}
            onClick={() => setTab('child')}
            label="Kids Mode"
            icon={Baby}
          />
        </nav>

        {/* Main content */}
        <main className="mt-2">
          {tab === 'doctor' && <DoctorNursePanel />}
          {tab === 'patient' && <PatientView />}
          {tab === 'family' && <FamilyPortal />}
          {tab === 'admin' && <AdminOperations />}
          {tab === 'elderly' && <ElderlyPatientView />}
          {tab === 'child' && <ChildPatientView />}
        </main>
      </div>
    </div>
  );
};

/* ========= APP SHELL (AUTH FLOW) ========= */

const AppShell = () => {
  const { isAuthenticated } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('home');

  if (!isAuthenticated) {
    if (authScreen === 'login') {
      return <LoginPage onSwitch={setAuthScreen} />;
    }
    if (authScreen === 'signup') {
      return <SignupPage onSwitch={setAuthScreen} />;
    }
    return <HomePage onStart={() => setAuthScreen('login')} />;
  }

  return <Dashboard />;
};

/* ========= ROOT APP ========= */

function App() {
  return (
    <>
      <ErrorBoundary>
        <AuthProvider>
          <AccessibilityProvider>
            <AppShell />
            {/* Floating global accessibility toolbar (top-right) */}
            <AccessibilityToolbar />
          </AccessibilityProvider>
        </AuthProvider>
      </ErrorBoundary>
      <Toaster richColors position="top-center" />
    </>
  );
}

export default App;
