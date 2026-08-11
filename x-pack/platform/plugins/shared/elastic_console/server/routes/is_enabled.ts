/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { ELASTIC_CONSOLE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { ELASTIC_CONSOLE_ENABLED_FLAG } from '../../common/feature_flags';

export const isElasticConsoleEnabled = async (
  coreStart: CoreStart,
  request: KibanaRequest
): Promise<boolean> => {
  const featureFlagEnabled = await coreStart.featureFlags.getBooleanValue(
    ELASTIC_CONSOLE_ENABLED_FLAG,
    false
  );
  if (!featureFlagEnabled) {
    return false;
  }
  const soClient = coreStart.savedObjects.getScopedClient(request);
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
  return uiSettingsClient.get<boolean>(ELASTIC_CONSOLE_ENABLED_SETTING_ID);
};
