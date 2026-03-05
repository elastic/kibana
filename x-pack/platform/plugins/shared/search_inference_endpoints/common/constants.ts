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
export const MANAGEMENT_APP_PATH = `/ml/${INFERENCE_ENDPOINTS_APP_ID}`;

export const PLUGIN_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceEndpointsTitle',
  {
    defaultMessage: 'Inference endpoints',
  }
);

export const INFERENCE_ENDPOINTS_QUERY_KEY = 'inferenceEndpointsQueryKey';
export const TRAINED_MODEL_STATS_QUERY_KEY = 'trainedModelStats';

export const INFERENCE_SETTINGS_SO_TYPE = 'inference-settings';
export const INFERENCE_SETTINGS_ID = 'default';

export enum ROUTE_VERSIONS {
  v1 = '1',
}
