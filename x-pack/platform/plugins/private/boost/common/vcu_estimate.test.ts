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
import type { BoostDataSource, BoostProfile, BoostRule } from './types';
import {
  estimateDataStreamsVcuRange,
  estimateIndicesVcuRange,
  estimateProfileVcuRange,
  estimateRuleImpact,
} from './vcu_estimate';

const base = { minBoost: 1, maxBoost: 4, extraCopy: false, prewarm: false, pinned: false };

describe('estimateIndicesVcuRange', () => {
  it('scales linearly with boost', () => {
    const one = estimateIndicesVcuRange({ ...base, maxBoost: 1 });
    const four = estimateIndicesVcuRange(base);

    expect(four.atPeak).toBeCloseTo(one.atPeak * 4);
    expect(four.atRest).toBeCloseTo(one.atRest);
  });

  it('costs nothing at rest with a minimum boost of 0', () => {
    expect(estimateIndicesVcuRange({ ...base, minBoost: 0 }).atRest).toBe(0);
  });

  it('doubles the range with one extra copy', () => {
    const single = estimateIndicesVcuRange(base);
    const extraCopy = estimateIndicesVcuRange({ ...base, extraCopy: true });

    expect(extraCopy.atRest).toBeCloseTo(single.atRest * 2);
    expect(extraCopy.atPeak).toBeCloseTo(single.atPeak * 2);
  });

  it('raises the at-rest estimate with prewarm and pin, without lowering the peak below it', () => {
    const estimate = estimateIndicesVcuRange({
      ...base,
      maxBoost: 1,
      prewarm: true,
      pinned: true,
    });

    expect(estimate.atRest).toBeGreaterThan(
      estimateIndicesVcuRange({ ...base, maxBoost: 1 }).atRest
    );
    expect(estimate.atPeak).toBeGreaterThanOrEqual(estimate.atRest);
  });
});

describe('estimateDataStreamsVcuRange', () => {
  const profile = {
    recent: { minBoost: 1, maxBoost: 1, maxAgeDays: 1 },
    standard: { minBoost: 1, maxBoost: 1, maxAgeDays: 7 },
    background: { minBoost: 1, maxBoost: 1 },
  };

  it('costs more when the recent period covers more days', () => {
    const oneDay = estimateDataStreamsVcuRange(profile);
    const sevenDays = estimateDataStreamsVcuRange({
      ...profile,
      recent: { ...profile.recent, maxAgeDays: 7 },
    });

    expect(sevenDays.atRest).toBeGreaterThan(oneDay.atRest);
  });

  it('raises the peak, but not the at-rest estimate, with a higher maximum boost', () => {
    const unboosted = estimateDataStreamsVcuRange(profile);
    const boosted = estimateDataStreamsVcuRange({
      ...profile,
      recent: { ...profile.recent, maxBoost: 4 },
    });

    expect(boosted.atRest).toBeCloseTo(unboosted.atRest);
    expect(boosted.atPeak).toBeGreaterThan(unboosted.atPeak);
  });
});

describe('estimateRuleImpact', () => {
  const fast: BoostProfile = {
    name: 'fast',
    type: 'indices',
    is_builtin: false,
    min_boost: 4,
    max_boost: 5000,
    high_availability: 'none',
    prewarm: false,
    pinned: false,
  };
  const profiles = [...BUILTIN_PROFILES, fast];
  const defaultRules = createDefaultRules(translateSimpleDefaults(DEFAULT_SIMPLE_MODE_DEFAULTS));
  const performant = estimateProfileVcuRange(
    BUILTIN_PROFILES.find(({ name }) => name === 'elastic-performant') ?? fast
  );
  const index = (name: string, gb: number): BoostDataSource => ({
    name,
    type: 'index',
    size_in_bytes: gb * 1e9,
  });
  const dataSources = [index('products', 10), index('users', 2), index('archive', 50)];
  const rule = (patterns: string[]): BoostRule => ({
    name: 'fast-rule',
    index_patterns: patterns,
    boost_profile: 'fast',
    priority: 0,
    is_builtin: false,
  });

  it('compares the cost of the data a new rule takes over', () => {
    const impact = estimateRuleImpact({
      dataSources,
      rules: defaultRules,
      profiles,
      nextRule: rule(['products']),
    });

    expect(impact.dataSourceCount).toBe(1);
    expect(impact.sizeInBytes).toBe(10e9);
    expect(impact.current.atRest).toBeCloseTo(performant.atRest * 10);
    expect(impact.next.atRest).toBeCloseTo(estimateProfileVcuRange(fast).atRest * 10);
  });

  it('counts data an edited rule gives up, which falls back to another rule', () => {
    const currentRule = rule(['products', 'users']);
    const impact = estimateRuleImpact({
      dataSources,
      rules: [...defaultRules, currentRule],
      profiles,
      nextRule: rule(['products']),
      // A copy, as the rules table passes it.
      currentRule: { ...currentRule },
    });

    expect(impact.dataSourceCount).toBe(2);
    expect(impact.next.atRest).toBeCloseTo(
      estimateProfileVcuRange(fast).atRest * 10 + performant.atRest * 2
    );
  });
});
