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
  countRulesByProfile,
  getRuleCoverage,
  matchesIndexPattern,
  resolveRule,
  splitByIndexPattern,
  widenIndexPattern,
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

const rule = (name: string, patterns: string | string[], priority = 0): BoostRule => ({
  name,
  index_patterns: typeof patterns === 'string' ? [patterns] : patterns,
  boost_profile: 'products-fast',
  priority,
  is_builtin: false,
});

const index = (name: string, size = 0): BoostDataSource => ({
  name,
  type: 'index',
  size_in_bytes: size,
});
const dataStream = (name: string): BoostDataSource => ({
  name,
  type: 'data_stream',
  size_in_bytes: 0,
});

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

describe('widenIndexPattern', () => {
  it('prefers a trailing wildcard, then a leading one, then both', () => {
    expect(widenIndexPattern('cat', ['catalog-fall', 'catalog-spring'])).toBe('cat*');
    expect(widenIndexPattern('fall', ['catalog-fall'])).toBe('*fall');
    expect(widenIndexPattern('2026', ['catalog-2026-fall', 'archive-2026'])).toBe('*2026*');
  });

  it("doesn't double up wildcards the pattern already has", () => {
    expect(widenIndexPattern('2026-*', ['catalog-2026-fall'])).toBe('*2026-*');
  });
});

describe('splitByIndexPattern', () => {
  it('separates the parts a pattern spells out from what its wildcards match', () => {
    expect(splitByIndexPattern('arch*-20*', 'archive-2024')).toEqual([
      { text: 'arch', isLiteral: true },
      { text: 'ive', isLiteral: false },
      { text: '-20', isLiteral: true },
      { text: '24', isLiteral: false },
    ]);
    expect(splitByIndexPattern('*-2024', 'archive-2024')).toEqual([
      { text: 'archive', isLiteral: false },
      { text: '-2024', isLiteral: true },
    ]);
  });

  it('spells out a whole exact name', () => {
    expect(splitByIndexPattern('products', 'products')).toEqual([
      { text: 'products', isLiteral: true },
    ]);
  });

  it("leaves a name the pattern doesn't match as it is", () => {
    expect(splitByIndexPattern('logs-*', 'products')).toEqual([
      { text: 'products', isLiteral: false },
    ]);
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

  it('ranks a picked list by its exact names', () => {
    const rules = [
      ...defaultRules,
      rule('wildcard', 'products*'),
      rule('picked', ['users', 'products']),
    ];
    expect(resolveRule(index('products'), rules, profilesByName)?.name).toBe('picked');
    expect(resolveRule(index('users'), rules, profilesByName)?.name).toBe('picked');
    expect(resolveRule(index('products-2'), rules, profilesByName)?.name).toBe('wildcard');
  });
});

describe('profile counts', () => {
  it('counts rules by profile', () => {
    expect(countRulesByProfile([rule('a', 'x'), rule('b', 'y')]).get('products-fast')).toBe(2);
  });
});

describe('getRuleCoverage', () => {
  it('separates the data sources a rule matches from the ones it applies to', () => {
    const coverage = getRuleCoverage(
      [index('products'), index('products-2'), index('users')],
      [...defaultRules, rule('wildcard', 'products*'), rule('exact', 'products')],
      profiles
    );
    expect(coverage.get('wildcard')).toEqual({
      matches: 2,
      matchedNames: ['products', 'products-2'],
      appliesTo: 1,
      supersededBy: new Map([['products', 'exact']]),
    });
    expect(coverage.get('exact')).toEqual({
      matches: 1,
      matchedNames: ['products'],
      appliesTo: 1,
      supersededBy: new Map(),
    });
    expect(coverage.get('elastic-default-indices')).toEqual({
      matches: 3,
      matchedNames: ['products', 'products-2', 'users'],
      appliesTo: 1,
      supersededBy: new Map([
        ['products', 'exact'],
        ['products-2', 'wildcard'],
      ]),
    });
  });
});
