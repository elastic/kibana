import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Observable } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { ActionType } from '../types';
export type ILicenseState = PublicMethodsOf<LicenseState>;
export interface ActionsLicenseInformation {
    showAppLink: boolean;
    enableAppLink: boolean;
    message: string;
}
export declare class LicenseState {
    private licenseInformation;
    private subscription;
    private license?;
    private _notifyUsage;
    constructor(license$: Observable<ILicense>);
    private updateInformation;
    setNotifyUsage(notifyUsage: LicensingPluginStart['featureUsage']['notifyUsage']): void;
    clean(): void;
    getLicenseInformation(): ActionsLicenseInformation;
    isLicenseValidForActionType(actionType: ActionType, { notifyUsage }?: {
        notifyUsage: boolean;
    }): {
        isValid: true;
    } | {
        isValid: false;
        reason: 'unavailable' | 'expired' | 'invalid';
    };
    private notifyUsage;
    ensureLicenseForActionType(actionType: ActionType): void;
    checkLicense(license: ILicense | undefined): ActionsLicenseInformation;
}
