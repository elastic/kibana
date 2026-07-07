/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';

globalSetupHook(
  'Setup environment for Significant Events API tests',
  async ({ apiServices, kbnClient, log }) => {
    log.debug('[setup] Enabling Streams...');
    await apiServices.streams.enable();
    log.debug('[setup] Streams enabled successfully');

    log.debug('[setup] Enabling significant events feature...');
    try {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
      });
      log.debug('[setup] Significant events feature enabled successfully');
    } catch (error) {
      log.error(`[setup] Failed to enable significant events: ${error}`);
      throw error;
    }
  }
);
