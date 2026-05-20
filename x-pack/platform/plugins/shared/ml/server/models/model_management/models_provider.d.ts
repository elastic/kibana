import type { IScopedClusterClient } from '@kbn/core/server';
import { type MapElements } from '@kbn/ml-data-frame-analytics-utils';
import type { InferenceInferenceEndpoint, InferenceTaskType, IngestDocument } from '@elastic/elasticsearch/lib/api/types';
import type { IndexName, IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { type GetModelDownloadConfigOptions, type ModelDefinitionResponse } from '@kbn/ml-trained-models-utils';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { ElasticCuratedModelName } from '@kbn/ml-trained-models-utils';
import type { DFAModelItem, ExistingModelBase, TrainedModelItem, TrainedModelUIItem } from '@kbn/ml-common-types/trained_models';
import { type ModelDownloadState, type PipelineDefinition } from '@kbn/ml-common-types/trained_models';
import type { MlFeatures } from '../../../common/constants/app';
import type { MlClient } from '../../lib/ml_client';
import type { MLSavedObjectService } from '../../saved_objects';
export type ModelService = ReturnType<typeof modelsProvider>;
export declare const modelsProvider: (client: IScopedClusterClient, mlClient: MlClient, cloud: CloudSetup, enabledFeatures: MlFeatures) => ModelsProvider;
interface ModelMapResult {
    ingestPipelines: Map<string, Record<string, PipelineDefinition> | null>;
    indices: Array<Record<IndexName, IndicesIndexState | null>>;
    /**
     * Map elements
     */
    elements: MapElements[];
    /**
     * Transform, job or index details
     */
    details: Record<string, any>;
    /**
     * Error
     */
    error: null | any;
}
export type GetCuratedModelConfigParams = Parameters<ModelsProvider['getCuratedModelConfig']>;
export declare class ModelsProvider {
    private _client;
    private _mlClient;
    private _cloud;
    private _enabledFeatures;
    private _transforms?;
    constructor(_client: IScopedClusterClient, _mlClient: MlClient, _cloud: CloudSetup, _enabledFeatures: MlFeatures);
    private initTransformData;
    private getIndexData;
    private getNodeId;
    /**
     * Assigns inference endpoints to trained models
     * @param trainedModels
     * @param asInternal
     */
    assignInferenceEndpoints(trainedModels: ExistingModelBase[], asInternal?: boolean): Promise<void>;
    /**
     * Assigns trained model stats to trained models
     * @param trainedModels
     */
    assignModelStats(trainedModels: ExistingModelBase[]): Promise<TrainedModelItem[]>;
    /**
     * Merges the list of models with the list of models available for download.
     */
    includeModelDownloads(resultItems: TrainedModelUIItem[]): Promise<TrainedModelUIItem[]>;
    /**
     * Assigns pipelines to trained models
     */
    assignPipelines(trainedModels: TrainedModelItem[]): Promise<void>;
    /**
     * Assigns indices to trained models
     */
    assignModelIndices(trainedModels: TrainedModelItem[]): Promise<void>;
    /**
     * Assign a check for each DFA model if origin job exists
     */
    assignDFAJobCheck(trainedModels: DFAModelItem[]): Promise<void>;
    /**
     * Returns a complete list of entities for the Trained Models UI
     */
    getTrainedModelList(mlSavedObjectService: MLSavedObjectService): Promise<TrainedModelUIItem[]>;
    /**
     * Simulates the effect of the pipeline on given document.
     *
     */
    simulatePipeline(docs: IngestDocument[], pipelineConfig: IngestPipeline): Promise<{}>;
    /**
     * Creates the pipeline
     *
     */
    createInferencePipeline(pipelineConfig: IngestPipeline, pipelineName: string): Promise<import("@elastic/elasticsearch/lib/api/types").AcknowledgedResponseBase>;
    /**
     * Retrieves existing pipelines.
     *
     */
    getPipelines(): Promise<string[]>;
    /**
     * Retrieves the map of model ids and aliases with associated pipelines,
     * where key is a model, alias or deployment id, and value is a map of pipeline ids and pipeline definitions.
     * @param modelIds - Array of models ids and model aliases.
     */
    getModelsPipelines(modelIds: string[]): Promise<Map<string, Record<string, PipelineDefinition>>>;
    /**
     * Match pipelines to indices based on the default_pipeline setting in the index settings.
     */
    getPipelineToIndicesMap(pipelineIds: Set<string>): Promise<Record<string, string[]>>;
    /**
     * Retrieves the network map and metadata of model ids, pipelines, and indices that are tied to the model ids.
     * @param modelIds - Array of models ids and model aliases.
     */
    getModelsPipelinesAndIndicesMap(modelId: string, { withIndices, }: {
        withIndices: boolean;
    }): Promise<ModelMapResult>;
    /**
     * Deletes associated pipelines of the requested model
     * @param modelIds
     */
    deleteModelPipelines(modelIds: string[]): Promise<void>;
    /**
     * Returns a list of elastic curated models available for download.
     */
    getModelDownloads(): Promise<ModelDefinitionResponse[]>;
    /**
     * Provides an appropriate model ID and configuration for download based on the current cluster architecture.
     *
     * @param modelName
     * @param options
     * @returns
     */
    getCuratedModelConfig(modelName: ElasticCuratedModelName, options?: GetModelDownloadConfigOptions): Promise<ModelDefinitionResponse> | never;
    /**
     * Provides an ELSER model name and configuration for download based on the current cluster architecture.
     * The current default version is 2. If running on Cloud it returns the Linux x86_64 optimized version.
     * If any of the ML nodes run a different OS rather than Linux, or the CPU architecture isn't x86_64,
     * a portable version of the model is returned.
     */
    getELSER(options?: GetModelDownloadConfigOptions): Promise<ModelDefinitionResponse> | never;
    /**
     * Puts the requested ELSER model into elasticsearch, triggering elasticsearch to download the model.
     * Assigns the model to the * space.
     * @param modelId
     * @param mlSavedObjectService
     */
    installElasticModel(modelId: string, mlSavedObjectService: MLSavedObjectService): Promise<import("@elastic/elasticsearch/lib/api/types").MlTrainedModelConfig>;
    /**
     * Puts the requested Inference endpoint id into elasticsearch, triggering elasticsearch to create the inference endpoint id
     * @param inferenceId - Inference Endpoint Id
     * @param taskType - Inference Task type. Either sparse_embedding or text_embedding
     * @param inferenceConfig - Model configuration based on service type
     */
    createInferenceEndpoint(inferenceId: string, taskType: InferenceTaskType, inferenceConfig: InferenceInferenceEndpoint): Promise<import("@elastic/elasticsearch/lib/api/types").InferenceInferenceEndpointInfo | {
        model_id: string;
        task_type: InferenceTaskType;
    }>;
    getModelsDownloadStatus(): Promise<Record<string, ModelDownloadState>>;
}
export {};
