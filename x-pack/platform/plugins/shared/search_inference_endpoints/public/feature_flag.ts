/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import {
  ELASTIC_INFERENCE_SERVICE_FEATURE_FLAG_ID,
  MODEL_SETTINGS_FEATURE_FLAG_ID,
} from '../common/constants';

export function isModelSettingsEnabled(uiSettings: IUiSettingsClient): boolean {
  return uiSettings.get<boolean>(MODEL_SETTINGS_FEATURE_FLAG_ID, false);
}

export function isElasticInferenceServiceEnabled(uiSettings: IUiSettingsClient): boolean {
  return uiSettings.get<boolean>(ELASTIC_INFERENCE_SERVICE_FEATURE_FLAG_ID, false);
}
