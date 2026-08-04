/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '../../../../common';

globalSetupHook(
  'Setup environment for Significant Events API tests',
  async ({ apiServices, log }) => {
    log.debug('[setup] Enabling Streams...');
    await apiServices.streams.enable();
    log.debug('[setup] Streams enabled successfully');

    // Significant events is gated behind the streams.significantEventsAvailable feature flag, which
    // falls back to false. Force it on as the sole availability gate for the API tests.
    log.debug('[setup] Enabling significant events availability feature flag...');
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG]: true,
      },
    });
    log.debug('[setup] Significant events availability feature flag enabled successfully');
  }
);
