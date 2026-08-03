import type { AppThunkAction } from '../types';
export declare const trialStatusLoaded: import("redux-actions").ActionFunction1<boolean, import("redux-actions").Action<boolean>>;
export declare const loadTrialStatus: () => AppThunkAction<Promise<void>>;
export declare const startLicenseTrial: () => AppThunkAction<Promise<void>>;
