/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BOOST } from './constants';
import type {
  BoostPeriod,
  BoostProfile,
  BoostProfileType,
  BoostRule,
  BoostSettings,
  CustomDefaults,
  DataStreamsBoostProfile,
  DefaultRuleProfiles,
  DataStreamsWindowId,
  IndicesPresetId,
  SimpleModeDefaults,
} from './types';

export const BUILTIN_INDICES_PROFILE_NAMES: Readonly<Record<IndicesPresetId, string>> = {
  on_demand: 'elastic-on-demand',
  performant: 'elastic-performant',
  high_availability: 'elastic-high-availability',
};

export const BUILTIN_DATA_STREAMS_PROFILE_NAMES: Readonly<Record<DataStreamsWindowId, string>> = {
  last_1_day: 'elastic-last-1-day',
  last_3_days: 'elastic-last-3-days',
  last_7_days: 'elastic-last-7-days',
};

export const DEFAULT_INDICES_RULE_NAME = 'elastic-default-indices';
export const DEFAULT_DATA_STREAMS_RULE_NAME = 'elastic-default-data-streams';

export const DEFAULT_SIMPLE_MODE_DEFAULTS: SimpleModeDefaults = {
  indices: 'performant',
  data_streams: { window: 'last_7_days' },
};

export const NO_CUSTOM_DEFAULTS: CustomDefaults = {
  indices_profile: null,
  data_streams_profile: null,
};

const createWindowPeriods = (
  maxAge: string
): Pick<DataStreamsBoostProfile, 'recent' | 'standard' | 'background'> => {
  const boostedPeriod: BoostPeriod = { min_boost: 1, max_boost: MAX_BOOST, max_age: maxAge };

  return {
    recent: boostedPeriod,
    standard: boostedPeriod,
    background: { min_boost: 1, max_boost: MAX_BOOST },
  };
};

// Boost values are placeholders pending pricing review. Indices presets follow the ES3 Search Power
// cutover mapping, capped at the API maximum; data stream windows (1, 3, or 7 days) are also subject
// to change.
export const BUILTIN_PROFILES: readonly BoostProfile[] = [
  {
    name: BUILTIN_INDICES_PROFILE_NAMES.on_demand,
    type: 'indices',
    is_builtin: true,
    min_boost: 0.28,
    max_boost: 1,
    high_availability: 'none',
    prewarm: false,
    pinned: false,
  },
  {
    name: BUILTIN_INDICES_PROFILE_NAMES.performant,
    type: 'indices',
    is_builtin: true,
    min_boost: 1,
    max_boost: MAX_BOOST,
    high_availability: 'none',
    prewarm: false,
    pinned: false,
  },
  {
    name: BUILTIN_INDICES_PROFILE_NAMES.high_availability,
    type: 'indices',
    is_builtin: true,
    min_boost: 2.5,
    max_boost: MAX_BOOST,
    high_availability: 'one_extra_copy',
    prewarm: true,
    pinned: true,
  },
  {
    name: BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_1_day,
    type: 'data_streams',
    is_builtin: true,
    ...createWindowPeriods('1d'),
  },
  {
    name: BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_3_days,
    type: 'data_streams',
    is_builtin: true,
    ...createWindowPeriods('3d'),
  },
  {
    name: BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_7_days,
    type: 'data_streams',
    is_builtin: true,
    ...createWindowPeriods('7d'),
  },
];

/** Translates simple-mode defaults into the profiles referenced by the two default rules. */
export const translateSimpleDefaults = ({
  indices,
  data_streams: dataStreams,
}: SimpleModeDefaults): DefaultRuleProfiles => ({
  indices_profile: BUILTIN_INDICES_PROFILE_NAMES[indices],
  data_streams_profile: BUILTIN_DATA_STREAMS_PROFILE_NAMES[dataStreams.window],
});

/** Returns the profiles the default rules reference in the current mode. */
export const getEffectiveDefaults = ({
  mode,
  simple,
  custom_defaults: customDefaults,
}: BoostSettings): DefaultRuleProfiles => {
  const synced = translateSimpleDefaults(simple);
  if (mode === 'simple') {
    return synced;
  }

  return {
    indices_profile: customDefaults.indices_profile ?? synced.indices_profile,
    data_streams_profile: customDefaults.data_streams_profile ?? synced.data_streams_profile,
  };
};

const findPresetId = <TId extends string>(
  profileNames: Readonly<Record<TId, string>>,
  profileName: string
): TId | undefined =>
  (Object.keys(profileNames) as TId[]).find((id) => profileNames[id] === profileName);

/**
 * Points a default rule at a profile. An Elastic-managed profile selects the matching simple-mode
 * option, keeping both modes in sync; a custom profile stops syncing that type until a managed
 * profile is chosen again.
 */
export const setDefaultRuleProfile = (
  settings: BoostSettings,
  type: BoostProfileType,
  profileName: string
): BoostSettings => {
  const { simple, custom_defaults: customDefaults } = settings;

  if (type === 'indices') {
    const preset = findPresetId(BUILTIN_INDICES_PROFILE_NAMES, profileName);
    return {
      ...settings,
      simple: preset ? { ...simple, indices: preset } : simple,
      custom_defaults: { ...customDefaults, indices_profile: preset ? null : profileName },
    };
  }

  const window = findPresetId(BUILTIN_DATA_STREAMS_PROFILE_NAMES, profileName);
  return {
    ...settings,
    simple: window ? { ...simple, data_streams: { window } } : simple,
    custom_defaults: { ...customDefaults, data_streams_profile: window ? null : profileName },
  };
};

export const createDefaultRules = ({
  indices_profile: indicesProfile,
  data_streams_profile: dataStreamsProfile,
}: DefaultRuleProfiles): BoostRule[] => [
  {
    name: DEFAULT_INDICES_RULE_NAME,
    index_patterns: ['*'],
    boost_profile: indicesProfile,
    priority: 0,
    is_builtin: true,
  },
  {
    name: DEFAULT_DATA_STREAMS_RULE_NAME,
    index_patterns: ['*'],
    boost_profile: dataStreamsProfile,
    priority: 0,
    is_builtin: true,
  },
];
