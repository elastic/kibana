/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';

import type { LensFeatureFlags } from '../common';
import { fetchLensFeatureFlags, getLensFeatureFlagDefaults } from '../common';

const [getFeatureFlags, setFeatureFlags] = createGetterSetter<LensFeatureFlags>(
  'LensFeatureFlags',
  false
);

/**
 * Retrieves all Lens features flags
 *
 * Does not support dynamic changes to flag values
 */
export function getLensFeatureFlags(): LensFeatureFlags {
  const flags = getFeatureFlags();
  if (flags) return flags;
  return getLensFeatureFlagDefaults();
}

export async function setLensFeatureFlags(service: FeatureFlagsStart): Promise<LensFeatureFlags> {
  const flags = await fetchLensFeatureFlags(service);
  setFeatureFlags(flags);
  return flags;
}
