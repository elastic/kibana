/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/server';
import type { ToolAvailabilityConfig } from '@kbn/agent-builder-server';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';

/**
 * Hides a tool from agents, and blocks running it, unless the `nightshift.enabled` flag is on.
 */
export const createNightshiftEnabledAvailability = (
  getFeatureFlags: () => FeatureFlagsStart | undefined
): ToolAvailabilityConfig => ({
  cacheMode: 'global',
  handler: async () =>
    (await getFeatureFlags()?.getBooleanValue(NIGHTSHIFT_ENABLED_FLAG, false))
      ? { status: 'available' }
      : { status: 'unavailable', reason: 'Nightshift is not enabled.' },
});
