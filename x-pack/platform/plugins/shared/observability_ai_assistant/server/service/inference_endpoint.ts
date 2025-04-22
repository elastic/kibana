/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import {
  InferenceInferenceEndpointInfo,
  MappingSemanticTextProperty,
  MlGetTrainedModelsStatsResponse,
  MlTrainedModelStats,
} from '@elastic/elasticsearch/lib/api/types';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import pRetry from 'p-retry';
import { KnowledgeBaseState } from '../../common';
import { ObservabilityAIAssistantConfig } from '../config';
import { resourceNames } from '.';

const SUPPORTED_TASK_TYPES = ['sparse_embedding', 'text_embedding'];

export const getPreconfiguredInferenceEndpointsForEmbedding = async ({
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

  logger.debug(`Found "${endpoints.length}" inference endpoints`);

  const embeddingEndpoints = endpoints.filter((endpoint) =>
    SUPPORTED_TASK_TYPES.includes(endpoint.task_type)
  );

  if (!embeddingEndpoints.length) {
    throw new Error('Did not find any inference endpoints for embedding');
  }

  logger.debug(`Found "${embeddingEndpoints.length}" inference endpoints for supported task types`);

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

export function isInferenceEndpointMissingOrUnavailable(error: Error) {
  return (
    error instanceof errors.ResponseError &&
    (error.body?.error?.type === 'resource_not_found_exception' ||
      error.body?.error?.type === 'status_exception')
  );
}

export async function getInferenceIdFromWriteIndex(esClient: {
  asInternalUser: ElasticsearchClient;
}): Promise<string> {
  const response = await esClient.asInternalUser.indices.getFieldMapping({
    index: resourceNames.writeIndexAlias.kb,
    fields: 'semantic_text',
  });

  const [indexName, indexMappings] = Object.entries(response)[0];
  const inferenceId = (
    indexMappings.mappings.semantic_text?.mapping.semantic_text as MappingSemanticTextProperty
  )?.inference_id;

  if (!inferenceId) {
    throw new Error(`inference_id not found in field mappings for index ${indexName}`);
  }

  return inferenceId as string;
}

export async function getKbModelStatus({
  esClient,
  logger,
  config,
  inferenceId,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
  inferenceId?: string;
}): Promise<{
  enabled: boolean;
  endpoint?: InferenceInferenceEndpointInfo;
  modelStats?: MlTrainedModelStats;
  errorMessage?: string;
  kbState: KnowledgeBaseState;
}> {
  const enabled = config.enableKnowledgeBase;

  if (!inferenceId) {
    try {
      inferenceId = await getInferenceIdFromWriteIndex(esClient);
      logger.debug(`Using existing inference id "${inferenceId}" from write index`);
    } catch (error) {
      logger.debug(`Inference id not found: ${error.message}`);

      return {
        enabled,
        errorMessage: error.message,
        kbState: KnowledgeBaseState.NOT_INSTALLED,
      };
    }
  }

  let endpoint: InferenceInferenceEndpointInfo;
  try {
    endpoint = await getInferenceEndpoint({ esClient, inferenceId });
    logger.debug(
      `Inference endpoint "${inferenceId}" found with model id "${endpoint?.service_settings?.model_id}"`
    );
  } catch (error) {
    if (!isInferenceEndpointMissingOrUnavailable(error)) {
      throw error;
    }
    logger.debug(`Inference endpoint "${inferenceId}" not found or unavailable: ${error.message}`);

    return { enabled, errorMessage: error.message, kbState: KnowledgeBaseState.NOT_INSTALLED };
  }

  const modelId = endpoint?.service_settings?.model_id;
  let trainedModelStatsResponse: MlGetTrainedModelsStatsResponse;

  try {
    trainedModelStatsResponse = await esClient.asInternalUser.ml.getTrainedModelsStats({
      model_id: modelId,
    });
  } catch (error) {
    logger.error(
      `Failed to get model stats for model "${modelId}" and inference id ${inferenceId}: ${error.message}`
    );

    return {
      enabled,
      endpoint,
      errorMessage: error.message,
      kbState: KnowledgeBaseState.NOT_INSTALLED,
    };
  }

  const modelStats = trainedModelStatsResponse.trained_model_stats.find(
    (stats) => stats.deployment_stats?.deployment_id === inferenceId
  );

  let kbState: KnowledgeBaseState;

  if (!modelStats) {
    kbState = KnowledgeBaseState.NOT_INSTALLED;
  } else if (modelStats.deployment_stats?.state === 'failed') {
    kbState = KnowledgeBaseState.ERROR;
  } else if (
    modelStats?.deployment_stats?.state === 'starting' &&
    modelStats?.deployment_stats?.allocation_status?.allocation_count === 0
  ) {
    kbState = KnowledgeBaseState.DEPLOYING_MODEL;
  } else if (
    modelStats?.deployment_stats?.state === 'started' &&
    modelStats?.deployment_stats?.allocation_status?.state === 'fully_allocated' &&
    modelStats?.deployment_stats?.allocation_status?.allocation_count > 0
  ) {
    kbState = KnowledgeBaseState.READY;
  } else {
    kbState = KnowledgeBaseState.ERROR;
  }

  return {
    endpoint,
    enabled,
    modelStats,
    kbState,
  };
}

export async function waitForKbModel({
  esClient,
  logger,
  config,
  inferenceId,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
  inferenceId: string;
}) {
  // Run a dummy inference to trigger the model to deploy
  // This is a workaround for the fact that the model may not be deployed yet
  await warmupModel({ esClient, logger, inferenceId }).catch(() => {});

  return pRetry(
    async () => {
      const { kbState } = await getKbModelStatus({ esClient, logger, config, inferenceId });

      if (kbState !== KnowledgeBaseState.READY) {
        logger.debug('Knowledge base model is not yet ready. Retrying...');
        throw new Error('Knowledge base model is not yet ready');
      }
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
  logger.debug(`Running inference to trigger model deployment for "${inferenceId}"`);
  await pRetry(
    () =>
      esClient.asInternalUser.inference.inference({
        inference_id: inferenceId,
        input: 'hello world',
      }),
    { retries: 10 }
  ).catch((error) => {
    logger.error(`Unable to run inference on endpoint "${inferenceId}": ${error.message}`);
  });
}
