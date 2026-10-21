/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

const ALERTING_V2_ENABLED_SETTING_ID = 'alerting:v2:enabled';

/*
 * `alerting:v2:enabled` is a global advanced setting that defaults to on. Serverless disables the
 * public `/api/kibana/global_settings` API, so write through `updateGlobal` and the internal route,
 * which exist on stateful and serverless.
 */
const ALERTING_V2_ENABLED_INTERNAL_PATH = `/internal/kibana/global_settings/${encodeURIComponent(
  ALERTING_V2_ENABLED_SETTING_ID
)}`;

export const setAlertingV2Enabled = async (kbnClient: KbnClient, enabled: boolean) => {
  await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: enabled });
  await kbnClient.uiSettings.waitForEventualCacheRefresh();
};

/** Deleting the user value restores the registered default, which is on. */
export const resetAlertingV2Enabled = async (kbnClient: KbnClient) => {
  await kbnClient.request({
    description: `unset ${ALERTING_V2_ENABLED_SETTING_ID}`,
    path: ALERTING_V2_ENABLED_INTERNAL_PATH,
    method: 'DELETE',
    ignoreErrors: [404],
  });
  await kbnClient.uiSettings.waitForEventualCacheRefresh();
};
