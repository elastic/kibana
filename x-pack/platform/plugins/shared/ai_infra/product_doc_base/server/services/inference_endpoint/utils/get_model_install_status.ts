/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export const getModelInstallStatus = async ({
  inferenceId,
  taskType = 'sparse_embedding',
  client,
}: {
  inferenceId: string;
  taskType?: InferenceTaskType;
  client: ElasticsearchClient;
  log: Logger;
}) => {
  const getInferenceRes = await client.inference.get(
    {
      task_type: taskType,
      inference_id: inferenceId,
    },
    { ignore: [404] }
  );

  const installed = (getInferenceRes.endpoints ?? []).some(
    (endpoint) => endpoint.inference_id === inferenceId
  );

  return { installed };
};
