import type { Observable } from 'rxjs';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ILicense } from '@kbn/licensing-types';
export type LicenseState = {
    valid: false;
    message: string;
} | {
    valid: true;
};
export type CheckLicense = (license: ILicense) => LicenseState;
export type ILicenseChecker = PublicMethodsOf<LicenseChecker>;
export declare class LicenseChecker {
    private subscription;
    private state;
    constructor(license$: Observable<ILicense>);
    getState(): LicenseState;
    clean(): void;
}
