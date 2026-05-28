import { type Observable } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
export declare function createLicenseUpdate(triggerRefresh$: Observable<unknown>, stop$: Observable<unknown>, fetcher: () => Promise<ILicense>, initialValues?: ILicense): {
    license$: Observable<ILicense>;
    refreshManually(): Promise<ILicense>;
};
