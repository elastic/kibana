/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type {
  InferenceInferenceEndpointInfo,
  MlGetTrainedModelsStatsResponse,
  MlTrainedModelStats,
} from '@elastic/elasticsearch/lib/api/types';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import pRetry from 'p-retry';
import type { CoreSetup } from '@kbn/core/server';
import type { DocumentationManagerAPI } from '@kbn/product-doc-base-plugin/server/services/doc_manager';
import type { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import { EIS_PRECONFIGURED_INFERENCE_IDS, InferenceModelState } from '../../common';
import type { ObservabilityAIAssistantConfig } from '../config';
import {
  getConcreteWriteIndex,
  getInferenceIdFromWriteIndex,
} from './knowledge_base_service/get_inference_id_from_write_index';
import { isReIndexInProgress } from './knowledge_base_service/reindex_knowledge_base';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../types';

const SUPPORTED_TASK_TYPES = ['sparse_embedding', 'text_embedding'];

export const getInferenceEndpointsForEmbedding = async ({
  esClient,
  logger,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
}): Promise<{
  inferenceEndpoints: InferenceAPIConfigResponse[];
}> => {
  const { endpoints } = await esClient.asInternalUser.inference.get({
    inference_id: '_all',
  });

  if (!endpoints.length) {
    throw new Error('Did not find any inference endpoints');
  }

  const embeddingEndpoints = endpoints.filter((endpoint) =>
    SUPPORTED_TASK_TYPES.includes(endpoint.task_type)
  );

  if (!embeddingEndpoints.length) {
    throw new Error('Did not find any inference endpoints for embedding');
  }

  logger.debug(`Found ${embeddingEndpoints.length} inference endpoints for supported task types`);

  return {
    inferenceEndpoints: embeddingEndpoints as InferenceAPIConfigResponse[],
  };
};

async function getInferenceEndpoint({
  esClient,
  inferenceId,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  inferenceId: string;
}) {
  const response = await esClient.asInternalUser.inference.get({
    inference_id: inferenceId,
  });

  if (response.endpoints.length === 0) {
    throw new Error('Inference endpoint not found');
  }
  return response.endpoints[0];
}

export async function deleteInferenceEndpoint({
  esClient,
  logger,
  inferenceId,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  inferenceId: string;
}) {
  try {
    logger.info(`Attempting to delete inference endpoint with ID: ${inferenceId}`);
    await esClient.asInternalUser.inference.delete({
      inference_id: inferenceId,
    });
    logger.info(`Successfully deleted inference endpoint with ID: ${inferenceId}`);
  } catch (error) {
    if (
      error instanceof errors.ResponseError &&
      error.body?.error?.type === 'resource_not_found_exception'
    ) {
      logger.debug(`Inference endpoint "${inferenceId}" was already deleted. Skipping deletion.`);
      return;
    }

    logger.error(
      `Failed to delete inference endpoint with ID: ${inferenceId}. Error: ${error.message}`
    );
  }
}

export function isInferenceEndpointMissingOrUnavailable(error: Error) {
  return (
    error instanceof errors.ResponseError &&
    (error.body?.error?.type === 'resource_not_found_exception' ||
      error.body?.error?.type === 'status_exception')
  );
}

export async function getKbModelStatus({
  core,
  esClient,
  logger,
  config,
  inferenceId,
  productDoc,
}: {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
  inferenceId?: string;
  productDoc: DocumentationManagerAPI;
}): Promise<{
  enabled: boolean;
  endpoint?: InferenceInferenceEndpointInfo;
  modelStats?: MlTrainedModelStats;
  errorMessage?: string;
  inferenceModelState: InferenceModelState;
  currentInferenceId?: string | undefined;
  concreteWriteIndex: string | undefined;
  isReIndexing: boolean;
  productDocStatus: InstallationStatus;
}> {
  const enabled = config.enableKnowledgeBase;
  const concreteWriteIndex = await getConcreteWriteIndex(esClient, logger);
  const isReIndexing = await isReIndexInProgress({ esClient, logger, core });
  const currentInferenceId = await getInferenceIdFromWriteIndex(esClient, logger);

  if (!inferenceId) {
    if (!currentInferenceId) {
      return {
        enabled,
        errorMessage: 'Inference ID not found in write index',
        currentInferenceId: undefined,
        inferenceModelState: InferenceModelState.NOT_INSTALLED,
        concreteWriteIndex,
        isReIndexing,
        productDocStatus: 'uninstalled',
      };
    }

    inferenceId = currentInferenceId;
  }

  const productDocStatus = await productDoc.getStatus({
    inferenceId,
  });
  // check if inference ID is an EIS inference ID
  const isPreConfiguredInferenceIdInEIS = EIS_PRECONFIGURED_INFERENCE_IDS.includes(inferenceId);

  let endpoint: InferenceInferenceEndpointInfo;

  try {
    endpoint = await getInferenceEndpoint({ esClient, inferenceId });
    logger.debug(
      `Inference endpoint "${inferenceId}" found with model id "${endpoint?.service_settings?.model_id}"`
    );

    // if the endpoint is in EIS, the model doesn't have to be downloaded and deployed
    // Therefore, return the KB state as READY if the endpoint exists
    if (isPreConfiguredInferenceIdInEIS && endpoint.service === 'elastic') {
      return {
        endpoint,
        enabled,
        inferenceModelState: InferenceModelState.READY,
        currentInferenceId,
        concreteWriteIndex,
        isReIndexing,
        productDocStatus: productDocStatus.status,
      };
    }
  } catch (error) {
    if (!isInferenceEndpointMissingOrUnavailable(error)) {
      throw error;
    }
    logger.warn(`Inference endpoint "${inferenceId}" not found or unavailable: ${error.message}`);

    return {
      enabled,
      errorMessage: error.message,
      inferenceModelState: InferenceModelState.NOT_INSTALLED,
      currentInferenceId,
      concreteWriteIndex,
      isReIndexing,
      productDocStatus: productDocStatus.status,
    };
  }

  const modelId = endpoint?.service_settings?.model_id;
  let trainedModelStatsResponse: MlGetTrainedModelsStatsResponse;

  try {
    trainedModelStatsResponse = await esClient.asInternalUser.ml.getTrainedModelsStats({
      model_id: modelId,
    });
  } catch (error) {
    logger.debug(
      `Failed to get model stats for model "${modelId}" and inference id ${inferenceId}: ${error.message}`
    );

    return {
      enabled,
      endpoint,
      errorMessage: error.message,
      inferenceModelState: InferenceModelState.NOT_INSTALLED,
      currentInferenceId,
      concreteWriteIndex,
      isReIndexing,
      productDocStatus: productDocStatus.status,
    };
  }

  const modelStats = trainedModelStatsResponse.trained_model_stats.find(
    (stats) => stats.deployment_stats?.deployment_id === inferenceId
  );

  let inferenceModelState: InferenceModelState;

  if (trainedModelStatsResponse.trained_model_stats?.length && !modelStats) {
    // model has been deployed at least once, but stopped later
    inferenceModelState = InferenceModelState.MODEL_PENDING_DEPLOYMENT;
  } else if (modelStats?.deployment_stats?.state === 'failed') {
    inferenceModelState = InferenceModelState.ERROR;
  } else if (
    modelStats?.deployment_stats?.state === 'starting' &&
    modelStats?.deployment_stats?.allocation_status?.allocation_count === 0
  ) {
    inferenceModelState = InferenceModelState.DEPLOYING_MODEL;
  } else if (
    modelStats?.deployment_stats?.state === 'started' &&
    modelStats?.deployment_stats?.allocation_status?.state === 'fully_allocated' &&
    modelStats?.deployment_stats?.allocation_status?.allocation_count > 0
  ) {
    inferenceModelState = InferenceModelState.READY;
  } else if (
    modelStats?.deployment_stats?.state === 'started' &&
    modelStats?.deployment_stats?.allocation_status?.state === 'fully_allocated' &&
    modelStats?.deployment_stats?.allocation_status?.allocation_count === 0
  ) {
    // model has been scaled down due to inactivity
    inferenceModelState = InferenceModelState.MODEL_PENDING_ALLOCATION;
  } else {
    inferenceModelState = InferenceModelState.ERROR;
  }

  return {
    endpoint,
    enabled,
    modelStats,
    inferenceModelState,
    concreteWriteIndex,
    currentInferenceId,
    isReIndexing,
    productDocStatus: productDocStatus.status,
  };
}

export async function waitForKbModel({
  core,
  esClient,
  logger,
  config,
  inferenceId,
  productDoc,
}: {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
  inferenceId: string;
  productDoc: DocumentationManagerAPI;
}) {
  logger.debug(`Waiting for knowledge base model to be ready for inference ID "${inferenceId}" !!`);

  // Run a dummy inference to trigger the model to deploy
  // This is a workaround for the fact that the model may not be deployed yet
  await warmupModel({ esClient, logger, inferenceId }).catch(() => {});

  return pRetry(
    async () => {
      logger.debug(`Checking knowledge base model status for inference ID "${inferenceId}"`);
      const { inferenceModelState } = await getKbModelStatus({
        core,
        esClient,
        logger,
        config,
        inferenceId,
        productDoc,
      });

      if (inferenceModelState !== InferenceModelState.READY) {
        const message = `Knowledge base model is not yet ready. inferenceModelState = ${inferenceModelState}, `;
        logger.debug(message);
        throw new Error(message);
      }

      logger.debug('Knowledge base model is ready.');
    },
    { retries: 30, factor: 2, maxTimeout: 30_000 }
  );
}

export async function warmupModel({
  esClient,
  logger,
  inferenceId,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  inferenceId: string;
}) {
  logger.debug(`Warming up model for "${inferenceId}"`);
  await pRetry(
    () =>
      esClient.asInternalUser.inference.inference({
        inference_id: inferenceId,
        input: 'hello world',
      }),
    { retries: 10 }
  ).catch((error) => {
    logger.error(`Unable to warm up model for "${inferenceId}": ${error.message}`);
  });
}
