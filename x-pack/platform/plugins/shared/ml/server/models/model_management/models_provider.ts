/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IScopedClusterClient } from '@kbn/core/server';
import { JOB_MAP_NODE_TYPES, type MapElements } from '@kbn/ml-data-frame-analytics-utils';
import { flatten, groupBy, isEmpty } from 'lodash';
import type {
  InferenceInferenceEndpoint,
  InferenceTaskType,
  MlGetTrainedModelsRequest,
  TasksTaskInfo,
  TransformGetTransformTransformSummary,
} from '@elastic/elasticsearch/lib/api/types';
import type { IndexName, IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import type {
  IngestPipeline,
  IngestSimulateDocument,
  IngestSimulateRequest,
  NodesInfoResponseBase,
} from '@elastic/elasticsearch/lib/api/types';
import {
  ELASTIC_MODEL_DEFINITIONS,
  ELASTIC_MODEL_TAG,
  MODEL_STATE,
  type GetModelDownloadConfigOptions,
  type ModelDefinitionResponse,
  ELASTIC_MODEL_TYPE,
  BUILT_IN_MODEL_TYPE,
} from '@kbn/ml-trained-models-utils';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { ElasticCuratedModelName } from '@kbn/ml-trained-models-utils';
import { isDefined } from '@kbn/ml-is-defined';
import { DEFAULT_TRAINED_MODELS_PAGE_SIZE } from '../../../common/constants/trained_models';
import type { MlFeatures } from '../../../common/constants/app';
import type {
  DFAModelItem,
  ExistingModelBase,
  ModelDownloadItem,
  NLPModelItem,
  TrainedModelItem,
  TrainedModelUIItem,
  TrainedModelWithPipelines,
} from '../../../common/types/trained_models';
import { isBuiltInModel, isExistingModel } from '../../../common/types/trained_models';
import {
  isDFAModelItem,
  isElasticModel,
  isNLPModelItem,
  type ModelDownloadState,
  type PipelineDefinition,
  type TrainedModelConfigResponse,
} from '../../../common/types/trained_models';
import type { MlClient } from '../../lib/ml_client';
import type { MLSavedObjectService } from '../../saved_objects';
import { filterForEnabledFeatureModels } from '../../routes/trained_models';
import { mlLog } from '../../lib/log';
import { getModelDeploymentState } from './get_model_state';

export type ModelService = ReturnType<typeof modelsProvider>;

export const modelsProvider = (
  client: IScopedClusterClient,
  mlClient: MlClient,
  cloud: CloudSetup,
  enabledFeatures: MlFeatures
) => new ModelsProvider(client, mlClient, cloud, enabledFeatures);

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

export class ModelsProvider {
  private _transforms?: TransformGetTransformTransformSummary[];

  constructor(
    private _client: IScopedClusterClient,
    private _mlClient: MlClient,
    private _cloud: CloudSetup,
    private _enabledFeatures: MlFeatures
  ) {}

  private async initTransformData() {
    if (!this._transforms) {
      try {
        const body = await this._client.asCurrentUser.transform.getTransform({
          size: 1000,
        });
        this._transforms = body.transforms;
        return body.transforms;
      } catch (e) {
        if (e.meta?.statusCode !== 403) {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      }
    }
  }

  private async getIndexData(index: string): Promise<Record<IndexName, IndicesIndexState | null>> {
    try {
      const indexData = await this._client.asInternalUser.indices.get({
        index,
      });
      return indexData;
    } catch (e) {
      // Possible that the user doesn't have permissions to view
      // If so, gracefully exit
      if (e.meta?.statusCode !== 403) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
      return { [index]: null };
    }
  }

  private getNodeId(
    elementOriginalId: string,
    nodeType: (typeof JOB_MAP_NODE_TYPES)[keyof typeof JOB_MAP_NODE_TYPES]
  ): string {
    return `${elementOriginalId}-${nodeType}`;
  }

  /**
   * Assigns inference endpoints to trained models
   * @param trainedModels
   * @param asInternal
   */
  async assignInferenceEndpoints(trainedModels: ExistingModelBase[], asInternal: boolean = false) {
    const esClient = asInternal ? this._client.asInternalUser : this._client.asCurrentUser;

    try {
      // Check if model is used by an inference service
      const { endpoints } = await esClient.inference.get({
        inference_id: '_all',
      });

      const inferenceAPIMap = groupBy(
        endpoints,
        (endpoint) => endpoint.service === 'elser' && endpoint.service_settings.model_id
      );

      for (const model of trainedModels) {
        const inferenceApis = inferenceAPIMap[model.model_id];
        model.hasInferenceServices = !!inferenceApis;
        if (model.hasInferenceServices && !asInternal) {
          model.inference_apis = inferenceApis;
        }
      }
    } catch (e) {
      if (!asInternal && e.statusCode === 403) {
        // retry with internal user to get an indicator if models has associated inference services, without mentioning the names
        await this.assignInferenceEndpoints(trainedModels, true);
      } else {
        mlLog.error(e);
      }
    }
  }

  /**
   * Assigns trained model stats to trained models
   * @param trainedModels
   */
  async assignModelStats(trainedModels: ExistingModelBase[]): Promise<TrainedModelItem[]> {
    const { trained_model_stats: modelsStatsResponse } = await this._mlClient.getTrainedModelsStats(
      {
        size: DEFAULT_TRAINED_MODELS_PAGE_SIZE,
      }
    );

    const groupByModelId = groupBy(modelsStatsResponse, 'model_id');

    return trainedModels.map<TrainedModelItem>((model) => {
      const modelStats = groupByModelId[model.model_id];

      const completeModelItem: TrainedModelItem = {
        ...model,
        // @ts-ignore FIXME: fix modelStats type
        stats: {
          ...modelStats[0],
          ...(isNLPModelItem(model)
            ? { deployment_stats: modelStats.map((d) => d.deployment_stats).filter(isDefined) }
            : {}),
        },
      };

      if (isNLPModelItem(completeModelItem)) {
        // Extract deployment ids from deployment stats
        completeModelItem.deployment_ids = modelStats
          .map((v) => v.deployment_stats?.deployment_id)
          .filter(isDefined);

        completeModelItem.state = getModelDeploymentState(completeModelItem);

        completeModelItem.stateDescription = completeModelItem.stats.deployment_stats.reduce(
          (acc, c) => {
            if (acc) return acc;
            return c.reason ?? '';
          },
          ''
        );
      }

      return completeModelItem;
    });
  }

  /**
   * Merges the list of models with the list of models available for download.
   */
  async includeModelDownloads(resultItems: TrainedModelUIItem[]): Promise<TrainedModelUIItem[]> {
    const idMap = new Map<string, TrainedModelUIItem>(
      resultItems.map((model) => [model.model_id, model])
    );
    /**
     * Fetches model definitions available for download
     */
    const forDownload = await this.getModelDownloads();

    const notDownloaded: TrainedModelUIItem[] = forDownload
      .filter(({ model_id: modelId, hidden, recommended, supported, disclaimer }) => {
        if (idMap.has(modelId)) {
          const model = idMap.get(modelId)! as NLPModelItem;
          if (recommended) {
            model.recommended = true;
          }
          model.supported = supported;
          model.disclaimer = disclaimer;
        }
        return !idMap.has(modelId) && !hidden;
      })
      .map<ModelDownloadItem>((modelDefinition) => {
        return {
          model_id: modelDefinition.model_id,
          type: modelDefinition.type,
          tags: modelDefinition.type?.includes(ELASTIC_MODEL_TAG) ? [ELASTIC_MODEL_TAG] : [],
          putModelConfig: modelDefinition.config,
          description: modelDefinition.description,
          state: MODEL_STATE.NOT_DOWNLOADED,
          recommended: !!modelDefinition.recommended,
          modelName: modelDefinition.modelName,
          os: modelDefinition.os,
          arch: modelDefinition.arch,
          softwareLicense: modelDefinition.license,
          licenseUrl: modelDefinition.licenseUrl,
          supported: modelDefinition.supported,
          disclaimer: modelDefinition.disclaimer,
        } as ModelDownloadItem;
      });

    // show model downloads first
    return [...notDownloaded, ...resultItems];
  }

  /**
   * Assigns pipelines to trained models
   */
  async assignPipelines(trainedModels: TrainedModelItem[]): Promise<void> {
    // For each model create a dict with model aliases and deployment ids for faster lookup
    const modelToAliasesAndDeployments: Record<string, Set<string>> = Object.fromEntries(
      trainedModels.map((model) => [
        model.model_id,
        new Set([
          model.model_id,
          ...(model.metadata?.model_aliases ?? []),
          ...(isNLPModelItem(model) ? model.deployment_ids : []),
        ]),
      ])
    );

    // Set of unique model ids, aliases, and deployment ids.
    const modelIdsAndAliases: string[] = Object.values(modelToAliasesAndDeployments).flatMap((s) =>
      Array.from(s)
    );

    try {
      // Get all pipelines first in one call:
      const modelPipelinesMap = await this.getModelsPipelines(modelIdsAndAliases);

      trainedModels.forEach((model) => {
        const modelAliasesAndDeployments = modelToAliasesAndDeployments[model.model_id];
        // Check model pipelines map for any pipelines associated with the model
        for (const [modelEntityId, pipelines] of modelPipelinesMap) {
          if (modelAliasesAndDeployments.has(modelEntityId)) {
            // Merge pipeline definitions into the model
            model.pipelines = model.pipelines
              ? Object.assign(model.pipelines, pipelines)
              : pipelines;
          }
        }
      });
    } catch (e) {
      // the user might not have required permissions to fetch pipelines
      // log the error to the debug log as this might be a common situation and
      // we don't need to fill kibana's log with these messages.
      mlLog.debug(e);
    }
  }

  /**
   * Assigns indices to trained models
   */
  async assignModelIndices(trainedModels: TrainedModelItem[]): Promise<void> {
    // Get a list of all uniquer pipeline ids to retrieve mapping with indices
    const pipelineIds = new Set<string>(
      trainedModels
        .filter((model): model is TrainedModelWithPipelines => isDefined(model.pipelines))
        .flatMap((model) => Object.keys(model.pipelines))
    );

    const pipelineToIndicesMap = await this.getPipelineToIndicesMap(pipelineIds);

    trainedModels.forEach((model) => {
      if (!isEmpty(model.pipelines)) {
        model.indices = Object.entries(pipelineToIndicesMap)
          .filter(([pipelineId]) => !isEmpty(model.pipelines?.[pipelineId]))
          .flatMap(([_, indices]) => indices);
      }
    });
  }

  /**
   * Assign a check for each DFA model if origin job exists
   */
  async assignDFAJobCheck(trainedModels: DFAModelItem[]): Promise<void> {
    try {
      const dfaJobIds = trainedModels
        .map((model) => {
          const id = model.metadata?.analytics_config?.id;
          if (id) {
            return `${id}*`;
          }
        })
        .filter(isDefined);

      if (dfaJobIds.length > 0) {
        const { data_frame_analytics: jobs } = await this._mlClient.getDataFrameAnalytics({
          id: dfaJobIds.join(','),
          allow_no_match: true,
        });

        trainedModels.forEach((model) => {
          const dfaId = model?.metadata?.analytics_config?.id;
          if (dfaId !== undefined) {
            // if this is a dfa model, set origin_job_exists
            model.origin_job_exists = jobs.find((job) => job.id === dfaId) !== undefined;
          }
        });
      }
    } catch (e) {
      return;
    }
  }

  /**
   * Returns a complete list of entities for the Trained Models UI
   */
  async getTrainedModelList(): Promise<TrainedModelUIItem[]> {
    const resp = await this._mlClient.getTrainedModels({
      size: 1000,
    } as MlGetTrainedModelsRequest);

    let resultItems: TrainedModelUIItem[] = [];

    // Filter models based on enabled features
    const filteredModels = filterForEnabledFeatureModels(
      resp.trained_model_configs,
      this._enabledFeatures
    ) as TrainedModelConfigResponse[];

    const formattedModels = filteredModels.map<ExistingModelBase>((model) => {
      return {
        ...model,
        // Extract model types
        type: [
          model.model_type,
          ...(isBuiltInModel(model) ? [BUILT_IN_MODEL_TYPE] : []),
          ...(isElasticModel(model) ? [ELASTIC_MODEL_TYPE] : []),
          ...(typeof model.inference_config === 'object'
            ? Object.keys(model.inference_config)
            : []),
        ].filter(isDefined),
      };
    });

    // Update inference endpoints info
    await this.assignInferenceEndpoints(formattedModels);

    // Assign model stats
    resultItems = await this.assignModelStats(formattedModels);

    if (this._enabledFeatures.nlp) {
      resultItems = await this.includeModelDownloads(resultItems);
    }

    const existingModels = resultItems.filter(isExistingModel);

    // Assign pipelines to existing models
    await this.assignPipelines(existingModels);

    // Assign indices
    await this.assignModelIndices(existingModels);

    await this.assignDFAJobCheck(resultItems.filter(isDFAModelItem));

    return resultItems;
  }

  /**
   * Simulates the effect of the pipeline on given document.
   *
   */
  async simulatePipeline(docs: IngestSimulateDocument[], pipelineConfig: IngestPipeline) {
    const simulateRequest: IngestSimulateRequest = {
      docs,
      pipeline: pipelineConfig,
    };
    let result = {};
    try {
      result = await this._client.asCurrentUser.ingest.simulate(simulateRequest);
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return an empty response and a 200
        return result;
      }
      throw error;
    }

    return result;
  }

  /**
   * Creates the pipeline
   *
   */
  async createInferencePipeline(pipelineConfig: IngestPipeline, pipelineName: string) {
    let result = {};

    result = await this._client.asCurrentUser.ingest.putPipeline({
      id: pipelineName,
      ...pipelineConfig,
    });

    return result;
  }

  /**
   * Retrieves existing pipelines.
   *
   */
  async getPipelines() {
    let result = {};
    try {
      result = await this._client.asCurrentUser.ingest.getPipeline();
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return an empty response and a 200
        return result;
      }
      throw error;
    }

    return result;
  }

  /**
   * Retrieves the map of model ids and aliases with associated pipelines,
   * where key is a model, alias or deployment id, and value is a map of pipeline ids and pipeline definitions.
   * @param modelIds - Array of models ids and model aliases.
   */
  async getModelsPipelines(modelIds: string[]) {
    const modelIdsMap = new Map<string, Record<string, PipelineDefinition>>(
      modelIds.map((id: string) => [id, {}])
    );

    try {
      const body = await this._client.asCurrentUser.ingest.getPipeline();

      for (const [pipelineName, pipelineDefinition] of Object.entries(body)) {
        const { processors } = pipelineDefinition as { processors: Array<Record<string, any>> };

        for (const processor of processors) {
          const id = processor.inference?.model_id;
          if (modelIdsMap.has(id)) {
            const obj = modelIdsMap.get(id);
            if (obj === null) {
              modelIdsMap.set(id, { [pipelineName]: pipelineDefinition });
            } else {
              obj![pipelineName] = pipelineDefinition;
            }
          }
        }
      }
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return the modelIdsMap and a 200
        return modelIdsMap;
      }
      throw error;
    }

    return modelIdsMap;
  }

  /**
   * Match pipelines to indices based on the default_pipeline setting in the index settings.
   */
  async getPipelineToIndicesMap(pipelineIds: Set<string>): Promise<Record<string, string[]>> {
    const pipelineIdsToDestinationIndices: Record<string, string[]> = {};

    let indicesPermissions;
    let indicesSettings;

    try {
      indicesSettings = await this._client.asInternalUser.indices.getSettings();
      const hasPrivilegesResponse = await this._client.asCurrentUser.security.hasPrivileges({
        index: [
          {
            names: Object.keys(indicesSettings),
            privileges: ['read'],
          },
        ],
      });
      indicesPermissions = hasPrivilegesResponse.index;
    } catch (e) {
      // Possible that the user doesn't have permissions to view
      if (e.meta?.statusCode !== 403) {
        mlLog.error(e);
      }
      return pipelineIdsToDestinationIndices;
    }

    // From list of model pipelines, find all indices that have pipeline set as index.default_pipeline
    for (const [indexName, { settings }] of Object.entries(indicesSettings)) {
      const defaultPipeline = settings?.index?.default_pipeline;
      if (
        defaultPipeline &&
        pipelineIds.has(defaultPipeline) &&
        indicesPermissions[indexName]?.read === true
      ) {
        if (Array.isArray(pipelineIdsToDestinationIndices[defaultPipeline])) {
          pipelineIdsToDestinationIndices[defaultPipeline].push(indexName);
        } else {
          pipelineIdsToDestinationIndices[defaultPipeline] = [indexName];
        }
      }
    }

    return pipelineIdsToDestinationIndices;
  }

  /**
   * Retrieves the network map and metadata of model ids, pipelines, and indices that are tied to the model ids.
   * @param modelIds - Array of models ids and model aliases.
   */
  async getModelsPipelinesAndIndicesMap(
    modelId: string,
    {
      withIndices,
    }: {
      withIndices: boolean;
    }
  ): Promise<ModelMapResult> {
    const result: ModelMapResult = {
      ingestPipelines: new Map(),
      indices: [],
      elements: [],
      details: {},
      error: null,
    };

    let pipelinesResponse;

    try {
      pipelinesResponse = await this.getModelsPipelines([modelId]);

      // 1. Get list of pipelines that are related to the model
      const pipelines = pipelinesResponse?.get(modelId);
      const modelNodeId = this.getNodeId(modelId, JOB_MAP_NODE_TYPES.TRAINED_MODEL);

      if (pipelines) {
        const pipelineIds = new Set(Object.keys(pipelines));
        result.ingestPipelines = pipelinesResponse;

        for (const pipelineId of pipelineIds) {
          const pipelineNodeId = this.getNodeId(pipelineId, JOB_MAP_NODE_TYPES.INGEST_PIPELINE);
          result.details[pipelineNodeId] = pipelines[pipelineId];

          result.elements.push({
            data: {
              id: pipelineNodeId,
              label: pipelineId,
              type: JOB_MAP_NODE_TYPES.INGEST_PIPELINE,
            },
          });

          result.elements.push({
            data: {
              id: `${modelNodeId}~${pipelineNodeId}`,
              source: modelNodeId,
              target: pipelineNodeId,
            },
          });
        }

        if (withIndices === true) {
          const pipelineIdsToDestinationIndices: Record<string, string[]> =
            await this.getPipelineToIndicesMap(pipelineIds);

          // 3. Grab index information for all the indices found, and add their info to the map
          for (const [pipelineId, indexIds] of Object.entries(pipelineIdsToDestinationIndices)) {
            const pipelineNodeId = this.getNodeId(pipelineId, JOB_MAP_NODE_TYPES.INGEST_PIPELINE);

            for (const destinationIndexId of indexIds) {
              const destinationIndexNodeId = this.getNodeId(
                destinationIndexId,
                JOB_MAP_NODE_TYPES.INDEX
              );

              const destinationIndexDetails = await this.getIndexData(destinationIndexId);

              result.indices.push(destinationIndexDetails);

              result.details[destinationIndexNodeId] = {
                ...destinationIndexDetails,
                ml_inference_models: [modelId],
              };

              result.elements.push({
                data: {
                  id: destinationIndexNodeId,
                  label: destinationIndexId,
                  type: JOB_MAP_NODE_TYPES.INDEX,
                },
              });

              result.elements.push({
                data: {
                  id: `${pipelineNodeId}~${destinationIndexNodeId}`,
                  source: pipelineNodeId,
                  target: destinationIndexNodeId,
                },
              });
            }
          }

          const destinationIndices = flatten(Object.values(pipelineIdsToDestinationIndices));

          // 4. From these destination indices, check if there's any transforms that have the indexId as the source destination index
          if (destinationIndices.length > 0) {
            const transforms = await this.initTransformData();

            if (!transforms) return result;

            for (const destinationIndex of destinationIndices) {
              const destinationIndexNodeId = `${destinationIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;

              const foundTransform = transforms?.find((t) => {
                const transformSourceIndex = Array.isArray(t.source.index)
                  ? t.source.index[0]
                  : t.source.index;
                return transformSourceIndex === destinationIndex;
              });

              // 5. If any of the transforms use these indices as source , find the destination indices to complete the map
              if (foundTransform) {
                const transformDestIndex = foundTransform.dest.index;
                const transformNodeId = `${foundTransform.id}-${JOB_MAP_NODE_TYPES.TRANSFORM}`;
                const transformDestIndexNodeId = `${transformDestIndex}-${JOB_MAP_NODE_TYPES.INDEX}`;

                const destIndex = await this.getIndexData(transformDestIndex);

                result.indices.push(destIndex);

                result.details[transformNodeId] = foundTransform;
                result.details[transformDestIndexNodeId] = destIndex;

                result.elements.push(
                  {
                    data: {
                      id: transformNodeId,
                      label: foundTransform.id,
                      type: JOB_MAP_NODE_TYPES.TRANSFORM,
                    },
                  },
                  {
                    data: {
                      id: transformDestIndexNodeId,
                      label: transformDestIndex,
                      type: JOB_MAP_NODE_TYPES.INDEX,
                    },
                  }
                );

                result.elements.push(
                  {
                    data: {
                      id: `${destinationIndexNodeId}~${transformNodeId}`,
                      source: destinationIndexNodeId,
                      target: transformNodeId,
                    },
                  },
                  {
                    data: {
                      id: `${transformNodeId}~${transformDestIndexNodeId}`,
                      source: transformNodeId,
                      target: transformDestIndexNodeId,
                    },
                  }
                );
              }
            }
          }
        }
      }
      return result;
    } catch (error) {
      if (error.statusCode === 404) {
        // ES returns 404 when there are no pipelines
        // Instead, we should return the modelIdsMap and a 200
        return result;
      }
      throw error;
    }
  }

  /**
   * Deletes associated pipelines of the requested model
   * @param modelIds
   */
  async deleteModelPipelines(modelIds: string[]) {
    const pipelines = await this.getModelsPipelines(modelIds);
    const pipelinesIds: string[] = [
      ...new Set([...pipelines.values()].flatMap((v) => Object.keys(v!))),
    ];
    await Promise.all(
      pipelinesIds.map((id) => this._client.asCurrentUser.ingest.deletePipeline({ id }))
    );
  }

  /**
   * Returns a list of elastic curated models available for download.
   */
  async getModelDownloads(): Promise<ModelDefinitionResponse[]> {
    // We assume that ML nodes in Cloud are always on linux-x86_64, even if other node types aren't.
    const isCloud = !!this._cloud?.cloudId;

    const nodesInfoResponse =
      await this._client.asInternalUser.transport.request<NodesInfoResponseBase>({
        method: 'GET',
        path: `/_nodes/ml:true/os`,
      });

    let osName: string | undefined;
    let arch: string | undefined;
    // Indicates that all ML nodes have the same architecture
    let sameArch = true;
    for (const node of Object.values(nodesInfoResponse.nodes)) {
      if (!osName) {
        osName = node.os?.name;
      }
      if (!arch) {
        arch = node.os?.arch;
      }
      if (node.os?.name !== osName || node.os?.arch !== arch) {
        sameArch = false;
        break;
      }
    }

    const modelDefinitionMap = new Map<string, ModelDefinitionResponse[]>();

    for (const [modelId, def] of Object.entries(ELASTIC_MODEL_DEFINITIONS)) {
      const recommended =
        (isCloud && def.os === 'Linux' && def.arch === 'amd64') ||
        (sameArch && !!def?.os && def?.os === osName && def?.arch === arch);

      const { modelName } = def;

      const modelDefinitionResponse = {
        ...def,
        ...(recommended ? { recommended } : {}),
        supported: !!def.default || recommended,
        model_id: modelId,
      };

      if (modelDefinitionMap.has(modelName)) {
        modelDefinitionMap.get(modelName)!.push(modelDefinitionResponse);
      } else {
        modelDefinitionMap.set(modelName, [modelDefinitionResponse]);
      }
    }

    // check if there is no recommended, so we mark default as recommended
    for (const arr of modelDefinitionMap.values()) {
      const defaultModel = arr.find((a) => a.default);
      const recommendedModel = arr.find((a) => a.recommended);
      if (defaultModel && !recommendedModel) {
        delete defaultModel.default;
        defaultModel.recommended = true;
      }
    }

    return [...modelDefinitionMap.values()].flat();
  }

  /**
   * Provides an appropriate model ID and configuration for download based on the current cluster architecture.
   *
   * @param modelName
   * @param options
   * @returns
   */
  async getCuratedModelConfig(
    modelName: ElasticCuratedModelName,
    options?: GetModelDownloadConfigOptions
  ): Promise<ModelDefinitionResponse> | never {
    const modelDownloadConfig = (await this.getModelDownloads()).filter(
      (model) => model.modelName === modelName
    );
    let requestedModel: ModelDefinitionResponse | undefined;
    let recommendedModel: ModelDefinitionResponse | undefined;
    let defaultModel: ModelDefinitionResponse | undefined;

    for (const model of modelDownloadConfig) {
      if (options?.version === model.version) {
        requestedModel = model;
        if (model.recommended) {
          requestedModel = model;
          break;
        }
      } else if (model.recommended) {
        recommendedModel = model;
      } else if (model.default) {
        defaultModel = model;
      }
    }

    if (!requestedModel && !defaultModel && !recommendedModel) {
      throw new Error('Requested model not found');
    }

    return requestedModel || recommendedModel || defaultModel!;
  }

  /**
   * Provides an ELSER model name and configuration for download based on the current cluster architecture.
   * The current default version is 2. If running on Cloud it returns the Linux x86_64 optimized version.
   * If any of the ML nodes run a different OS rather than Linux, or the CPU architecture isn't x86_64,
   * a portable version of the model is returned.
   */
  async getELSER(
    options?: GetModelDownloadConfigOptions
  ): Promise<ModelDefinitionResponse> | never {
    return await this.getCuratedModelConfig('elser', options);
  }

  /**
   * Puts the requested ELSER model into elasticsearch, triggering elasticsearch to download the model.
   * Assigns the model to the * space.
   * @param modelId
   * @param mlSavedObjectService
   */
  async installElasticModel(modelId: string, mlSavedObjectService: MLSavedObjectService) {
    const availableModels = await this.getModelDownloads();
    const model = availableModels.find((m) => m.model_id === modelId);
    if (!model) {
      throw Boom.notFound('Model not found');
    }

    let esModelExists = false;
    try {
      await this._client.asInternalUser.ml.getTrainedModels({ model_id: modelId });
      esModelExists = true;
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
      // model doesn't exist, ignore error
    }

    if (esModelExists) {
      throw Boom.badRequest('Model already exists');
    }

    const putResponse = await this._mlClient.putTrainedModel({
      model_id: model.model_id,
      body: model.config,
    });

    await mlSavedObjectService.updateTrainedModelsSpaces([modelId], ['*'], []);
    return putResponse;
  }
  /**
   * Puts the requested Inference endpoint id into elasticsearch, triggering elasticsearch to create the inference endpoint id
   * @param inferenceId - Inference Endpoint Id
   * @param taskType - Inference Task type. Either sparse_embedding or text_embedding
   * @param inferenceConfig - Model configuration based on service type
   */
  async createInferenceEndpoint(
    inferenceId: string,
    taskType: InferenceTaskType,
    inferenceConfig: InferenceInferenceEndpoint
  ) {
    try {
      const result = await this._client.asCurrentUser.inference.put(
        {
          inference_id: inferenceId,
          task_type: taskType,
          inference_config: inferenceConfig,
        },
        { maxRetries: 0 }
      );
      return result;
    } catch (error) {
      // Request timeouts will usually occur when the model is being downloaded/deployed
      // Erroring out is misleading in these cases, so we return the model_id and task_type
      if (error.name === 'TimeoutError') {
        return {
          model_id: inferenceConfig.service,
          task_type: taskType,
        };
      } else {
        throw error;
      }
    }
  }

  async getModelsDownloadStatus() {
    const result = await this._client.asInternalUser.tasks.list({
      actions: 'xpack/ml/model_import[n]',
      detailed: true,
      group_by: 'none',
    });

    if (!result.tasks?.length) {
      return {};
    }

    // Groups results by model id
    const byModelId = (result.tasks as TasksTaskInfo[]).reduce((acc, task) => {
      const modelId = task.description!.replace(`model_id-`, '');
      acc[modelId] = {
        downloaded_parts: task.status.downloaded_parts,
        total_parts: task.status.total_parts,
      };
      return acc;
    }, {} as Record<string, ModelDownloadState>);

    return byModelId;
  }
}
