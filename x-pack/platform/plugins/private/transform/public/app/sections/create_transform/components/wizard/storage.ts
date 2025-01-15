/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FrozenTierPreference } from '@kbn/ml-date-picker';

export const TRANSFORM_FROZEN_TIER_PREFERENCE = 'transform.frozenDataTierPreference';

export type Transform = Partial<{
  [TRANSFORM_FROZEN_TIER_PREFERENCE]: FrozenTierPreference;
}> | null;

export type TransformKey = keyof Exclude<Transform, null>;

export type TransformStorageMapped<T extends TransformKey> =
  T extends typeof TRANSFORM_FROZEN_TIER_PREFERENCE ? FrozenTierPreference | undefined : null;

export const TRANSFORM_STORAGE_KEYS = [TRANSFORM_FROZEN_TIER_PREFERENCE] as const;
