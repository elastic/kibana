/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailabilityConfig } from '@kbn/agent-builder-server/availability';
import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/alerting-v2-constants';

/**
 * Shared space-scoped availability gate for the `rule-management` and
 * `action-policy-management` skills: both require Alerting V2 experimental
 * features to be enabled for the current space.
 */
export const alertingV2ExperimentalAvailability: AvailabilityConfig = {
  cacheMode: 'none',
  handler: async ({ uiSettings }) =>
    (await uiSettings.get<boolean>(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID))
      ? { status: 'available' }
      : { status: 'unavailable' },
};
