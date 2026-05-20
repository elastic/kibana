import type { Observable } from 'rxjs';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { ILicense, LicenseType } from '@kbn/licensing-types';
export declare class LicensingService {
    private readonly license$;
    private readonly _notifyUsage;
    constructor(license$: Observable<ILicense>, notifyUsage: LicensingPluginStart['featureUsage']['notifyUsage']);
    notifyUsage(featureName: string): void;
    getLicenseInformation(): Promise<ILicense>;
    isAtLeast(level: LicenseType): Promise<boolean>;
    isAtLeastPlatinum(): Promise<boolean>;
    isAtLeastGold(): Promise<boolean>;
    isAtLeastEnterprise(): Promise<boolean>;
}
