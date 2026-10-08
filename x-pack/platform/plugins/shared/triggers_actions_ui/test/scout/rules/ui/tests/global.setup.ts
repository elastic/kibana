/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout';
import { setAlertingV2Enabled } from '../../../common/ui/fixtures/alerting_v2_setting';

globalSetupHook(
  'Disable alerting v2 for the classic Rules page',
  { tag: tags.stateful.classic },
  async ({ kbnClient, log }) => {
    log.debug('[setup] disabling alerting v2');
    await setAlertingV2Enabled(kbnClient, false);
  }
);
