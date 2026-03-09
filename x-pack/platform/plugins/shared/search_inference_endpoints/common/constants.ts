/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'searchInferenceEndpoints';
export const PLUGIN_NAME = 'Inference Endpoints';
export const INFERENCE_ENDPOINTS_APP_ID = 'inference_endpoints';
export const MODEL_SETTINGS_APP_ID = 'model_settings';
export const MANAGEMENT_APP_PATH = `/ml/${MODEL_SETTINGS_APP_ID}`;

export const PLUGIN_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceEndpointsTitle',
  {
    defaultMessage: 'Inference endpoints',
  }
);

export const MODEL_SETTINGS_PLUGIN_ID = 'searchInferenceEndpointsModelSettings';
export const MODEL_SETTINGS_PLUGIN_NAME = 'Model Settings';
export const MODEL_SETTINGS_PLUGIN_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.modelSettingsTitle',
  {
    defaultMessage: 'Model Settings',
  }
);

export const INFERENCE_ENDPOINTS_QUERY_KEY = 'inferenceEndpointsQueryKey';
export const TRAINED_MODEL_STATS_QUERY_KEY = 'trainedModelStats';
export const MODEL_SETTINGS_FEATURE_FLAG_ID = 'searchModelSettings:modelSettingsEnabled';
