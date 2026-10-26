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
  DataStreamsBoostProfile,
  DefaultRuleProfiles,
  DataStreamsWindowId,
  IndicesPresetId,
} from './types';

// Built-in names start with `_`, which Elasticsearch reserves for them: custom profile and rule
// names can't.
export const BUILTIN_INDICES_PROFILE_NAMES: Readonly<Record<IndicesPresetId, string>> = {
  on_demand: '_on-demand',
  performant: '_performant',
  high_availability: '_high-availability',
};

export const BUILTIN_DATA_STREAMS_PROFILE_NAMES: Readonly<Record<DataStreamsWindowId, string>> = {
  last_1_day: '_last-1-day',
  last_3_days: '_last-3-days',
  last_7_days: '_last-7-days',
};

export const DEFAULT_INDICES_RULE_NAME = '_default-indices';
export const DEFAULT_DATA_STREAMS_RULE_NAME = '_default-data-streams';

/**
 * Below any custom rule's priority, since custom rules can't go below 0. Elasticsearch ranks its
 * platform default rules the same way, so they never tie with a custom rule.
 */
export const DEFAULT_RULE_PRIORITY = -1;

/** The default rule for each profile type, which applies to whatever no other rule matches. */
export const DEFAULT_RULE_NAMES: Readonly<Record<BoostProfileType, string>> = {
  indices: DEFAULT_INDICES_RULE_NAME,
  data_streams: DEFAULT_DATA_STREAMS_RULE_NAME,
};

/** The project's defaults out of the box: Performant indices and the last 7 days of data streams. */
export const DEFAULT_RULE_PROFILES: DefaultRuleProfiles = {
  indices_profile: BUILTIN_INDICES_PROFILE_NAMES.performant,
  data_streams_profile: BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_7_days,
};

/** Where each type's default profile is kept. */
export const DEFAULT_PROFILE_KEYS: Readonly<Record<BoostProfileType, keyof DefaultRuleProfiles>> = {
  indices: 'indices_profile',
  data_streams: 'data_streams_profile',
};

/**
 * A window's periods: Recent for the first day, Standard up to the window's end, and Background for
 * the rest. A 1-day window has no Standard period, since it ends where Recent does.
 */
const createWindowPeriods = (
  windowMaxAge: string
): Pick<DataStreamsBoostProfile, 'recent' | 'standard' | 'background'> => {
  const boost: BoostPeriod = { min_boost: 1, max_boost: MAX_BOOST };

  return {
    recent: { ...boost, max_age: '1d' },
    standard: { ...boost, max_age: windowMaxAge },
    background: boost,
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

/** The profile type a default rule applies to, or undefined for a custom rule. */
export const getDefaultRuleType = (ruleName: string): BoostProfileType | undefined =>
  (Object.keys(DEFAULT_RULE_NAMES) as BoostProfileType[]).find(
    (type) => DEFAULT_RULE_NAMES[type] === ruleName
  );

export const createDefaultRules = ({
  indices_profile: indicesProfile,
  data_streams_profile: dataStreamsProfile,
}: DefaultRuleProfiles): BoostRule[] => [
  {
    name: DEFAULT_INDICES_RULE_NAME,
    index_patterns: ['*'],
    boost_profile: indicesProfile,
    priority: DEFAULT_RULE_PRIORITY,
    is_builtin: true,
  },
  {
    name: DEFAULT_DATA_STREAMS_RULE_NAME,
    index_patterns: ['*'],
    boost_profile: dataStreamsProfile,
    priority: DEFAULT_RULE_PRIORITY,
    is_builtin: true,
  },
];
