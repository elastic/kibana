/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';

globalSetupHook('Setup environment for Streams API tests', async ({ kbnClient, log }) => {
  log.debug('[setup] Enabling Streams...');

  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/streams/_enable',
    });
    log.debug('[setup] Streams enabled successfully');
  } catch (error) {
    log.debug(`[setup] Streams may already be enabled: ${error}`);
  }
});
