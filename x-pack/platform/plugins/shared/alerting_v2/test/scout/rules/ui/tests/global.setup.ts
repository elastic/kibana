/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout';
import { enableAlertingV2Setting } from '../../../common/settings';

globalSetupHook(
  'Enable alerting:v2:enabled',
  { tag: tags.deploymentAgnostic },
  async ({ kbnClient, log }) => {
    log.debug('[setup] enabling alerting:v2:enabled');
    await enableAlertingV2Setting(kbnClient);
  }
);
