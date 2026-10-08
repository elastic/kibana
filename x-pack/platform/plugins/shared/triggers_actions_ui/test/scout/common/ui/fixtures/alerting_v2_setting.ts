/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

/*
 * `alerting:v2:enabled` is a global advanced setting that defaults to on. Write it through the
 * global-settings endpoint, because the regular `uiSettings` fixture writes to the per-space store.
 */
const ALERTING_V2_ENABLED_GLOBAL_SETTING_PATH = '/api/kibana/global_settings/alerting:v2:enabled';

export const setAlertingV2Enabled = (kbnClient: KbnClient, enabled: boolean) =>
  kbnClient.request({
    method: 'POST',
    path: ALERTING_V2_ENABLED_GLOBAL_SETTING_PATH,
    headers: { 'kbn-xsrf': 'scout' },
    body: { value: enabled },
  });
