/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILTIN_PROFILES, DEFAULT_RULE_PROFILES, createDefaultRules } from './presets';
import type {
  BoostDataAge,
  BoostDataSource,
  BoostProfile,
  BoostProfileInput,
  BoostRule,
} from './types';
import {
  estimateDataSourceVcuRange,
  estimateDataSourcesVcuRange,
  estimateDataStreamVcuRange,
  estimateDataStreamPeriods,
  estimateIndicesVcuRange,
  estimateRuleCost,
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

  it('raises the at-rest estimate with prewarm and pinned data, without lowering the peak below it', () => {
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

describe('estimateDataStreamPeriods', () => {
  it("sorts data streams' data into the profile's periods by age, with each one's VCUs", () => {
    const logs: BoostDataSource = {
      name: 'logs-app',
      type: 'data_stream',
      size_in_bytes: 6 * GB,
      data_ages: [
        { age_hours: 2, size_in_bytes: 1 * GB },
        { age_hours: 48, size_in_bytes: 2 * GB },
        { age_hours: 24 * 30, size_in_bytes: 3 * GB },
      ],
    };
    // Without a breakdown, all of a data stream's data counts as new.
    const metrics: BoostDataSource = { name: 'metrics', type: 'data_stream', size_in_bytes: GB };

    const periods = estimateDataStreamPeriods(streams, [logs, metrics]);

    expect(periods.recent.sizeInBytes).toBe(2 * GB);
    expect(periods.standard.sizeInBytes).toBe(2 * GB);
    expect(periods.background.sizeInBytes).toBe(3 * GB);
    // The periods split the data stream's estimate between them.
    const total = estimateDataStreamVcuRange(streams, [
      ...(logs.data_ages ?? []),
      { age_hours: 0, size_in_bytes: GB },
    ]);
    expect(
      periods.recent.vcus.atPeak + periods.standard.vcus.atPeak + periods.background.vcus.atPeak
    ).toBeCloseTo(total.atPeak);
  });
});

describe('estimateDataSourcesVcuRange', () => {
  it("adds up the profile's estimate for each index", () => {
    const [profile] = BUILTIN_PROFILES.filter(({ type }) => type === 'indices');
    const one = estimateDataSourceVcuRange(index('one', 2), profile);
    const two = estimateDataSourceVcuRange(index('two', 3), profile);

    expect(estimateDataSourcesVcuRange([index('one', 2), index('two', 3)], profile)).toEqual({
      atRest: one.atRest + two.atRest,
      atPeak: one.atPeak + two.atPeak,
    });
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
  const defaultRules = createDefaultRules(DEFAULT_RULE_PROFILES);
  const products = index('products', 10);
  const users = index('users', 2);
  const dataSources = [products, users, index('archive', 50)];
  const atRest = (dataSource: BoostDataSource, profile: BoostProfile | BoostProfileInput) =>
    estimateDataSourceVcuRange(dataSource, profile).atRest;
  const rule = (patterns: string[]): BoostRule => ({
    name: 'fast-rule',
    index_patterns: patterns,
    boost_profile: 'fast',
    priority: 0,
    is_builtin: false,
  });

  it("estimates a new rule's own cost, with nothing to compare", () => {
    const cost = estimateRuleCost({
      dataSources,
      rules: defaultRules,
      profiles,
      nextRule: rule(['products']),
    });

    expect(cost.dataSourceCount).toBe(1);
    expect(cost.sizeInBytes).toBe(10e9);
    expect(cost.next.atRest).toBeCloseTo(atRest(products, fast));
    expect(cost.current).toEqual({ atRest: 0, atPeak: 0 });
    expect(cost.hasCurrentData).toBe(false);
  });

  it('compares an edited rule with what it costs today', () => {
    const savedRule = rule(['products', 'users']);
    const cost = estimateRuleCost({
      dataSources,
      rules: [...defaultRules, savedRule],
      profiles,
      nextRule: rule(['products']),
      replacedRuleName: savedRule.name,
      // A copy, as the rules table passes it.
      comparedRule: { ...savedRule },
    });

    expect(cost.dataSourceCount).toBe(1);
    expect(cost.next.atRest).toBeCloseTo(atRest(products, fast));
    expect(cost.current.atRest).toBeCloseTo(atRest(products, fast) + atRest(users, fast));
    expect(cost.hasCurrentData).toBe(true);
  });

  it('costs nothing for an edited rule that no longer applies to anything', () => {
    const savedRule = rule(['products']);
    const cost = estimateRuleCost({
      dataSources,
      rules: [...defaultRules, savedRule],
      profiles,
      nextRule: rule(['nothing-*']),
      replacedRuleName: savedRule.name,
      comparedRule: savedRule,
    });

    expect(cost.dataSourceCount).toBe(0);
    expect(cost.next).toEqual({ atRest: 0, atPeak: 0 });
    expect(cost.current.atRest).toBeCloseTo(atRest(products, fast));
    expect(cost.hasCurrentData).toBe(true);
  });

  it('only counts what a rule applies to after higher-ranked rules', () => {
    const higher = { ...rule(['products']), name: 'higher', priority: 5 };
    const cost = estimateRuleCost({
      dataSources,
      rules: [...defaultRules, higher],
      profiles,
      nextRule: rule(['products', 'users']),
    });

    expect(cost.dataSourceCount).toBe(1);
    expect(cost.next.atRest).toBeCloseTo(atRest(users, fast));
  });

  it("compares a copy with the original's cost, keeping the original", () => {
    const original = rule(['products']);
    const cost = estimateRuleCost({
      dataSources,
      rules: [...defaultRules, original],
      profiles,
      nextRule: { ...rule(['users']), name: 'fast-rule-copy' },
      comparedRule: original,
    });

    expect(cost.next.atRest).toBeCloseTo(atRest(users, fast));
    expect(cost.current.atRest).toBeCloseTo(atRest(products, fast));
  });

  it("splits a data streams rule's estimate by its profile's periods", () => {
    const clicks: BoostDataSource = {
      name: 'clicks',
      type: 'data_stream',
      size_in_bytes: 3 * GB,
      data_ages: [
        { age_hours: 2, size_in_bytes: 1 * GB },
        { age_hours: 24 * 30, size_in_bytes: 2 * GB },
      ],
    };
    const cost = estimateRuleCost({
      dataSources: [...dataSources, clicks],
      rules: defaultRules,
      profiles: [...profiles, { ...streams, is_builtin: false }],
      nextRule: { ...rule(['clicks']), boost_profile: 'streams' },
    });

    expect(cost.periods?.maxAges).toEqual({ recent: '1d', standard: '7d' });
    expect(cost.periods?.estimates.recent.sizeInBytes).toBe(1 * GB);
    expect(cost.periods?.estimates.background.sizeInBytes).toBe(2 * GB);
  });

  it('has no periods for an indices rule', () => {
    const cost = estimateRuleCost({
      dataSources,
      rules: defaultRules,
      profiles,
      nextRule: rule(['products']),
    });

    expect(cost.periods).toBeUndefined();
  });
});
