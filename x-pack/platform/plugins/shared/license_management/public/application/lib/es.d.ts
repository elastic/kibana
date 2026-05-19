import type { HttpSetup } from '@kbn/core/public';
export interface PutLicenseResponse {
    error?: {
        reason: string;
    };
    acknowledged?: boolean;
    license_status?: string;
    acknowledge?: Record<string, string[]>;
}
export interface StartBasicResponse {
    acknowledged: boolean;
    basic_was_started: boolean;
    error_message: string;
    acknowledge: Record<string, string[]>;
}
export interface StartTrialResponse {
    trial_was_started: boolean;
    error_message: string;
}
export interface GetPermissionsResponse {
    hasPermission: boolean;
}
export declare function putLicense(http: HttpSetup, license: string, acknowledge: boolean): Promise<PutLicenseResponse>;
export declare function startBasic(http: HttpSetup, acknowledge: boolean): Promise<StartBasicResponse>;
export declare function startTrial(http: HttpSetup): Promise<StartTrialResponse>;
export declare function canStartTrial(http: HttpSetup): Promise<boolean>;
export declare function getPermissions(http: HttpSetup): Promise<GetPermissionsResponse>;
