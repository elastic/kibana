import type { StartBasicStatusState, AppThunkAction } from '../types';
export declare const startBasicLicenseStatus: import("redux-actions").ActionFunction1<StartBasicStatusState, import("redux-actions").Action<StartBasicStatusState>>;
export declare const cancelStartBasicLicense: import("redux-actions").ActionFunctionAny<import("redux-actions").Action<any>>;
export declare const startBasicLicense: (currentLicenseType: string, ack?: boolean) => AppThunkAction<Promise<void>>;
