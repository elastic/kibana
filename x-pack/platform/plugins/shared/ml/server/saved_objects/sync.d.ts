import type { IScopedClusterClient } from '@kbn/core/server';
import type { JobType, SyncSavedObjectResponse, InitializeSavedObjectResponse, MlSavedObjectType } from '@kbn/ml-common-types/saved_objects';
import type { MLSavedObjectService } from './service';
export interface JobSpaceOverrides {
    overrides: {
        [type in JobType]: {
            [jobId: string]: string[];
        };
    };
}
export declare function syncSavedObjectsFactory(client: IScopedClusterClient, mlSavedObjectService: MLSavedObjectService): {
    checkStatus: () => Promise<import("./checks").StatusResponse>;
    syncSavedObjects: (simulate?: boolean, addToAllSpaces?: boolean) => Promise<SyncSavedObjectResponse>;
    initSavedObjects: (simulate?: boolean, spaceOverrides?: JobSpaceOverrides) => Promise<InitializeSavedObjectResponse>;
    isSyncNeeded: (mlSavedObjectType?: MlSavedObjectType) => Promise<boolean>;
};
