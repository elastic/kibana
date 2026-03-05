/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createInferenceRequestError } from '@kbn/inference-common';
import { getInferenceEndpointById } from '../../util/get_inference_endpoint_by_id';

export interface InferenceEndpointMeta {
  inferenceId: string;
  provider?: string;
  modelId?: string;
  taskType?: string;
}

/**
 * Resolves metadata about an inference endpoint by querying the ES Inference API.
 * This is used to populate tracing spans and telemetry with model information.
 *
 * Throws if the endpoint does not exist. 
 */
export const resolveInferenceEndpoint = async ({
  inferenceId,
  esClient,
}: {
  inferenceId: string;
  esClient: ElasticsearchClient;
}): Promise<InferenceEndpointMeta> => {
  const endpoint = await getInferenceEndpointById({ inferenceId, esClient });

  if (endpoint.taskType !== 'chat_completion') {
    throw createInferenceRequestError(
      `Inference endpoint '${inferenceId}' has task type '${endpoint.taskType}', expected 'chat_completion'`,
      400
    );
  }

  const serviceSettings = endpoint.serviceSettings as
    | { model_id?: string; model?: string }
    | undefined;

  return {
    inferenceId,
    provider: endpoint.service,
    modelId: serviceSettings?.model_id ?? serviceSettings?.model ?? undefined,
    taskType: endpoint.taskType,
  };
};
