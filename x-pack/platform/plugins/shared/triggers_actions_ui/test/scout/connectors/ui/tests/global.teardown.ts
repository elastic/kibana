/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook, tags } from '@kbn/scout';
import { resetAlertingV2Enabled } from '../../../common/ui/fixtures/alerting_v2_setting';

globalTeardownHook(
  'Restore the default alerting v2 setting',
  { tag: tags.stateful.classic },
  async ({ kbnClient, log }) => {
    log.debug('[teardown] restoring the default alerting v2 setting');
    await resetAlertingV2Enabled(kbnClient);
  }
);
