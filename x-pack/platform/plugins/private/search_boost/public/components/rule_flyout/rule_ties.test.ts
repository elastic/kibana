/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RankedRule } from './rule_ties';
import { findTiedRule, patternsOverlap } from './rule_ties';

describe('patternsOverlap', () => {
  it.each([
    ['products', 'products'],
    ['catalog-*', 'catalog-2026-fall'],
    ['catalog-*', 'catalog-2026-*'],
    ['catalog-*', '*-fall'],
    ['*', 'anything'],
    ['logs-*-default', 'logs-nginx-*'],
    ['a*b*c', '*b*'],
  ])('finds that %p and %p can match the same name', (patternA, patternB) => {
    expect(patternsOverlap(patternA, patternB)).toBe(true);
    expect(patternsOverlap(patternB, patternA)).toBe(true);
  });

  it.each([
    ['products', 'users'],
    ['catalog-*', 'archive-*'],
    ['catalog-*', 'catalog'],
    ['*-fall', '*-spring'],
    ['logs-*', 'metrics-*'],
  ])('finds that %p and %p never match the same name', (patternA, patternB) => {
    expect(patternsOverlap(patternA, patternB)).toBe(false);
    expect(patternsOverlap(patternB, patternA)).toBe(false);
  });
});

describe('findTiedRule', () => {
  const rule = (overrides: Partial<RankedRule>): RankedRule => ({
    name: 'storefront-archive',
    index_pattern: 'catalog-*',
    priority: 10,
    type: 'indices',
    ...overrides,
  });

  const catalogs = rule({ name: 'storefront-catalogs', index_pattern: 'catalog-2026-*' });

  it('finds a rule of the same type and priority whose wildcard pattern overlaps', () => {
    expect(findTiedRule(rule({}), [catalogs])).toBe(catalogs);
  });

  it.each([
    ['a different priority', { priority: 5 }],
    ['a different type', { type: 'data_streams' as const }],
    ['a different kind of pattern', { index_pattern: 'catalog-2026-fall' }],
    ['patterns that never match the same name', { index_pattern: 'archive-*' }],
  ])('ignores a rule with %s', (_description, overrides) => {
    expect(findTiedRule(rule(overrides), [catalogs])).toBeUndefined();
  });

  it('ignores the rule itself, so editing a rule never ties with its saved version', () => {
    expect(findTiedRule(catalogs, [catalogs])).toBeUndefined();
  });

  it('ties two exact names only when they are the same name', () => {
    const products = rule({ name: 'products', index_pattern: 'products' });

    expect(findTiedRule(rule({ index_pattern: 'products' }), [products])).toBe(products);
    expect(findTiedRule(rule({ index_pattern: 'users' }), [products])).toBeUndefined();
  });

  it('ties two match-all patterns', () => {
    const everything = rule({ name: 'everything', index_pattern: '*' });

    expect(findTiedRule(rule({ index_pattern: '*' }), [everything])).toBe(everything);
  });
});
