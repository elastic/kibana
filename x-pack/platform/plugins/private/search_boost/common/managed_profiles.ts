/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostProfileType } from './types';

const MANAGED_PROFILE_NAME = {
  defaultIndices: 'default_indices',
  dataStreams1d: 'data_streams_1d',
  dataStreams3d: 'data_streams_3d',
  defaultDataStreams7d: 'default_data_streams_7d',
} as const;

export type ManagedProfileName = (typeof MANAGED_PROFILE_NAME)[keyof typeof MANAGED_PROFILE_NAME];

export const MANAGED_PROFILE_NAMES: Readonly<
  Record<BoostProfileType, readonly ManagedProfileName[]>
> = {
  indices: [MANAGED_PROFILE_NAME.defaultIndices],
  data_streams: [
    MANAGED_PROFILE_NAME.dataStreams1d,
    MANAGED_PROFILE_NAME.dataStreams3d,
    MANAGED_PROFILE_NAME.defaultDataStreams7d,
  ],
};

/**
 * The Elastic-managed profile marked as the default, per type. Indices have none, because the
 * label of their only managed profile already says "Default".
 */
export const DEFAULT_MANAGED_PROFILE_NAMES: Readonly<
  Record<BoostProfileType, ManagedProfileName | undefined>
> = {
  indices: undefined,
  data_streams: MANAGED_PROFILE_NAME.defaultDataStreams7d,
};

const ALL_MANAGED_PROFILE_NAMES: readonly string[] = Object.values(MANAGED_PROFILE_NAME);

export const isManagedProfileName = (name: string): name is ManagedProfileName =>
  ALL_MANAGED_PROFILE_NAMES.includes(name);
