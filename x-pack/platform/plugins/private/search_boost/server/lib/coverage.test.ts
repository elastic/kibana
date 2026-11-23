/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostProfile, BoostRule } from '../../common/types';
import type { BoostExplanation } from './coverage';
import { getRuleListItems } from './coverage';

const PROFILES: BoostProfile[] = [
  {
    name: 'fast',
    type: 'indices',
    is_builtin: false,
    min_boost: 1,
    max_boost: 5,
    availability: 'base',
    prewarm: false,
    pinned: false,
  },
  {
    name: 'recent',
    type: 'data_streams',
    is_builtin: false,
    recent: { min_boost: 1, max_boost: 5, max_age: '1d' },
    standard: { min_boost: 1, max_boost: 2, max_age: '7d' },
    background: { min_boost: 1, max_boost: 1 },
  },
];

const rule = (name: string, boostProfile = 'fast'): BoostRule => ({
  name,
  index_pattern: '*',
  boost_profile: boostProfile,
  priority: 0,
  is_builtin: false,
});

const explanation = (
  name: string,
  matchedRuleNames: string[],
  { type = 'indices', isHidden = false }: Partial<BoostExplanation> = {}
): BoostExplanation => ({ name, type, isHidden, matchedRuleNames });

const getMatches = (rules: BoostRule[], explanations: BoostExplanation[]) =>
  Object.fromEntries(
    getRuleListItems(rules, PROFILES, explanations).map(({ name, matches }) => [name, matches])
  );

describe('getRuleListItems', () => {
  it('adds the type of the rule profile', () => {
    expect(getRuleListItems([rule('logs', 'recent')], PROFILES, [])).toEqual([
      { ...rule('logs', 'recent'), type: 'data_streams', matches: [] },
    ]);
  });

  it('lists what each rule matches, naming the rule that applies instead when outranked', () => {
    expect(
      getMatches(
        [rule('exact'), rule('wildcard'), rule('all')],
        [
          explanation('logs', ['exact', 'wildcard', 'all']),
          explanation('lost', ['wildcard', 'all']),
        ]
      )
    ).toEqual({
      exact: [{ name: 'logs', isHidden: false }],
      wildcard: [
        { name: 'logs', isHidden: false, outrankedByRuleName: 'exact' },
        { name: 'lost', isHidden: false },
      ],
      all: [
        { name: 'logs', isHidden: false, outrankedByRuleName: 'exact' },
        { name: 'lost', isHidden: false, outrankedByRuleName: 'wildcard' },
      ],
    });
  });

  it('keeps whether each match is hidden', () => {
    expect(
      getMatches(
        [rule('all')],
        [explanation('.hidden', ['all'], { isHidden: true }), explanation('visible', ['all'])]
      )
    ).toEqual({
      all: [
        { name: '.hidden', isHidden: true },
        { name: 'visible', isHidden: false },
      ],
    });
  });

  it('lists rules that match nothing', () => {
    expect(getMatches([rule('unused')], [explanation('logs', [])])).toEqual({ unused: [] });
  });

  it('leaves out rules whose profile is unknown', () => {
    expect(
      getRuleListItems([rule('orphan', 'missing')], PROFILES, [explanation('logs', [])])
    ).toEqual([]);
  });
});
