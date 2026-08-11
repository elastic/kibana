/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
export const isProviderTechPreview = (provider: InferenceInferenceEndpointInfo) => {
  const {
    inference_id: inferenceId,
    service,
    service_settings: serviceSettings,
    task_type: taskType,
  } = provider;
  const modelId = serviceSettings?.model_id;

  // If there's no model ID in service settings, it's not a tech preview
  if (!modelId) {
    return false;
  }

  /*
    For rerank task type, model ID starting with '.' indicates tech preview
    Special case for 'rainbow-sprinkles' model and ELSER on EIS
  */
  if (
    (taskType === 'rerank' && modelId.startsWith('.')) ||
    ((modelId === 'multilingual-embed-v1' || modelId === 'rerank-v1') &&
      inferenceId.startsWith('.') &&
      service === ServiceProviderKeys.elastic)
  ) {
    return true;
  }

  return false;
};
