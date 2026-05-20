import type { JobType, MlSavedObjectType, CanDeleteMLSpaceAwareItemsResponse, SyncSavedObjectResponse, InitializeSavedObjectResponse, SavedObjectResult, JobsSpacesResponse, TrainedModelsSpacesResponse, SyncCheckResponse, CanSyncToAllSpacesResponse } from '@kbn/ml-common-types/saved_objects';
import type { HttpService } from '../http_service';
export declare const savedObjectsApiProvider: (httpService: HttpService) => {
    jobsSpaces(): Promise<JobsSpacesResponse>;
    updateJobsSpaces(jobType: JobType, jobIds: string[], spacesToAdd: string[], spacesToRemove: string[]): Promise<SavedObjectResult>;
    removeItemFromCurrentSpace(mlSavedObjectType: MlSavedObjectType, ids: string[]): Promise<SavedObjectResult>;
    syncSavedObjects(simulate?: boolean, addToAllSpaces?: boolean): Promise<SyncSavedObjectResponse>;
    initSavedObjects(simulate?: boolean): Promise<InitializeSavedObjectResponse>;
    syncCheck(mlSavedObjectType?: MlSavedObjectType): Promise<SyncCheckResponse>;
    canDeleteMLSpaceAwareItems(mlSavedObjectType: MlSavedObjectType, ids: string[]): Promise<CanDeleteMLSpaceAwareItemsResponse>;
    canSyncToAllSpaces(mlSavedObjectType?: MlSavedObjectType): Promise<CanSyncToAllSpacesResponse>;
    trainedModelsSpaces(): Promise<TrainedModelsSpacesResponse>;
    updateModelsSpaces(modelIds: string[], spacesToAdd: string[], spacesToRemove: string[]): Promise<SavedObjectResult>;
};
export type SavedObjectsApiService = ReturnType<typeof savedObjectsApiProvider>;
/**
 * Hooks for accessing {@link SavedObjectsApiService} in React components.
 */
export declare function useSavedObjectsApiService(): SavedObjectsApiService;
