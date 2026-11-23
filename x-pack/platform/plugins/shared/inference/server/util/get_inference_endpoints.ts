/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DECISION_TASK_TYPE, EisInferenceEndpointMetadata } from '@kbn/inference-common';

/**
 * The task types an inference endpoint can have: Elasticsearch has `decision`, which its client's
 * types lack. Remove `DECISION_TASK_TYPE` here once `InferenceTaskType` includes it.
 */
export type InferenceEndpointTaskType = InferenceTaskType | typeof DECISION_TASK_TYPE;

export interface InferenceEndpoint {
  inferenceId: string;
  taskType: InferenceEndpointTaskType;
  service: string;
  serviceSettings?: Record<string, unknown>;
  // Fix this typing when ES response is updated to include metadata
  metadata?: EisInferenceEndpointMetadata;
}

/** Retrieves all available inference endpoints, optionally filtered to one task type. */
export const getInferenceEndpoints = async ({
  esClient,
  taskType,
}: {
  esClient: ElasticsearchClient;
  taskType?: InferenceEndpointTaskType;
}): Promise<InferenceEndpoint[]> => {
  const response = await esClient.inference.get();

  const endpoints = (response.endpoints ?? []).map((ep) => ({
    inferenceId: ep.inference_id,
    taskType: ep.task_type,
    service: ep.service,
    serviceSettings: ep.service_settings as Record<string, unknown> | undefined,
    metadata: 'metadata' in ep ? (ep.metadata as Record<string, unknown>) : {},
  }));

  if (taskType) {
    return endpoints.filter((ep) => ep.taskType === taskType);
  }

  return endpoints;
};
