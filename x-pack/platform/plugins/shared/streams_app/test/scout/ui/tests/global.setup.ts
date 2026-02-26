/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';

globalSetupHook('Setup environment for streams tests', async ({ apiServices, log }) => {
  log.debug('[setup] Enabling streams...');
  try {
    await apiServices.streams.enable();
  } catch (error) {
    // Ignore 409 Conflict errors (streams already enabled)
    if (error?.response?.status !== 409) {
      throw error;
    }
    log.debug('[setup] Streams already enabled, continuing...');
  }
});
