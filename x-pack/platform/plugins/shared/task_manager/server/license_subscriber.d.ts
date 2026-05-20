import type { ILicense } from '@kbn/licensing-types';
import type { Observable } from 'rxjs';
export declare class LicenseSubscriber {
    private subscription;
    private licenseState?;
    constructor(license: Observable<ILicense>);
    private updateState;
    getIsSecurityEnabled(): boolean;
    cleanup(): void;
}
