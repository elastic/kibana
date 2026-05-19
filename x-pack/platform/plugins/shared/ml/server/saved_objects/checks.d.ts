import type { IScopedClusterClient, KibanaRequest } from '@kbn/core/server';
import type { JobType, DeleteMLSpaceAwareItemsCheckResponse, MlSavedObjectType } from '@kbn/ml-common-types/saved_objects';
import type { ResolveMlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { MLSavedObjectService, TrainedModelJob } from './service';
export interface JobSavedObjectStatus {
    jobId: string;
    type: JobType;
    datafeedId?: string | null;
    namespaces: string[] | undefined;
    checks: {
        jobExists: boolean;
        datafeedExists?: boolean;
    };
}
export interface TrainedModelSavedObjectStatus {
    modelId: string;
    namespaces: string[] | undefined;
    job: null | TrainedModelJob;
    checks: {
        trainedModelExists: boolean;
        dfaJobExists: boolean | null;
    };
}
export interface JobStatus {
    jobId: string;
    datafeedId?: string | null;
    checks: {
        savedObjectExits: boolean;
    };
}
export interface TrainedModelStatus {
    modelId: string;
    checks: {
        savedObjectExits: boolean;
        dfaJobReferenced: boolean | null;
    };
}
export interface StatusResponse {
    savedObjects: {
        'anomaly-detector': JobSavedObjectStatus[];
        'data-frame-analytics': JobSavedObjectStatus[];
        'trained-model': TrainedModelSavedObjectStatus[];
    };
    jobs: {
        'anomaly-detector': JobStatus[];
        'data-frame-analytics': JobStatus[];
        'trained-model': TrainedModelStatus[];
    };
}
export declare function checksFactory(client: IScopedClusterClient, mlSavedObjectService: MLSavedObjectService): {
    checkStatus: () => Promise<StatusResponse>;
    canDeleteMLSpaceAwareItems: (request: KibanaRequest, mlSavedObjectType: MlSavedObjectType, ids: string[], spacesEnabled: boolean, resolveMlCapabilities: ResolveMlCapabilities) => Promise<DeleteMLSpaceAwareItemsCheckResponse>;
    jobsSpaces: () => Promise<{
        [id: string]: {
            [id: string]: string[] | undefined;
        };
    }>;
    trainedModelsSpaces: () => Promise<{
        trainedModels: {
            [id: string]: string[] | undefined;
        };
    }>;
};
