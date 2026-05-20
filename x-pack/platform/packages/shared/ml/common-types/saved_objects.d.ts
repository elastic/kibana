import type { ErrorType } from './errors';
export declare const ANOMALY_DETECTOR_SAVED_OBJECT_TYPE = "anomaly-detector";
export declare const DFA_SAVED_OBJECT_TYPE = "data-frame-analytics";
export declare const TRAINED_MODEL_SAVED_OBJECT_TYPE = "trained-model";
export type JobType = typeof ANOMALY_DETECTOR_SAVED_OBJECT_TYPE | typeof DFA_SAVED_OBJECT_TYPE;
export type TrainedModelType = typeof TRAINED_MODEL_SAVED_OBJECT_TYPE;
export type MlSavedObjectType = JobType | TrainedModelType;
export declare const ML_JOB_SAVED_OBJECT_TYPE = "ml-job";
export declare const ML_TRAINED_MODEL_SAVED_OBJECT_TYPE = "ml-trained-model";
export declare const ML_MODULE_SAVED_OBJECT_TYPE = "ml-module";
export interface SavedObjectResult {
    [id: string]: {
        success: boolean;
        type: MlSavedObjectType;
        error?: ErrorType;
    };
}
export type SyncResult = {
    [jobType in MlSavedObjectType]?: {
        [id: string]: {
            success: boolean;
            error?: ErrorType;
        };
    };
};
export interface SyncSavedObjectResponse {
    savedObjectsCreated: SyncResult;
    savedObjectsDeleted: SyncResult;
    datafeedsAdded: SyncResult;
    datafeedsRemoved: SyncResult;
}
export interface CanDeleteMLSpaceAwareItemsResponse {
    [id: string]: {
        canDelete: boolean;
        canRemoveFromSpace: boolean;
    };
}
export interface CanSyncToAllSpacesResponse {
    canSync: boolean;
}
export type JobsSpacesResponse = {
    [jobType in JobType]: {
        [jobId: string]: string[];
    };
};
export interface TrainedModelsSpacesResponse {
    trainedModels: {
        [id: string]: string[];
    };
}
export interface InitializeSavedObjectResponse {
    jobs: Array<{
        id: string;
        type: JobType;
    }>;
    datafeeds: Array<{
        id: string;
        type: JobType;
    }>;
    trainedModels: Array<{
        id: string;
    }>;
    success: boolean;
    error?: ErrorType;
}
export interface SyncCheckResponse {
    result: boolean;
}
export interface DeleteMLSpaceAwareItemsCheckResponse {
    [jobId: string]: DeleteMLSpaceAwareItemsPermission;
}
export interface DeleteMLSpaceAwareItemsPermission {
    canDelete: boolean;
    canRemoveFromSpace: boolean;
}
