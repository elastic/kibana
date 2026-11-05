/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout';
import { setAlertingV2Enabled } from '../../../common/ui/fixtures/alerting_v2_setting';

// Keeps the classic Rules and Logs heading tabs, which hide when alerting v2 is on.
// In serverless the alerting v2 plugin is disabled via config (non-observability projects),
// so the classic tabs are already the default and the `alerting:v2:enabled` setting is not
// registered there; writing it would fail. Global setup runs as a Playwright project
// dependency regardless of the deployment grep, so guard on the deployment at runtime.
globalSetupHook(
  'Disable alerting v2',
  { tag: tags.stateful.classic },
  async ({ kbnClient, config, log }) => {
    if (config.serverless) {
      log.debug('[setup] alerting v2 is disabled via config in serverless; skipping');
      return;
    }
    log.debug('[setup] disabling alerting v2');
    await setAlertingV2Enabled(kbnClient, false);
  }
);
