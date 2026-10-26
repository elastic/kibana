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
  DEFAULT_DATA_STREAMS_RULE_NAME,
  DEFAULT_INDICES_RULE_NAME,
  DEFAULT_RULE_PROFILES,
  createDefaultRules,
  getDefaultRuleType,
} from './presets';

describe('DEFAULT_RULE_PROFILES', () => {
  it('starts the project on Performant indices and the last 7 days of data streams', () => {
    expect(DEFAULT_RULE_PROFILES).toEqual({
      indices_profile: '_performant',
      data_streams_profile: '_last-7-days',
    });
  });
});

describe('BUILTIN_PROFILES', () => {
  it('includes one built-in profile for every preset', () => {
    const builtinNames = BUILTIN_PROFILES.map(({ name }) => name);

    expect(builtinNames).toEqual(
      expect.arrayContaining([
        ...Object.values(BUILTIN_INDICES_PROFILE_NAMES),
        ...Object.values(BUILTIN_DATA_STREAMS_PROFILE_NAMES),
      ])
    );
  });
});

describe('getDefaultRuleType', () => {
  it("names each default rule's type, and no custom rule's", () => {
    expect(getDefaultRuleType(DEFAULT_INDICES_RULE_NAME)).toBe('indices');
    expect(getDefaultRuleType(DEFAULT_DATA_STREAMS_RULE_NAME)).toBe('data_streams');
    expect(getDefaultRuleType('catalogs')).toBeUndefined();
  });
});

describe('createDefaultRules', () => {
  it('creates one locked `*` rule per profile type below any custom rule, with its project default', () => {
    const rules = createDefaultRules(DEFAULT_RULE_PROFILES);

    expect(
      rules.map(({ name, index_patterns: patterns, priority, boost_profile: profile }) => [
        name,
        patterns,
        priority,
        profile,
      ])
    ).toEqual([
      [DEFAULT_INDICES_RULE_NAME, ['*'], -1, '_performant'],
      [DEFAULT_DATA_STREAMS_RULE_NAME, ['*'], -1, '_last-7-days'],
    ]);
  });
});
