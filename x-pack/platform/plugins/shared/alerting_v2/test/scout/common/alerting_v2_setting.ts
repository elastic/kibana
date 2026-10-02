/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';
import type { KbnClient } from '@kbn/scout';

/**
 * Internal route: serverless disables the public `/api/kibana/global_settings`
 * API (`uiSettings.publicApiEnabled` defaults to false).
 */
const GLOBAL_SETTINGS_PATH = `/internal/kibana/global_settings/${encodeURIComponent(
  ALERTING_V2_ENABLED_SETTING_ID
)}`;

/**
 * Turns on the `alerting:v2:enabled` global setting, without which every alerting_v2 route returns 503.
 */
export const enableAlertingV2Setting = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: true });
  // Multi-node deployments serve uiSettings from a per-node cache.
  await kbnClient.uiSettings.waitForEventualCacheRefresh();
};

/**
 * Removes the user value of `alerting:v2:enabled`; a no-op when none is set.
 */
export const unsetAlertingV2Setting = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    description: `unset ${ALERTING_V2_ENABLED_SETTING_ID}`,
    path: GLOBAL_SETTINGS_PATH,
    method: 'DELETE',
  });
};
