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
} from '@elastic/elasticsearch/lib/api/types';
import pRetry from 'p-retry';
import { ObservabilityAIAssistantConfig } from '../config';
import { resourceNames } from '.';

export async function getInferenceEndpoint({
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
}) {
  const enabled = config.enableKnowledgeBase;

  if (!inferenceId) {
    try {
      inferenceId = await getInferenceIdFromWriteIndex(esClient);
    } catch (error) {
      return {
        endpoint: { inference_id: inferenceId },
        ready: false,
        enabled,
        errorMessage: error.message,
      };
    }
  }

  let endpoint: InferenceInferenceEndpointInfo;
  try {
    endpoint = await getInferenceEndpoint({ esClient, inferenceId });
  } catch (error) {
    if (!isInferenceEndpointMissingOrUnavailable(error)) {
      throw error;
    }
    return {
      ready: false,
      enabled,
      errorMessage: error.message,
      endpoint: { inference_id: inferenceId },
    };
  }

  let trainedModelStatsResponse: MlGetTrainedModelsStatsResponse;
  try {
    trainedModelStatsResponse = await esClient.asInternalUser.ml.getTrainedModelsStats({
      model_id: endpoint.service_settings?.model_id,
    });
  } catch (error) {
    logger.debug(`Failed to get model stats: ${error.message}`);
    return {
      ready: false,
      enabled,
      errorMessage: error.message,
      endpoint,
    };
  }

  const modelStats = trainedModelStatsResponse.trained_model_stats.find(
    (stats) => stats.deployment_stats?.deployment_id === inferenceId
  );
  const deploymentState = modelStats?.deployment_stats?.state;
  const allocationState = modelStats?.deployment_stats?.allocation_status?.state;
  const allocationCount = modelStats?.deployment_stats?.allocation_status?.allocation_count ?? 0;
  const ready =
    deploymentState === 'started' && allocationState === 'fully_allocated' && allocationCount > 0;

  return {
    endpoint,
    ready,
    enabled,
    model_stats: {
      allocation_count: allocationCount,
      deployment_state: deploymentState,
      allocation_state: allocationState,
    },
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
      const { ready } = await getKbModelStatus({ esClient, logger, config, inferenceId });
      if (!ready) {
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
