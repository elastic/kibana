/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import moment from 'moment';
import pRetry from 'p-retry';
import {
  InferenceInferenceEndpointInfo,
  MlGetTrainedModelsStatsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { ObservabilityAIAssistantConfig } from '../config';

export const AI_ASSISTANT_KB_INFERENCE_ID = 'obs_ai_assistant_kb_inference';

export async function createInferenceEndpoint({
  esClient,
  logger,
  modelId,
}: {
  esClient: {
    asCurrentUser: ElasticsearchClient;
  };
  logger: Logger;
  modelId: string;
}) {
  try {
    logger.debug(`Creating inference endpoint "${AI_ASSISTANT_KB_INFERENCE_ID}"`);

    return await esClient.asCurrentUser.inference.put(
      {
        inference_id: AI_ASSISTANT_KB_INFERENCE_ID,
        task_type: 'sparse_embedding',
        inference_config: {
          service: 'elasticsearch',
          service_settings: {
            model_id: modelId,
            adaptive_allocations: { enabled: true, min_number_of_allocations: 1 },
            num_threads: 1,
          },
          task_settings: {},
        },
      },
      {
        requestTimeout: moment.duration(2, 'minutes').asMilliseconds(),
      }
    );
  } catch (e) {
    logger.debug(
      `Failed to create inference endpoint "${AI_ASSISTANT_KB_INFERENCE_ID}": ${e.message}`
    );
    throw e;
  }
}

export async function deleteInferenceEndpoint({
  esClient,
}: {
  esClient: {
    asCurrentUser: ElasticsearchClient;
  };
}) {
  const response = await esClient.asCurrentUser.inference.delete({
    inference_id: AI_ASSISTANT_KB_INFERENCE_ID,
    force: true,
  });

  return response;
}

export async function getInferenceEndpoint({
  esClient,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
}) {
  const response = await esClient.asInternalUser.inference.get({
    inference_id: AI_ASSISTANT_KB_INFERENCE_ID,
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

export async function getKbModelStatus({
  esClient,
  logger,
  config,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}) {
  const enabled = config.enableKnowledgeBase;

  let endpoint: InferenceInferenceEndpointInfo;
  try {
    endpoint = await getInferenceEndpoint({ esClient });
  } catch (error) {
    if (!isInferenceEndpointMissingOrUnavailable(error)) {
      throw error;
    }
    return { ready: false, enabled, errorMessage: error.message };
  }

  let trainedModelStatsResponse: MlGetTrainedModelsStatsResponse;
  try {
    trainedModelStatsResponse = await esClient.asInternalUser.ml.getTrainedModelsStats({
      model_id: endpoint.service_settings?.model_id,
    });
  } catch (error) {
    logger.debug(`Failed to get model stats: ${error.message}`);
    return { ready: false, enabled, errorMessage: error.message };
  }

  const modelStats = trainedModelStatsResponse.trained_model_stats.find(
    (stats) => stats.deployment_stats?.deployment_id === AI_ASSISTANT_KB_INFERENCE_ID
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
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}) {
  return pRetry(
    async () => {
      const { ready } = await getKbModelStatus({ esClient, logger, config });
      if (!ready) {
        logger.debug('Knowledge base model is not yet ready. Retrying...');
        throw new Error('Knowledge base model is not yet ready');
      }
    },
    { retries: 30, factor: 2, maxTimeout: 30_000 }
  );
}
