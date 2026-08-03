import type { ILicense, LicenseType } from '@kbn/licensing-types';
interface UseLicenseReturnValue {
    isAtLeast: (level: LicenseType) => boolean;
    isAtLeastPlatinum: () => boolean;
    isAtLeastGold: () => boolean;
    isAtLeastEnterprise: () => boolean;
    getLicense: () => ILicense | null | undefined;
}
export declare const useLicense: () => UseLicenseReturnValue;
export {};
