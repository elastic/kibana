import type { estypes } from '@elastic/elasticsearch';
import { type SavedObjectsServiceStart, type KibanaRequest, type IScopedClusterClient, SavedObjectsClient } from '@kbn/core/server';
import type { TrainedModelJob, MLSavedObjectService } from './service';
export declare function savedObjectClientsFactory(getSavedObjectsStart: () => SavedObjectsServiceStart | null): {
    getMlSavedObjectsClient: (request: KibanaRequest) => import("@kbn/core/server").SavedObjectsClientContract | null;
    getInternalSavedObjectsClient: () => SavedObjectsClient | null;
};
export declare function getSavedObjectClientError(error: any): any;
export declare function getJobDetailsFromTrainedModel(model: estypes.MlTrainedModelConfig | estypes.MlPutTrainedModelRequest['body']): TrainedModelJob | null;
export declare function mlFunctionsFactory(client: IScopedClusterClient): {
    getJobs(): Promise<estypes.MlGetJobsResponse | null>;
    getDatafeeds(): Promise<estypes.MlGetDatafeedsResponse | null>;
    getTrainedModels(): Promise<estypes.MlGetTrainedModelsResponse | null>;
    getDataFrameAnalytics(): Promise<estypes.MlGetDataFrameAnalyticsResponse | null>;
};
export declare function getJobsAndModels(client: IScopedClusterClient, mlSavedObjectService: MLSavedObjectService): Promise<{
    jobObjects: import("@kbn/core/server").SavedObjectsFindResult<import("./service").JobObject>[];
    allJobObjects: import("@kbn/core/server").SavedObjectsFindResult<import("./service").JobObject>[];
    modelObjects: import("@kbn/core/server").SavedObjectsFindResult<import("./service").TrainedModelObject>[];
    allModelObjects: import("@kbn/core/server").SavedObjectsFindResult<import("./service").TrainedModelObject>[];
    adJobs: estypes.MlJob[];
    datafeeds: estypes.MlDatafeed[];
    dfaJobs: estypes.MlDataframeAnalyticsSummary[];
    models: estypes.MlTrainedModelConfig[];
}>;
