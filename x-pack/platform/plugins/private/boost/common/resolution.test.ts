/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BUILTIN_PROFILES,
  DEFAULT_SIMPLE_MODE_DEFAULTS,
  createDefaultRules,
  translateSimpleDefaults,
} from './presets';
import {
  countDataSourcesByProfile,
  countRulesByProfile,
  getRuleCoverage,
  matchesIndexPattern,
  resolveRule,
  sortRules,
} from './resolution';
import type { BoostDataSource, BoostProfile, BoostRule } from './types';

const customIndicesProfile: BoostProfile = {
  name: 'products-fast',
  type: 'indices',
  is_builtin: false,
  min_boost: 2,
  max_boost: 5000,
  high_availability: 'none',
  prewarm: true,
  pinned: true,
};

const profiles = [...BUILTIN_PROFILES, customIndicesProfile];
const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
const defaultRules = createDefaultRules(translateSimpleDefaults(DEFAULT_SIMPLE_MODE_DEFAULTS));

const rule = (name: string, pattern: string, priority = 0): BoostRule => ({
  name,
  index_pattern: pattern,
  boost_profile: 'products-fast',
  priority,
  is_builtin: false,
});

const index = (name: string): BoostDataSource => ({ name, type: 'index' });
const dataStream = (name: string): BoostDataSource => ({ name, type: 'data_stream' });

describe('matchesIndexPattern', () => {
  it('matches exact names and `*` wildcards', () => {
    expect(matchesIndexPattern('products', 'products')).toBe(true);
    expect(matchesIndexPattern('products', 'products-2')).toBe(false);
    expect(matchesIndexPattern('archive-*', 'archive-2024')).toBe(true);
    expect(matchesIndexPattern('*', 'anything')).toBe(true);
  });

  it('treats other characters literally', () => {
    expect(matchesIndexPattern('logs.app', 'logsXapp')).toBe(false);
  });
});

describe('resolveRule', () => {
  it('falls back to the default rule for the data source type', () => {
    expect(resolveRule(index('users'), defaultRules, profilesByName)?.boost_profile).toBe(
      'elastic-performant'
    );
    expect(
      resolveRule(dataStream('logs-checkout-default'), defaultRules, profilesByName)?.boost_profile
    ).toBe('elastic-last-7-days');
  });

  it('only applies rules whose profile type matches the data source', () => {
    expect(
      resolveRule(
        dataStream('products'),
        [...defaultRules, rule('custom', 'products')],
        profilesByName
      )?.name
    ).toBe('elastic-default-data-streams');
  });

  it('prefers higher priority, then exact names, then more specific wildcards', () => {
    const rules = [
      ...defaultRules,
      rule('wildcard', 'prod*'),
      rule('specific-wildcard', 'products*'),
      rule('exact', 'products'),
    ];
    expect(resolveRule(index('products'), rules, profilesByName)?.name).toBe('exact');
    expect(resolveRule(index('products-2'), rules, profilesByName)?.name).toBe('specific-wildcard');
    expect(
      resolveRule(index('products'), [...rules, rule('priority', '*', 10)], profilesByName)?.name
    ).toBe('priority');
  });
});

describe('profile counts', () => {
  it('counts data sources by the profile their applied rule uses', () => {
    const counts = countDataSourcesByProfile(
      [index('products'), index('users'), dataStream('clicks-web')],
      [...defaultRules, rule('exact', 'products')],
      profiles
    );
    expect(Object.fromEntries(counts)).toEqual({
      'products-fast': 1,
      'elastic-performant': 1,
      'elastic-last-7-days': 1,
    });
  });

  it('counts rules by profile', () => {
    expect(countRulesByProfile([rule('a', 'x'), rule('b', 'y')]).get('products-fast')).toBe(2);
  });
});

describe('sortRules', () => {
  it('lists rules in evaluation order, with the default rules last', () => {
    const rules = [
      ...defaultRules,
      rule('wildcard', 'prod*'),
      rule('exact', 'products'),
      rule('priority', 'x-*', 10),
    ];
    expect(sortRules(rules).map(({ name }) => name)).toEqual([
      'priority',
      'exact',
      'wildcard',
      'elastic-default-data-streams',
      'elastic-default-indices',
    ]);
  });
});

describe('getRuleCoverage', () => {
  it('separates the data sources a rule matches from the ones it applies to', () => {
    const coverage = getRuleCoverage(
      [index('products'), index('products-2'), index('users')],
      [...defaultRules, rule('wildcard', 'products*'), rule('exact', 'products')],
      profiles
    );
    expect(coverage.get('wildcard')).toEqual({ matches: 2, appliesTo: 1 });
    expect(coverage.get('exact')).toEqual({ matches: 1, appliesTo: 1 });
    expect(coverage.get('elastic-default-indices')).toEqual({ matches: 3, appliesTo: 1 });
  });
});
