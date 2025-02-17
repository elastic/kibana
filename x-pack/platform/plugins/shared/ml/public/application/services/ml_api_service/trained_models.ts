/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';

import { useMemo } from 'react';
import type { HttpFetchQuery } from '@kbn/core/public';
import type { ErrorType } from '@kbn/ml-error-utils';
import type {
  GetModelDownloadConfigOptions,
  ModelDefinitionResponse,
} from '@kbn/ml-trained-models-utils';
import { ML_INTERNAL_BASE_PATH } from '../../../../common/constants/app';
import type { MlSavedObjectType } from '../../../../common/types/saved_objects';
import type { HttpService } from '../http_service';
import { useMlKibana } from '../../contexts/kibana';
import type {
  ModelPipelines,
  TrainedModelStat,
  NodesOverviewResponse,
  MemoryUsageInfo,
  ModelDownloadState,
  TrainedModelUIItem,
  TrainedModelConfigResponse,
  StartTrainedModelDeploymentResponse,
} from '../../../../common/types/trained_models';

export interface InferenceQueryParams {
  from?: number;
  size?: number;
  tags?: string;
  include?: 'total_feature_importance' | 'feature_importance_baseline' | string;
}

export interface InferenceStatsQueryParams {
  from?: number;
  size?: number;
}

export interface IngestStats {
  count: number;
  time_in_millis: number;
  current: number;
  failed: number;
}

export interface InferenceStatsResponse {
  count: number;
  trained_model_stats: TrainedModelStat[];
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CommonDeploymentParams = {
  deployment_id?: string;
  threads_per_allocation: number;
  priority: 'low' | 'normal';
  number_of_allocations?: number;
};

export interface AdaptiveAllocationsParams {
  adaptive_allocations?: {
    enabled: boolean;
    min_number_of_allocations?: number;
    max_number_of_allocations?: number;
  };
}

export interface StartAllocationParams {
  modelId: string;
  deploymentParams: CommonDeploymentParams;
  adaptiveAllocationsParams?: AdaptiveAllocationsParams;
}

export interface UpdateAllocationParams extends AdaptiveAllocationsParams {
  number_of_allocations?: number;
}

/**
 * Service with APIs calls to perform operations with trained models.
 * @param httpService
 */
export function trainedModelsApiProvider(httpService: HttpService) {
  return {
    /**
     * Fetches the trained models list available for download.
     */
    getTrainedModelDownloads() {
      return httpService.http<ModelDefinitionResponse[]>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/model_downloads`,
        method: 'GET',
        version: '1',
      });
    },

    /**
     * Gets ELSER config for download based on the cluster OS and CPU architecture.
     */
    getElserConfig(options?: GetModelDownloadConfigOptions) {
      return httpService.http<ModelDefinitionResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/elser_config`,
        method: 'GET',
        ...(options ? { query: options as HttpFetchQuery } : {}),
        version: '1',
      });
    },

    /**
     * Fetches configuration information for a trained inference model.
     * @param modelId - Model ID, collection of Model IDs or Model ID pattern.
     *                  Fetches all In case nothing is provided.
     * @param params - Optional query params
     */
    getTrainedModels(modelId?: string | string[], params?: InferenceQueryParams) {
      const model = Array.isArray(modelId) ? modelId.join(',') : modelId;

      return httpService.http<TrainedModelConfigResponse[]>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models${model ? `/${model}` : ''}`,
        method: 'GET',
        ...(params ? { query: params as HttpFetchQuery } : {}),
        version: '1',
      });
    },

    /**
     * Fetches a complete list of trained models required for UI
     * including stats for each model, pipelines definitions, and
     * models available for download.
     */
    getTrainedModelsList() {
      return httpService.http<TrainedModelUIItem[]>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models_list`,
        method: 'GET',
        version: '1',
      });
    },

    /**
     * Fetches usage information for trained inference models.
     * @param modelId - Model ID, collection of Model IDs or Model ID pattern.
     *                  Fetches all In case nothing is provided.
     * @param params - Optional query params
     */
    getTrainedModelStats(modelId?: string | string[], params?: InferenceStatsQueryParams) {
      const model = Array.isArray(modelId) ? modelId.join(',') : modelId;

      return httpService.http<InferenceStatsResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models${model ? `/${model}` : ''}/_stats`,
        method: 'GET',
        version: '1',
      });
    },

    /**
     * Fetches pipelines associated with provided models
     * @param modelId - Model ID, collection of Model IDs.
     */
    getTrainedModelPipelines(modelId: string | string[]) {
      let model = modelId;
      if (Array.isArray(modelId)) {
        model = modelId.join(',');
      }

      return httpService.http<ModelPipelines[]>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/${model}/pipelines`,
        method: 'GET',
        version: '1',
      });
    },

    /**
     * Fetches all ingest pipelines
     */
    getAllIngestPipelines() {
      return httpService.http<NodesOverviewResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/ingest_pipelines`,
        method: 'GET',
        version: '1',
      });
    },

    /**
     * Creates inference pipeline
     */
    createInferencePipeline(pipelineName: string, pipeline: IngestPipeline) {
      return httpService.http<estypes.IngestSimulateResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/create_inference_pipeline`,
        method: 'POST',
        body: JSON.stringify({ pipeline, pipelineName }),
        version: '1',
      });
    },

    /**
     * Deletes an existing trained inference model.
     * @param modelId - Model ID
     */
    deleteTrainedModel(
      modelId: string,
      options: { with_pipelines?: boolean; force?: boolean } = {
        with_pipelines: false,
        force: false,
      }
    ) {
      return httpService.http<{ acknowledge: boolean }>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/${modelId}`,
        method: 'DELETE',
        version: '1',
        query: options,
      });
    },

    /**
     * Gets model config based on the cluster OS and CPU architecture.
     */
    getCuratedModelConfig(modelName: string, options?: GetModelDownloadConfigOptions) {
      return httpService.http<ModelDefinitionResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/curated_model_config/${modelName}`,
        method: 'GET',
        ...(options ? { query: options as HttpFetchQuery } : {}),
        version: '1',
      });
    },

    getTrainedModelsNodesOverview() {
      return httpService.http<NodesOverviewResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/model_management/nodes_overview`,
        method: 'GET',
        version: '1',
      });
    },

    startModelAllocation({
      modelId,
      deploymentParams,
      adaptiveAllocationsParams,
    }: StartAllocationParams) {
      return httpService.http$<StartTrainedModelDeploymentResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/${modelId}/deployment/_start`,
        method: 'POST',
        query: deploymentParams,
        ...(adaptiveAllocationsParams ? { body: JSON.stringify(adaptiveAllocationsParams) } : {}),
        version: '1',
      });
    },

    stopModelAllocation(
      modelId: string,
      deploymentsIds: string[],
      options: { force: boolean } = { force: false }
    ) {
      const force = options?.force;

      return httpService.http<Record<string, { acknowledge: boolean; error?: ErrorType }>>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/${modelId}/${deploymentsIds.join(
          ','
        )}/deployment/_stop`,
        method: 'POST',
        query: { force },
        version: '1',
      });
    },

    updateModelDeployment(modelId: string, deploymentId: string, params: UpdateAllocationParams) {
      return httpService.http<{ acknowledge: boolean }>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/${modelId}/${deploymentId}/deployment/_update`,
        method: 'POST',
        body: JSON.stringify(params),
        version: '1',
      });
    },

    inferTrainedModel(
      modelId: string,
      deploymentsId: string,
      payload: estypes.MlInferTrainedModelRequest['body'],
      timeout?: string
    ) {
      const body = JSON.stringify(payload);
      return httpService.http<estypes.MlInferTrainedModelResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/infer/${modelId}/${deploymentsId}`,
        method: 'POST',
        body,
        ...(timeout ? { query: { timeout } as HttpFetchQuery } : {}),
        version: '1',
      });
    },

    trainedModelPipelineSimulate(
      pipeline: estypes.IngestPipeline,
      docs: estypes.IngestSimulateDocument[]
    ) {
      const body = JSON.stringify({
        pipeline,
        docs,
      });
      return httpService.http<estypes.IngestSimulateResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/pipeline_simulate`,
        method: 'POST',
        body,
        version: '1',
      });
    },

    memoryUsage(type?: MlSavedObjectType, node?: string, showClosedJobs = false) {
      return httpService.http<MemoryUsageInfo[]>({
        path: `${ML_INTERNAL_BASE_PATH}/model_management/memory_usage`,
        method: 'GET',
        query: { type, node, showClosedJobs },
        version: '1',
      });
    },

    putTrainedModelConfig(modelId: string, config: object) {
      return httpService.http<estypes.MlPutTrainedModelResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/${modelId}`,
        method: 'PUT',
        body: JSON.stringify(config),
        version: '1',
      });
    },

    installElasticTrainedModelConfig(modelId: string) {
      return httpService.http<estypes.MlPutTrainedModelResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/install_elastic_trained_model/${modelId}`,
        method: 'POST',
        version: '1',
      });
    },

    getModelsDownloadStatus() {
      return httpService.http<Record<string, ModelDownloadState>>({
        path: `${ML_INTERNAL_BASE_PATH}/trained_models/download_status`,
        method: 'GET',
        version: '1',
      });
    },
  };
}

export type TrainedModelsApiService = ReturnType<typeof trainedModelsApiProvider>;

/**
 * Hooks for accessing {@link TrainedModelsApiService} in React components.
 */
export function useTrainedModelsApiService(): TrainedModelsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => trainedModelsApiProvider(httpService), [httpService]);
}
