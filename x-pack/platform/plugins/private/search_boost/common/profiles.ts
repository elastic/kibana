/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostProfileBase, BoostProfileType } from './types';

const LABELED_PROFILE_NAME = {
  defaultIndices: 'default_indices',
  dataStreams1d: 'data_streams_1d',
  dataStreams3d: 'data_streams_3d',
  defaultDataStreams7d: 'default_data_streams_7d',
} as const;

/** An Elastic-managed profile with its own label and description. */
export type LabeledProfileName = (typeof LABELED_PROFILE_NAME)[keyof typeof LABELED_PROFILE_NAME];

export const LABELED_PROFILE_NAMES: Readonly<
  Record<BoostProfileType, readonly LabeledProfileName[]>
> = {
  indices: [LABELED_PROFILE_NAME.defaultIndices],
  data_streams: [
    LABELED_PROFILE_NAME.dataStreams1d,
    LABELED_PROFILE_NAME.dataStreams3d,
    LABELED_PROFILE_NAME.defaultDataStreams7d,
  ],
};

/**
 * The labeled profile marked as the default, per type. Indices have none, because the label of
 * their only labeled profile already says "Default".
 */
export const DEFAULT_LABELED_PROFILE_NAMES: Readonly<
  Record<BoostProfileType, LabeledProfileName | undefined>
> = {
  indices: undefined,
  data_streams: LABELED_PROFILE_NAME.defaultDataStreams7d,
};

const ALL_LABELED_PROFILE_NAMES: readonly string[] = Object.values(LABELED_PROFILE_NAME);

export const isLabeledProfileName = (name: string): name is LabeledProfileName =>
  ALL_LABELED_PROFILE_NAMES.includes(name);

/** Whether Elastic manages the profile, so it can't be edited. */
export const isManagedProfile = ({
  is_builtin: isBuiltin,
}: Pick<BoostProfileBase, 'is_builtin'>): boolean => isBuiltin;
