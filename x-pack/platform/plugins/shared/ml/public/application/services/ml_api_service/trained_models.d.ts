import type { estypes } from '@elastic/elasticsearch';
import type { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import type { ErrorType } from '@kbn/ml-error-utils';
import type { GetModelDownloadConfigOptions, ModelDefinitionResponse } from '@kbn/ml-trained-models-utils';
import type { MlSavedObjectType } from '@kbn/ml-common-types/saved_objects';
import type { ModelPipelines, NodesOverviewResponse, MemoryUsageInfo, ModelDownloadState, TrainedModelUIItem, TrainedModelConfigResponse, StartTrainedModelDeploymentResponse, InferenceQueryParams, InferenceStatsQueryParams, InferenceStatsResponse, StartAllocationParams, DeleteModelParams, UpdateAllocationParams } from '@kbn/ml-common-types/trained_models';
import type { HttpService } from '../http_service';
/**
 * Service with APIs calls to perform operations with trained models.
 * @param httpService
 */
export declare function trainedModelsApiProvider(httpService: HttpService): {
    /**
     * Fetches the trained models list available for download.
     */
    getTrainedModelDownloads(): Promise<ModelDefinitionResponse[]>;
    /**
     * Gets ELSER config for download based on the cluster OS and CPU architecture.
     */
    getElserConfig(options?: GetModelDownloadConfigOptions): Promise<ModelDefinitionResponse>;
    /**
     * Fetches configuration information for a trained inference model.
     * @param modelId - Model ID, collection of Model IDs or Model ID pattern.
     *                  Fetches all In case nothing is provided.
     * @param params - Optional query params
     */
    getTrainedModels(modelId?: string | string[], params?: InferenceQueryParams): Promise<TrainedModelConfigResponse[]>;
    /**
     * Fetches a complete list of trained models required for UI
     * including stats for each model, pipelines definitions, and
     * models available for download.
     */
    getTrainedModelsList(): Promise<TrainedModelUIItem[]>;
    /**
     * Fetches usage information for trained inference models.
     * @param modelId - Model ID, collection of Model IDs or Model ID pattern.
     *                  Fetches all In case nothing is provided.
     * @param params - Optional query params
     */
    getTrainedModelStats(modelId?: string | string[], params?: InferenceStatsQueryParams): Promise<InferenceStatsResponse>;
    /**
     * Fetches pipelines associated with provided models
     * @param modelId - Model ID, collection of Model IDs.
     */
    getTrainedModelPipelines(modelId: string | string[]): Promise<ModelPipelines[]>;
    /**
     * Fetches all ingest pipelines
     */
    getAllIngestPipelines(): Promise<string[]>;
    /**
     * Creates inference pipeline
     */
    createInferencePipeline(pipelineName: string, pipeline: IngestPipeline): Promise<estypes.IngestSimulateResponse>;
    /**
     * Deletes an existing trained inference model.
     * @param modelId - Model ID
     */
    deleteTrainedModel({ modelId, options, }: DeleteModelParams): Promise<{
        acknowledge: boolean;
    }>;
    /**
     * Gets model config based on the cluster OS and CPU architecture.
     */
    getCuratedModelConfig(modelName: string, options?: GetModelDownloadConfigOptions): Promise<ModelDefinitionResponse>;
    getTrainedModelsNodesOverview(): Promise<NodesOverviewResponse>;
    startModelAllocation({ modelId, deploymentParams, adaptiveAllocationsParams, }: StartAllocationParams): import("rxjs").Observable<StartTrainedModelDeploymentResponse>;
    stopModelAllocation(modelId: string, deploymentsIds: string[], options?: {
        force: boolean;
    }): Promise<Record<string, {
        acknowledge: boolean;
        error?: ErrorType;
    }>>;
    updateModelDeployment(modelId: string, deploymentId: string, params: UpdateAllocationParams): Promise<estypes.MlUpdateTrainedModelDeploymentResponse>;
    inferTrainedModel(modelId: string, deploymentsId: string, payload: Omit<estypes.MlInferTrainedModelRequest, "model_id">, timeout?: string): Promise<estypes.MlInferTrainedModelResponse>;
    trainedModelPipelineSimulate(pipeline: estypes.IngestPipeline, docs: estypes.IngestDocument[]): Promise<estypes.IngestSimulateResponse>;
    memoryUsage(type?: MlSavedObjectType, node?: string, showClosedJobs?: boolean): Promise<MemoryUsageInfo[]>;
    putTrainedModelConfig(modelId: string, config: object): Promise<estypes.MlTrainedModelConfig>;
    installElasticTrainedModelConfig(modelId: string): Promise<estypes.MlTrainedModelConfig>;
    getModelsDownloadStatus(): Promise<Record<string, ModelDownloadState>>;
};
export type TrainedModelsApiService = ReturnType<typeof trainedModelsApiProvider>;
/**
 * Hooks for accessing {@link TrainedModelsApiService} in React components.
 */
export declare function useTrainedModelsApiService(): TrainedModelsApiService;
