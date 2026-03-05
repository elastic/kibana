/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { IUiSettingsClient } from '@kbn/core/public';

export function isExperimentalFeaturesEnabled(uiSettingsClient: IUiSettingsClient) {
  return uiSettingsClient.get(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID, false);
}
