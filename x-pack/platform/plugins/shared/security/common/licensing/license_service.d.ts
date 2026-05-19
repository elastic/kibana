import type { Observable } from 'rxjs';
import type { ILicense, LicenseType } from '@kbn/licensing-types';
import type { SecurityLicenseFeatures } from '@kbn/security-plugin-types-common';
interface SetupDeps {
    license$: Observable<ILicense>;
}
export declare class SecurityLicenseService {
    private licenseSubscription?;
    setup({ license$ }: SetupDeps): {
        license: Readonly<{
            isLicenseAvailable: () => boolean;
            getLicenseType: () => "basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial" | undefined;
            getUnavailableReason: () => string | undefined;
            isEnabled: () => boolean;
            hasAtLeast: (licenseType: LicenseType) => boolean | undefined;
            getFeatures: () => SecurityLicenseFeatures;
            features$: Observable<SecurityLicenseFeatures>;
        }>;
    };
    stop(): void;
    private isSecurityEnabledFromRawLicense;
    private calculateFeaturesFromRawLicense;
}
export {};
