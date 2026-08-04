/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '../../../../common';

globalTeardownHook(
  'Teardown environment for Significant Events API tests',
  async ({ apiServices, log }) => {
    log.debug('[teardown] Reverting significant events availability feature flag...');
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG]: false,
      },
    });

    log.debug('[teardown] Disabling Streams...');
    await apiServices.streams.disable();
  }
);
