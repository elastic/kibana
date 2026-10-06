import type { Observable } from 'rxjs';
import type { LicenseType } from '@kbn/licensing-types';
import type { SecurityLicenseFeatures } from './license_features';
export interface SecurityLicense {
    isLicenseAvailable(): boolean;
    getLicenseType(): string | undefined;
    getUnavailableReason: () => string | undefined;
    isEnabled(): boolean;
    getFeatures(): SecurityLicenseFeatures;
    hasAtLeast(licenseType: LicenseType): boolean | undefined;
    features$: Observable<SecurityLicenseFeatures>;
}
