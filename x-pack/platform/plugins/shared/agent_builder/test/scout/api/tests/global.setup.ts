/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { globalSetupHook } from '@kbn/scout';

globalSetupHook('Setup environment for Agent Builder API tests', async ({ kbnClient, log }) => {
  log.debug('[setup] Enabling Agent Builder experimental features...');
  await kbnClient.uiSettings.update({
    [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
  });
  log.debug('[setup] Agent Builder experimental features enabled successfully');
});
