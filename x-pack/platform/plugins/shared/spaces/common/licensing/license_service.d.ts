import type { Observable } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
export interface SpacesLicense {
    isEnabled(): boolean;
}
interface SetupDeps {
    license$: Observable<ILicense>;
}
export declare class SpacesLicenseService {
    private licenseSubscription?;
    setup({ license$ }: SetupDeps): {
        license: Readonly<{
            isEnabled: () => boolean;
        }>;
    };
    stop(): void;
    private isSpacesEnabledFromRawLicense;
}
export {};
