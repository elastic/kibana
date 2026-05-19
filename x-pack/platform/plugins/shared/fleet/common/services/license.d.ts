import type { Observable } from 'rxjs';
import type { ILicense, LicenseType } from '@kbn/licensing-types';
export declare class LicenseService {
    private observable;
    private subscription;
    private licenseInformation;
    private updateInformation;
    start(license$: Observable<ILicense>): void;
    stop(): void;
    getLicenseInformation(): ILicense | null;
    getLicenseInformation$(): Observable<ILicense> | null;
    isGoldPlus(): boolean | undefined;
    isPlatinum(): boolean | undefined;
    isEnterprise(): boolean | undefined;
    hasAtLeast(licenseType: LicenseType): boolean | undefined;
}
