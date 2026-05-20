import type { MlLicense } from '../../../common/license';
export type LicenseCheck = () => void;
export declare function licenseChecks(mlLicense: MlLicense): {
    isFullLicense: LicenseCheck;
    isMinimumLicense: LicenseCheck;
};
