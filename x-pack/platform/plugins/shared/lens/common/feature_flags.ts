/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart as FeatureFlagsStartPublic } from '@kbn/core/public';
import type { FeatureFlagsStart as FeatureFlagsStartServer } from '@kbn/core/server';

type GetFlagTypes<T extends Record<string, LensFeatureFlag>> = {
  [k in keyof T]: T[k]['fallback'];
};

interface FeatureFlagBase {
  /**
   * Unique flag id staring with `lens.` (i.e. `lens.apiFormat`)
   */
  id: string;
}

type BooleanFeatureFlag = FeatureFlagBase & {
  type: 'boolean';
  fallback: boolean;
};
type NumberFeatureFlag = FeatureFlagBase & {
  type: 'number';
  fallback: number;
};
type StringFeatureFlag = FeatureFlagBase & {
  type: 'string';
  fallback: string;
};

export type LensFeatureFlag = BooleanFeatureFlag | NumberFeatureFlag | StringFeatureFlag;

export const lensFeatureFlags = {
  /**
   * Enables transforming lens state to/from new API Format over the wire.
   */
  apiFormat: {
    id: 'lens.apiFormat',
    type: 'boolean',
    fallback: false,
  },
} satisfies Record<string, LensFeatureFlag>;

export type LensFeatureFlags = GetFlagTypes<typeof lensFeatureFlags>;

export async function fetchLensFeatureFlags(
  service: FeatureFlagsStartPublic | FeatureFlagsStartServer
): Promise<LensFeatureFlags> {
  const fetchFeatureFlag = fetchFeatureFlagFn(service);

  const flags = await Promise.all(
    Object.entries(lensFeatureFlags).map(async ([key, flag]) => {
      const value = await fetchFeatureFlag(flag);
      return [key, value];
    })
  );

  return Object.fromEntries(flags) as LensFeatureFlags;
}

function fetchFeatureFlagFn(service: FeatureFlagsStartPublic | FeatureFlagsStartServer) {
  return async function fetchFeatureFlag(flag: LensFeatureFlag) {
    switch (flag.type) {
      case 'boolean':
        return service.getBooleanValue(flag.id, flag.fallback);
      case 'number':
        return service.getNumberValue(flag.id, flag.fallback);
      case 'string':
        return service.getStringValue(flag.id, flag.fallback);
      default:
        throw new Error('unsupported flag type');
    }
  };
}

export function getLensFeatureFlagDefaults(): LensFeatureFlags {
  return Object.entries(lensFeatureFlags).reduce((acc, [k, flag]) => {
    const key = k as keyof typeof lensFeatureFlags;
    acc[key] = flag.fallback;
    return acc;
  }, {} as LensFeatureFlags);
}
