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

export const EXTERNAL_INFERENCE_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.externalInferenceTitle',
  {
    defaultMessage: 'External Inference',
  }
);

export const MODEL_SETTINGS_SECTION_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.modelSettingsTitle',
  {
    defaultMessage: 'Model Settings',
  }
);

export const ELASTIC_INFERENCE_SERVICE_APP_ID = 'elastic_inference_service';

export const ELASTIC_INFERENCE_SERVICE_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.elasticInferenceServiceTitle',
  {
    defaultMessage: 'Elastic Inference Service',
  }
);

export const INFERENCE_ENDPOINTS_QUERY_KEY = 'inferenceEndpointsQueryKey';
export const INFERENCE_FEATURES_QUERY_KEY = 'inferenceFeaturesQueryKey';
export const TRAINED_MODEL_STATS_QUERY_KEY = 'trainedModelStats';
export const INFERENCE_SETTINGS_QUERY_KEY = 'inferenceSettingsQueryKey';
export const MODEL_SETTINGS_FEATURE_FLAG_ID = 'searchInferenceEndpoints:modelSettingsEnabled';
export const ELASTIC_INFERENCE_SERVICE_FEATURE_FLAG_ID =
  'searchInferenceEndpoints:elasticInferenceServiceEnabled';

export const INFERENCE_SETTINGS_SO_TYPE = 'inference-settings';
export const INFERENCE_SETTINGS_NAMESPACE_TYPE = 'single';
export const INFERENCE_SETTINGS_ID = 'default';

export enum ROUTE_VERSIONS {
  v1 = '1',
}

export const DYNAMIC_CONNECTORS_POLLING_START_DELAY = 5000; // 5 seconds
