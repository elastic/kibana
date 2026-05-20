import type { Observable } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
export declare const MINIMUM_LICENSE = "basic";
export declare const MINIMUM_FULL_LICENSE = "platinum";
export declare const TRIAL_LICENSE = "trial";
export interface LicenseStatus {
    isValid: boolean;
    isSecurityEnabled: boolean;
    message?: string;
}
export interface MlLicenseInfo {
    license: ILicense | null;
    isSecurityEnabled: boolean;
    hasLicenseExpired: boolean;
    isMlEnabled: boolean;
    isMinimumLicense: boolean;
    isFullLicense: boolean;
    isTrialLicense: boolean;
}
export declare class MlLicense {
    private _licenseSubscription;
    private _license;
    private _isSecurityEnabled;
    private _hasLicenseExpired;
    private _isMlEnabled;
    private _isMinimumLicense;
    private _isFullLicense;
    private _isTrialLicense;
    private _licenseInfo$;
    licenseInfo$: Observable<MlLicenseInfo>;
    isLicenseReady$: Observable<boolean>;
    setup(license$: Observable<ILicense>, callback?: (lic: MlLicense) => void): void;
    getLicenseInfo(): MlLicenseInfo;
    unsubscribe(): void;
    isSecurityEnabled(): boolean;
    hasLicenseExpired(): boolean;
    isMlEnabled(): boolean;
    isMinimumLicense(): boolean;
    isFullLicense(): boolean;
    isTrialLicense(): boolean;
}
export declare function isFullLicense(license: ILicense): boolean;
export declare function isTrialLicense(license: ILicense): boolean;
export declare function isMinimumLicense(license: ILicense): boolean;
export declare function isMlEnabled(license: ILicense): boolean;
