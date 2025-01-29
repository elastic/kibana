/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Config, Secrets } from '@kbn/inference-endpoint-ui-common';
import { ElasticsearchClient } from '@kbn/core/server';
import { unflattenObject } from '../utils/unflatten_object';

export const addInferenceEndpoint = async (
  esClient: ElasticsearchClient,
  config: Config,
  secrets: Secrets
) => {
  /* task settings property is required in the API call 
    but no needed for inference or connector creation
    */
  const taskSettings = {};
  const serviceSettings = {
    ...unflattenObject(config?.providerConfig ?? {}),
    ...unflattenObject(secrets?.providerSecrets ?? {}),
  };

  return await esClient.inference.put({
    inference_id: config?.inferenceId ?? '',
    task_type: config?.taskType as InferenceTaskType,
    inference_config: {
      service: config?.provider,
      service_settings: serviceSettings,
      task_settings: taskSettings,
    },
  });
};
