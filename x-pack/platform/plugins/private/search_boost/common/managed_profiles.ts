/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostProfileType } from './types';

const MANAGED_PROFILE_NAMES = {
  indices: ['default_indices'],
  data_streams: ['data_streams_1d', 'data_streams_3d', 'default_data_streams_7d'],
} as const satisfies Readonly<Record<BoostProfileType, readonly string[]>>;

export type ManagedProfileName = (typeof MANAGED_PROFILE_NAMES)[BoostProfileType][number];

const ALL_MANAGED_PROFILE_NAMES: readonly string[] = Object.values(MANAGED_PROFILE_NAMES).flat();

export const isManagedProfileName = (name: string): name is ManagedProfileName =>
  ALL_MANAGED_PROFILE_NAMES.includes(name);
