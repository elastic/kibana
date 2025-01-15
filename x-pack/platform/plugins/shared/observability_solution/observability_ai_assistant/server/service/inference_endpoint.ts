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

  if (response.endpoints.length > 0) {
    return response.endpoints[0];
  }
}

export function isInferenceEndpointMissingOrUnavailable(error: Error) {
  return (
    error instanceof errors.ResponseError &&
    (error.body?.error?.type === 'resource_not_found_exception' ||
      error.body?.error?.type === 'status_exception')
  );
}

export async function getElserModelStatus({
  esClient,
  logger,
  config,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}) {
  let errorMessage = '';
  const endpoint = await getInferenceEndpoint({
    esClient,
  }).catch((error) => {
    if (!isInferenceEndpointMissingOrUnavailable(error)) {
      throw error;
    }
    errorMessage = error.message;
  });

  const enabled = config.enableKnowledgeBase;
  if (!endpoint) {
    return { ready: false, enabled, errorMessage };
  }

  const modelId = endpoint.service_settings?.model_id;
  const modelStats = await esClient.asInternalUser.ml
    .getTrainedModelsStats({ model_id: modelId })
    .catch((error) => {
      logger.debug(`Failed to get model stats: ${error.message}`);
      errorMessage = error.message;
    });

  if (!modelStats) {
    return { ready: false, enabled, errorMessage };
  }

  const elserModelStats = modelStats.trained_model_stats.find(
    (stats) => stats.deployment_stats?.deployment_id === AI_ASSISTANT_KB_INFERENCE_ID
  );
  const deploymentState = elserModelStats?.deployment_stats?.state;
  const allocationState = elserModelStats?.deployment_stats?.allocation_status.state;
  const allocationCount =
    elserModelStats?.deployment_stats?.allocation_status.allocation_count ?? 0;
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
