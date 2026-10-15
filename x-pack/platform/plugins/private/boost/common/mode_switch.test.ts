/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getModeSwitchChanges } from './mode_switch';
import {
  BUILTIN_DATA_STREAMS_PROFILE_NAMES,
  BUILTIN_INDICES_PROFILE_NAMES,
  BUILTIN_PROFILES,
  DEFAULT_DATA_STREAMS_RULE_NAME,
  DEFAULT_SIMPLE_MODE_DEFAULTS,
  NO_CUSTOM_DEFAULTS,
  createDefaultRules,
  getEffectiveDefaults,
} from './presets';
import type { BoostProfile, BoostRule, BoostSettings, BoostState } from './types';

const [builtinIndicesProfile] = BUILTIN_PROFILES.filter(({ type }) => type === 'indices');
const [builtinDataStreamsProfile] = BUILTIN_PROFILES.filter(({ type }) => type === 'data_streams');
const customProfiles: BoostProfile[] = [
  { ...builtinIndicesProfile, name: 'catalog-search', is_builtin: false },
  { ...builtinDataStreamsProfile, name: 'clickstream', is_builtin: false },
];

const customRule = (name: string, pattern: string, profileName: string): BoostRule => ({
  name,
  index_patterns: [pattern],
  boost_profile: profileName,
  priority: 1,
  is_builtin: false,
});

const customRules = [
  customRule('catalogs', 'catalog-*', 'catalog-search'),
  // Uses the profile simple mode gives indices anyway, so suspending it changes nothing.
  customRule('products', 'products', BUILTIN_INDICES_PROFILE_NAMES.performant),
  customRule('nothing', 'nothing-*', 'catalog-search'),
];

const createState = (
  mode: BoostSettings['mode'],
  customDefaults: BoostSettings['custom_defaults']
): BoostState => {
  const settings: BoostSettings = {
    mode,
    simple: DEFAULT_SIMPLE_MODE_DEFAULTS,
    custom_defaults: customDefaults,
  };
  const defaultRules = createDefaultRules(getEffectiveDefaults(settings));
  return {
    settings,
    profiles: [...BUILTIN_PROFILES, ...customProfiles],
    rules: mode === 'advanced' ? [...customRules, ...defaultRules] : defaultRules,
    suspended_rules: mode === 'advanced' ? [] : customRules,
    data_sources: [
      { name: 'products', type: 'index', size_in_bytes: 1e9 },
      { name: 'catalog-fall', type: 'index', size_in_bytes: 1e9 },
      { name: 'logs-app', type: 'data_stream', size_in_bytes: 1e9 },
    ],
  };
};

const customDataStreamsDefault = { ...NO_CUSTOM_DEFAULTS, data_streams_profile: 'clickstream' };

const summarize = (state: BoostState, mode: BoostSettings['mode']) =>
  getModeSwitchChanges(state, mode).map(({ rule, changes }) => ({ rule: rule.name, changes }));

describe('getModeSwitchChanges', () => {
  it('lists what suspending custom rules and custom default profiles changes', () => {
    expect(summarize(createState('advanced', customDataStreamsDefault), 'simple')).toEqual([
      {
        rule: 'catalogs',
        changes: [
          {
            name: 'catalog-fall',
            type: 'indices',
            from: 'catalog-search',
            to: BUILTIN_INDICES_PROFILE_NAMES.performant,
          },
        ],
      },
      {
        rule: DEFAULT_DATA_STREAMS_RULE_NAME,
        changes: [
          {
            name: 'logs-app',
            type: 'data_streams',
            from: 'clickstream',
            to: BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_7_days,
          },
        ],
      },
    ]);
  });

  it('lists what restoring them changes', () => {
    expect(summarize(createState('simple', customDataStreamsDefault), 'advanced')).toEqual([
      {
        rule: 'catalogs',
        changes: [
          {
            name: 'catalog-fall',
            type: 'indices',
            from: BUILTIN_INDICES_PROFILE_NAMES.performant,
            to: 'catalog-search',
          },
        ],
      },
      {
        rule: DEFAULT_DATA_STREAMS_RULE_NAME,
        changes: [
          {
            name: 'logs-app',
            type: 'data_streams',
            from: BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_7_days,
            to: 'clickstream',
          },
        ],
      },
    ]);
  });

  it('finds nothing when no index or data stream would change profile', () => {
    const state = createState('advanced', NO_CUSTOM_DEFAULTS);
    const unchanged = {
      ...state,
      rules: state.rules.filter(({ name }) => name !== 'catalogs'),
    };

    expect(getModeSwitchChanges(unchanged, 'simple')).toEqual([]);
  });
});
