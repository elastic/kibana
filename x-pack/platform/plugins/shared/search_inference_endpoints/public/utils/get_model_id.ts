/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';

/**
 * Extracts the model ID from an inference endpoint's service settings.
 * Different providers use different field names: some use `model_id`, others use `model`.
 */
export const getModelId = (endpoint: InferenceInferenceEndpointInfo): string | undefined => {
  const serviceSettings = endpoint.service_settings;
  return 'model_id' in serviceSettings
    ? serviceSettings.model_id
    : 'model' in serviceSettings
    ? serviceSettings.model
    : undefined;
};
