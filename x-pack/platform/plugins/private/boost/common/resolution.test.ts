/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILTIN_PROFILES, DEFAULT_RULE_PROFILES, createDefaultRules } from './presets';
import {
  countRulesByProfile,
  findConflictingRule,
  getAppliedRules,
  getRuleCoverage,
  matchesIndexPattern,
  patternsOverlap,
  resolveRule,
  splitByIndexPattern,
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
const defaultRules = createDefaultRules(DEFAULT_RULE_PROFILES);

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
      '_performant'
    );
    expect(
      resolveRule(dataStream('logs-checkout-default'), defaultRules, profilesByName)?.boost_profile
    ).toBe('_last-7-days');
  });

  it('only applies rules whose profile type matches the data source', () => {
    expect(
      resolveRule(
        dataStream('products'),
        [...defaultRules, rule('custom', 'products')],
        profilesByName
      )?.name
    ).toBe('_default-data-streams');
  });

  it('prefers higher priority, then exact names, then other patterns, then `*`', () => {
    const rules = [
      ...defaultRules,
      rule('match-all', '*'),
      rule('wildcard', 'prod*'),
      rule('exact', 'products'),
    ];
    expect(resolveRule(index('products'), rules, profilesByName)?.name).toBe('exact');
    expect(resolveRule(index('products-2'), rules, profilesByName)?.name).toBe('wildcard');
    // The default rules rank below any custom rule, even a `*` one at the lowest priority.
    expect(resolveRule(index('users'), rules, profilesByName)?.name).toBe('match-all');
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

describe('patternsOverlap', () => {
  it.each([
    ['logs-*', '*-prod'],
    ['prod*', 'products'],
    ['a*', '*a'],
    ['*', 'anything'],
    ['products', 'products'],
  ])('finds a name that both %p and %p match', (a, b) => {
    expect(patternsOverlap(a, b)).toBe(true);
    expect(patternsOverlap(b, a)).toBe(true);
  });

  it.each([
    ['logs-*', 'metrics-*'],
    ['a*b', 'a*c'],
    ['ab*', 'b*'],
    ['products', 'users'],
  ])('finds no name that both %p and %p match', (a, b) => {
    expect(patternsOverlap(a, b)).toBe(false);
    expect(patternsOverlap(b, a)).toBe(false);
  });
});

describe('findConflictingRule', () => {
  const rules = [
    ...defaultRules,
    rule('products', 'prod*', 5),
    rule('picked', ['users', 'orders']),
  ];
  const findConflict = (candidate: BoostRule) =>
    findConflictingRule(candidate, rules, profilesByName)?.name;

  it('finds a rule with the same priority and kind of pattern that can match the same name', () => {
    expect(findConflict(rule('catalog', 'products*', 5))).toBe('products');
    expect(findConflict(rule('accounts', ['users']))).toBe('picked');
  });

  it('allows rules that one of them would always win', () => {
    // Another priority, or another kind of pattern, decides between them.
    expect(findConflict(rule('catalog', 'products*', 6))).toBeUndefined();
    expect(findConflict(rule('catalog', 'products', 5))).toBeUndefined();
    // Custom rules rank above the default rules, even a `*` one at the lowest priority.
    expect(findConflict(rule('everything', '*'))).toBeUndefined();
  });

  it("allows rules that can't match the same name", () => {
    expect(findConflict(rule('catalog', 'catalog-*', 5))).toBeUndefined();
    expect(
      findConflict({ ...rule('product-logs', 'prod*', 5), boost_profile: '_last-7-days' })
    ).toBeUndefined();
  });

  it("doesn't compare a rule with its own saved version", () => {
    expect(findConflict(rule('products', 'products*', 5))).toBeUndefined();
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
    expect(coverage.get('_default-indices')).toEqual({
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

describe('getAppliedRules', () => {
  it('names the rule that applies to each data source', () => {
    const rules: BoostRule[] = [
      {
        name: 'products',
        index_patterns: ['products*'],
        boost_profile: customIndicesProfile.name,
        priority: 1,
        is_builtin: false,
      },
      ...createDefaultRules(DEFAULT_RULE_PROFILES),
    ];
    const dataSources: BoostDataSource[] = [
      { name: 'products-live', type: 'index', size_in_bytes: 1 },
      { name: 'users', type: 'index', size_in_bytes: 1 },
    ];

    const applied = getAppliedRules(dataSources, rules, profiles);

    expect(applied.get('products-live')?.name).toBe('products');
    expect(applied.get('users')?.is_builtin).toBe(true);
  });
});
