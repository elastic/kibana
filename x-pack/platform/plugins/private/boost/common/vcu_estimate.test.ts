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
import type {
  BoostDataAge,
  BoostDataSource,
  BoostProfile,
  BoostProfileInput,
  BoostRule,
} from './types';
import {
  estimateDataSourceVcuRange,
  estimateDataStreamVcuRange,
  estimateIndicesVcuRange,
  estimateProfileImpact,
  estimateRuleImpact,
} from './vcu_estimate';

const GB = 1e9;

const index = (name: string, gb: number): BoostDataSource => ({
  name,
  type: 'index',
  size_in_bytes: gb * GB,
});

const base = { minBoost: 1, maxBoost: 4, extraCopy: false, prewarm: false, pinned: false };

const streams: Extract<BoostProfileInput, { type: 'data_streams' }> = {
  name: 'streams',
  type: 'data_streams',
  recent: { min_boost: 1, max_boost: 1, max_age: '1d' },
  standard: { min_boost: 1, max_boost: 1, max_age: '7d' },
  background: { min_boost: 1, max_boost: 1 },
};

describe('estimateIndicesVcuRange', () => {
  it('scales linearly with boost and data', () => {
    const one = estimateIndicesVcuRange(1, { ...base, maxBoost: 1 });

    expect(estimateIndicesVcuRange(1, base).atPeak).toBeCloseTo(one.atPeak * 4);
    expect(estimateIndicesVcuRange(10, base).atRest).toBeCloseTo(one.atRest * 10);
  });

  it('costs nothing at rest with a minimum boost of 0', () => {
    expect(estimateIndicesVcuRange(1, { ...base, minBoost: 0 }).atRest).toBe(0);
  });

  it('doubles the range with one extra copy', () => {
    const single = estimateIndicesVcuRange(1, base);
    const extraCopy = estimateIndicesVcuRange(1, { ...base, extraCopy: true });

    expect(extraCopy.atRest).toBeCloseTo(single.atRest * 2);
    expect(extraCopy.atPeak).toBeCloseTo(single.atPeak * 2);
  });

  it('raises the at-rest estimate with prewarm and pin, without lowering the peak below it', () => {
    const estimate = estimateIndicesVcuRange(1, {
      ...base,
      maxBoost: 1,
      prewarm: true,
      pinned: true,
    });

    expect(estimate.atRest).toBeGreaterThan(
      estimateIndicesVcuRange(1, { ...base, maxBoost: 1 }).atRest
    );
    expect(estimate.atPeak).toBeGreaterThanOrEqual(estimate.atRest);
  });
});

describe('estimateDataStreamVcuRange', () => {
  const profile = streams;
  const aged = (hours: number): BoostDataAge[] => [{ age_hours: hours, size_in_bytes: GB }];
  const atRest = (dataAges: BoostDataAge[], streamsProfile = profile) =>
    estimateDataStreamVcuRange(streamsProfile, dataAges).atRest;

  it('costs less as data ages into later periods', () => {
    const recent = atRest(aged(0));
    const standard = atRest(aged(48));
    const background = atRest(aged(24 * 30));

    expect(recent).toBeGreaterThan(standard);
    expect(standard).toBeGreaterThan(background);
  });

  it('moves data to the next period once it reaches the max age', () => {
    expect(atRest(aged(23))).toBe(atRest(aged(0)));
    expect(atRest(aged(24))).toBe(atRest(aged(48)));
    expect(atRest(aged(24 * 7))).toBe(atRest(aged(24 * 365)));
  });

  it('counts data older than every period as background', () => {
    expect(atRest(aged(24 * 365))).toBeGreaterThan(0);
  });

  it('adds up every part of the data', () => {
    expect(atRest([...aged(0), ...aged(48)])).toBeCloseTo(atRest(aged(0)) + atRest(aged(48)));
  });

  it("uses each period's boosts", () => {
    const boosted = {
      ...profile,
      recent: { ...profile.recent, min_boost: 2, max_boost: 8 },
    };

    expect(atRest(aged(0), boosted)).toBeCloseTo(atRest(aged(0)) * 2);
    expect(atRest(aged(48), boosted)).toBe(atRest(aged(48)));
    expect(estimateDataStreamVcuRange(boosted, aged(0)).atPeak).toBeCloseTo(
      estimateDataStreamVcuRange(profile, aged(0)).atPeak * 8
    );
  });
});

describe('estimateDataSourceVcuRange', () => {
  it("uses a data stream's data by age", () => {
    const dataStream: BoostDataSource = {
      name: 'logs',
      type: 'data_stream',
      size_in_bytes: 2 * GB,
      data_ages: [
        { age_hours: 0, size_in_bytes: GB },
        { age_hours: 24 * 30, size_in_bytes: GB },
      ],
    };

    expect(estimateDataSourceVcuRange(dataStream, streams)).toEqual(
      estimateDataStreamVcuRange(streams, dataStream.data_ages ?? [])
    );
  });

  it('counts all of a data stream as new without a breakdown by age', () => {
    const dataStream: BoostDataSource = { name: 'logs', type: 'data_stream', size_in_bytes: GB };

    expect(estimateDataSourceVcuRange(dataStream, streams)).toEqual(
      estimateDataStreamVcuRange(streams, [{ age_hours: 0, size_in_bytes: GB }])
    );
  });
});

describe('cost impacts', () => {
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
  const performant = BUILTIN_PROFILES.find(({ name }) => name === 'elastic-performant') ?? fast;
  const products = index('products', 10);
  const users = index('users', 2);
  const dataSources = [products, users, index('archive', 50)];
  const cost = (dataSource: BoostDataSource, profile: BoostProfile | BoostProfileInput) =>
    estimateDataSourceVcuRange(dataSource, profile).atRest;
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
    expect(impact.current.atRest).toBeCloseTo(cost(products, performant));
    expect(impact.next.atRest).toBeCloseTo(cost(products, fast));
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
    expect(impact.next.atRest).toBeCloseTo(cost(products, fast) + cost(users, performant));
  });

  it('compares an edited profile across the data its rules apply to', () => {
    const faster = { ...fast, min_boost: 8 };
    const impact = estimateProfileImpact({
      dataSources,
      rules: [...defaultRules, rule(['products'])],
      profiles,
      nextProfile: faster,
    });

    expect(impact.dataSourceCount).toBe(1);
    expect(impact.current.atRest).toBeCloseTo(cost(products, fast));
    expect(impact.next.atRest).toBeCloseTo(cost(products, faster));
  });

  it('has no impact for a profile that no rule applies', () => {
    const impact = estimateProfileImpact({
      dataSources,
      rules: defaultRules,
      profiles,
      nextProfile: fast,
    });

    expect(impact.dataSourceCount).toBe(0);
  });
});
