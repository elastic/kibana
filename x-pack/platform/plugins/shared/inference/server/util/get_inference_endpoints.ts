/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export interface InferenceEndpoint {
  inferenceId: string;
  taskType: string;
  service: string;
  serviceSettings?: Record<string, unknown>;
}

interface GetInferenceEndpointsResponse {
  endpoints: Array<{
    inference_id: string;
    task_type: string;
    service: string;
    service_settings?: Record<string, unknown>;
  }>;
}

/**
 * Retrieves all available inference endpoints, optionally filtered to
 * only `chat_completion` task type endpoints.
 */
export const getInferenceEndpoints = async ({
  esClient,
  taskType,
}: {
  esClient: ElasticsearchClient;
  taskType?: string;
}): Promise<InferenceEndpoint[]> => {
  const response = await esClient.transport.request<GetInferenceEndpointsResponse>({
    method: 'GET',
    path: '/_inference',
  });

  const endpoints = (response.endpoints ?? []).map((ep) => ({
    inferenceId: ep.inference_id,
    taskType: ep.task_type,
    service: ep.service,
    serviceSettings: ep.service_settings,
  }));

  if (taskType) {
    return endpoints.filter((ep) => ep.taskType === taskType);
  }

  return endpoints;
};
