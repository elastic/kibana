/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import type { IUiSettingsClient } from '@kbn/core/public';

export function isPreExecutionWorkflowEnabled(uiSettingsClient: IUiSettingsClient) {
  const workflowsUiEnabled = uiSettingsClient.get(WORKFLOWS_UI_SETTING_ID, false);
  const experimentalFeaturesEnabled = uiSettingsClient.get(
    AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
    false
  );

  return workflowsUiEnabled && experimentalFeaturesEnabled;
}
