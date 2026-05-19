import type { KibanaRequest, SavedObjectsClientContract, SavedObjectsFindResult, IScopedClusterClient } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { JobType, SavedObjectResult, MlSavedObjectType } from '@kbn/ml-common-types/saved_objects';
export interface JobObject {
    job_id: string;
    datafeed_id: string | null;
    type: JobType;
}
export interface TrainedModelObject {
    model_id: string;
    job: null | TrainedModelJob;
}
export interface TrainedModelJob {
    job_id: string;
    create_time: number;
}
export type MLSavedObjectService = ReturnType<typeof mlSavedObjectServiceFactory>;
export declare function mlSavedObjectServiceFactory(savedObjectsClient: SavedObjectsClientContract, internalSavedObjectsClient: SavedObjectsClientContract, spacesEnabled: boolean, authorization: SecurityPluginSetup['authz'] | undefined, client: IScopedClusterClient, isMlReady: () => Promise<void>): {
    getAnomalyDetectionJobIds: () => Promise<(string | null)[]>;
    getDataFrameAnalyticsJobIds: () => Promise<(string | null)[]>;
    getTrainedModelsIds: () => Promise<(string | TrainedModelJob | null)[]>;
    getAllJobObjects: (jobType?: JobType, currentSpaceOnly?: boolean) => Promise<SavedObjectsFindResult<JobObject>[]>;
    getJobObject: (jobType: JobType, jobId: string, currentSpaceOnly?: boolean) => Promise<SavedObjectsFindResult<JobObject> | undefined>;
    createAnomalyDetectionJob: (jobId: string, datafeedId?: string, addToAllSpaces?: boolean) => Promise<void>;
    createDataFrameAnalyticsJob: (jobId: string, addToAllSpaces?: boolean) => Promise<void>;
    deleteAnomalyDetectionJob: (jobId: string) => Promise<void>;
    forceDeleteAnomalyDetectionJob: (jobId: string, namespace: string) => Promise<void>;
    deleteDataFrameAnalyticsJob: (jobId: string) => Promise<void>;
    forceDeleteDataFrameAnalyticsJob: (jobId: string, namespace: string) => Promise<void>;
    addDatafeed: (datafeedId: string, jobId: string) => Promise<void>;
    deleteDatafeed: (datafeedId: string) => Promise<void>;
    filterJobsForSpace: <T>(jobType: JobType, list: T[], field: keyof T) => Promise<T[]>;
    filterJobIdsForSpace: (jobType: JobType, ids: string[], allowWildcards?: boolean) => Promise<string[]>;
    filterDatafeedsForSpace: <T>(jobType: JobType, list: T[], field: keyof T) => Promise<T[]>;
    filterDatafeedIdsForSpace: (ids: string[], allowWildcards?: boolean) => Promise<string[]>;
    updateJobsSpaces: (jobType: JobType, jobIds: string[], spacesToAdd: string[], spacesToRemove: string[]) => Promise<SavedObjectResult>;
    bulkCreateJobs: (jobs: Array<{
        job: JobObject;
        namespaces: string[];
    }>) => Promise<import("@kbn/core/server").SavedObjectsBulkResponse<JobObject>>;
    getAllJobObjectsForAllSpaces: (jobType?: JobType, jobId?: string) => Promise<SavedObjectsFindResult<JobObject>[]>;
    canCreateGlobalMlSavedObjects: (request: KibanaRequest, mlSavedObjectType?: MlSavedObjectType) => Promise<boolean>;
    getTrainedModelObject: (modelId: string, currentSpaceOnly?: boolean) => Promise<SavedObjectsFindResult<TrainedModelObject> | undefined>;
    createTrainedModel: (modelId: string, job: TrainedModelJob | null, addToAllSpaces?: boolean) => Promise<void>;
    bulkCreateTrainedModel: (models: TrainedModelObject[], namespaceFallback?: string) => Promise<import("@kbn/core/server").SavedObjectsBulkResponse<TrainedModelObject>>;
    deleteTrainedModel: (modelId: string) => Promise<void>;
    forceDeleteTrainedModel: (modelId: string, namespace: string) => Promise<void>;
    updateTrainedModelsSpaces: (modelIds: string[], spacesToAdd: string[], spacesToRemove: string[]) => Promise<SavedObjectResult>;
    getAllTrainedModelObjects: (currentSpaceOnly?: boolean) => Promise<SavedObjectsFindResult<TrainedModelObject>[]>;
    getAllTrainedModelObjectsForAllSpaces: (modelIds?: string[]) => Promise<SavedObjectsFindResult<TrainedModelObject>[]>;
    filterTrainedModelsForSpace: <T>(list: T[], field: keyof T) => Promise<T[]>;
    filterTrainedModelIdsForSpace: (ids: string[], allowWildcards?: boolean) => Promise<string[]>;
    findTrainedModelsObjectForJobs: (jobIds: string[], currentSpaceOnly?: boolean) => Promise<Record<string, SavedObjectsFindResult<TrainedModelObject>>>;
};
export declare function createJobError(id: string, key: keyof JobObject): string;
export declare function createTrainedModelError(id: string): string;
