/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BUILTIN_DATA_STREAMS_PROFILE_NAMES,
  BUILTIN_INDICES_PROFILE_NAMES,
  BUILTIN_PROFILES,
  DEFAULT_SIMPLE_MODE_DEFAULTS,
  NO_CUSTOM_DEFAULTS,
  createDefaultRules,
  getEffectiveDefaults,
  setDefaultRuleProfile,
  translateSimpleDefaults,
} from './presets';
import type { BoostSettings } from './types';

const simpleSettings: BoostSettings = {
  mode: 'simple',
  simple: DEFAULT_SIMPLE_MODE_DEFAULTS,
  custom_defaults: NO_CUSTOM_DEFAULTS,
};

const advancedSettings: BoostSettings = { ...simpleSettings, mode: 'advanced' };

describe('translateSimpleDefaults', () => {
  it('maps the out-of-the-box defaults to built-in profiles', () => {
    expect(translateSimpleDefaults(DEFAULT_SIMPLE_MODE_DEFAULTS)).toEqual({
      indices_profile: 'elastic-performant',
      data_streams_profile: 'elastic-last-7-days',
    });
  });

  it('maps every data stream window to its own built-in profile', () => {
    expect(
      translateSimpleDefaults({ indices: 'on_demand', data_streams: { window: 'last_3_days' } })
    ).toEqual({
      indices_profile: 'elastic-on-demand',
      data_streams_profile: 'elastic-last-3-days',
    });
  });
});

describe('BUILTIN_PROFILES', () => {
  it('includes one built-in profile for every simple-mode option', () => {
    const builtinNames = BUILTIN_PROFILES.map(({ name }) => name);

    expect(builtinNames).toEqual(
      expect.arrayContaining([
        ...Object.values(BUILTIN_INDICES_PROFILE_NAMES),
        ...Object.values(BUILTIN_DATA_STREAMS_PROFILE_NAMES),
      ])
    );
  });
});

describe('getEffectiveDefaults', () => {
  const customDefaults = { indices_profile: 'my-indices', data_streams_profile: null };

  it('syncs advanced mode with simple mode while the default rules use managed profiles', () => {
    expect(getEffectiveDefaults(advancedSettings)).toEqual(getEffectiveDefaults(simpleSettings));
  });

  it('uses a custom default in advanced mode, and keeps syncing the other type', () => {
    expect(
      getEffectiveDefaults({
        ...advancedSettings,
        simple: { indices: 'on_demand', data_streams: { window: 'last_1_day' } },
        custom_defaults: customDefaults,
      })
    ).toEqual({
      indices_profile: 'my-indices',
      data_streams_profile: 'elastic-last-1-day',
    });
  });

  it('suspends custom defaults in simple mode', () => {
    expect(getEffectiveDefaults({ ...simpleSettings, custom_defaults: customDefaults })).toEqual({
      indices_profile: 'elastic-performant',
      data_streams_profile: 'elastic-last-7-days',
    });
  });
});

describe('setDefaultRuleProfile', () => {
  it('selects the matching simple-mode option for a managed profile', () => {
    const settings = setDefaultRuleProfile(advancedSettings, 'data_streams', 'elastic-last-3-days');

    expect(settings.simple.data_streams.window).toBe('last_3_days');
    expect(settings.custom_defaults).toEqual(NO_CUSTOM_DEFAULTS);
  });

  it('stops syncing a type when its default rule uses a custom profile', () => {
    const settings = setDefaultRuleProfile(advancedSettings, 'indices', 'my-indices');

    expect(settings.simple).toEqual(DEFAULT_SIMPLE_MODE_DEFAULTS);
    expect(settings.custom_defaults).toEqual({
      indices_profile: 'my-indices',
      data_streams_profile: null,
    });
  });

  it('resumes syncing when the default rule uses a managed profile again', () => {
    const custom = setDefaultRuleProfile(advancedSettings, 'indices', 'my-indices');
    const managed = setDefaultRuleProfile(custom, 'indices', 'elastic-high-availability');

    expect(managed.simple.indices).toBe('high_availability');
    expect(managed.custom_defaults).toEqual(NO_CUSTOM_DEFAULTS);
    expect(getEffectiveDefaults(managed).indices_profile).toBe('elastic-high-availability');
  });
});

describe('createDefaultRules', () => {
  it('creates one locked `*` rule per profile type', () => {
    const rules = createDefaultRules(translateSimpleDefaults(DEFAULT_SIMPLE_MODE_DEFAULTS));

    expect(rules.map(({ index_patterns: patterns, priority }) => [patterns, priority])).toEqual([
      [['*'], 0],
      [['*'], 0],
    ]);
  });
});
