import type { Observable } from 'rxjs';
import type { CoreSetup, Logger, SavedObjectsServiceStart, ServiceStatus } from '@kbn/core/server';
import type { SolutionId } from '@kbn/core-chrome-browser';
import type { ILicense } from '@kbn/licensing-types';
import type { SpacesLicense } from '../../common/licensing';
interface Deps {
    coreStatus: CoreSetup['status'];
    getSavedObjects: () => Promise<Pick<SavedObjectsServiceStart, 'createInternalRepository'>>;
    license$: Observable<ILicense>;
    spacesLicense: SpacesLicense;
    logger: Logger;
    solution?: SolutionId;
}
export declare const RETRY_SCALE_DURATION = 100;
export declare const RETRY_DURATION_MAX = 10000;
export declare class DefaultSpaceService {
    private initializeSubscription?;
    private serviceStatus$?;
    setup({ coreStatus, getSavedObjects, license$, spacesLicense, logger, solution }: Deps): {
        serviceStatus$: Observable<ServiceStatus<unknown>>;
    };
    stop(): void;
}
export {};
