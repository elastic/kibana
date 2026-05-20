import type { UploadStatusState, AppThunkAction } from '../types';
export declare const uploadLicenseStatus: import("redux-actions").ActionFunction1<UploadStatusState, import("redux-actions").Action<UploadStatusState>>;
export declare const uploadLicense: (licenseString: string, currentLicenseType: string, acknowledge?: boolean) => AppThunkAction<Promise<void>>;
