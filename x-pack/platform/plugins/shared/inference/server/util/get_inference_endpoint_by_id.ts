/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createInferenceRequestError } from '@kbn/inference-common';
import type { InferenceEndpoint } from './get_inference_endpoints';

interface GetInferenceEndpointResponse {
  endpoints: Array<{
    inference_id: string;
    task_type: string;
    service: string;
    service_settings?: Record<string, unknown>;
  }>;
}

/**
 * Retrieves a specific inference endpoint by its ID.
 *
 * @throws if the endpoint is not found
 */
export const getInferenceEndpointById = async ({
  inferenceId,
  esClient,
}: {
  inferenceId: string;
  esClient: ElasticsearchClient;
}): Promise<InferenceEndpoint> => {
  const response = await esClient.transport.request<GetInferenceEndpointResponse>({
    method: 'GET',
    path: `/_inference/${encodeURIComponent(inferenceId)}`,
  });

  const endpoint = response.endpoints?.[0];
  if (!endpoint) {
    throw createInferenceRequestError(`Inference endpoint '${inferenceId}' not found`, 404);
  }

  return {
    inferenceId: endpoint.inference_id,
    taskType: endpoint.task_type,
    service: endpoint.service,
    serviceSettings: endpoint.service_settings,
  };
};
