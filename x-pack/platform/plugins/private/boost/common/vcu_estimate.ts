/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoostDataAge,
  BoostDataSource,
  BoostProfile,
  BoostProfileInput,
  BoostRule,
} from './types';
import { parseMaxAge, toMaxAgeHours } from './validation';
import { resolveRule } from './resolution';

// Placeholder model for the prototype. Real estimates will come from Elasticsearch, which knows the
// resource curves and the project's data. These constants are illustrative, not pricing.

const BYTES_PER_GB = 1e9;
// Boost 1 keeps data fully cached at twice its size (the design doc's 2.0 cache factor).
const CACHE_FACTOR = 2;
const CACHE_GB_PER_VCU = 8;
// One extra copy keeps a second warmed copy, doubling the search resources.
const EXTRA_COPY_MULTIPLIER = 2;
// Prewarm and pin keep slightly more cached data ready at rest.
const PREWARM_AT_REST_MULTIPLIER = 1.1;
const PIN_AT_REST_MULTIPLIER = 1.1;
// Share of each period's data kept cached at boost 1, loosely following the design doc's curves.
const PERIOD_CACHE_RATIOS = { recent: 1, standard: 0.5, background: 0.05 } as const;

/** A round, illustrative price for proofs of concept. It isn't Elastic pricing, which varies by region. */
export const ILLUSTRATIVE_USD_PER_VCU_HOUR = 0.1;

/** Search VCUs per hour, at rest (minimum boost) and at peak load (maximum boost). */
export interface VcuRange {
  atRest: number;
  atPeak: number;
}

const NO_VCUS: VcuRange = { atRest: 0, atPeak: 0 };

const addRanges = (a: VcuRange, b: VcuRange): VcuRange => ({
  atRest: a.atRest + b.atRest,
  atPeak: a.atPeak + b.atPeak,
});

const vcusForCachedData = (dataGb: number, cacheRatio: number, boost: number) =>
  (dataGb * CACHE_FACTOR * cacheRatio * boost) / CACHE_GB_PER_VCU;

export interface IndicesEstimateInput {
  minBoost: number;
  maxBoost: number;
  extraCopy: boolean;
  prewarm: boolean;
  pinned: boolean;
}

/** Search VCUs for this much index data, which boost keeps fully cached. */
export const estimateIndicesVcuRange = (
  dataGb: number,
  { minBoost, maxBoost, extraCopy, prewarm, pinned }: IndicesEstimateInput
): VcuRange => {
  const copies = extraCopy ? EXTRA_COPY_MULTIPLIER : 1;
  const atRestMultiplier =
    (prewarm ? PREWARM_AT_REST_MULTIPLIER : 1) * (pinned ? PIN_AT_REST_MULTIPLIER : 1);

  const atRest = vcusForCachedData(dataGb, 1, minBoost) * copies * atRestMultiplier;
  const atPeak = vcusForCachedData(dataGb, 1, maxBoost) * copies;

  return { atRest, atPeak: Math.max(atRest, atPeak) };
};

type DataStreamsProfile = Extract<BoostProfile | BoostProfileInput, { type: 'data_streams' }>;

const maxAgeHours = (maxAge: string | undefined): number => {
  const parsed = parseMaxAge(maxAge);
  return parsed ? toMaxAgeHours(parsed) : 0;
};

/**
 * Search VCUs for a data stream's data, with each part in the period its age falls in: recent until
 * the recent period's max age, standard until the standard period's, and background after that.
 * Periods apply to whole backing indices, so a part moves on once its newest data is old enough.
 */
export const estimateDataStreamVcuRange = (
  { recent, standard, background }: DataStreamsProfile,
  dataAges: readonly BoostDataAge[]
): VcuRange => {
  const recentMaxHours = maxAgeHours(recent.max_age);
  const standardMaxHours = maxAgeHours(standard.max_age);

  return dataAges.reduce<VcuRange>((total, { age_hours: ageHours, size_in_bytes: bytes }) => {
    const [period, ratio] =
      ageHours < recentMaxHours
        ? [recent, PERIOD_CACHE_RATIOS.recent]
        : ageHours < standardMaxHours
        ? [standard, PERIOD_CACHE_RATIOS.standard]
        : [background, PERIOD_CACHE_RATIOS.background];
    const dataGb = bytes / BYTES_PER_GB;
    const atRest = vcusForCachedData(dataGb, ratio, period.min_boost);
    return addRanges(total, {
      atRest,
      atPeak: Math.max(atRest, vcusForCachedData(dataGb, ratio, period.max_boost)),
    });
  }, NO_VCUS);
};

/** Search VCUs a profile would use for one index's or data stream's actual data. */
export const estimateDataSourceVcuRange = (
  { size_in_bytes: sizeInBytes, data_ages: dataAges }: BoostDataSource,
  profile: BoostProfile | BoostProfileInput
): VcuRange => {
  if (profile.type === 'indices') {
    return estimateIndicesVcuRange(sizeInBytes / BYTES_PER_GB, {
      minBoost: profile.min_boost,
      maxBoost: profile.max_boost,
      extraCopy: profile.high_availability === 'one_extra_copy',
      prewarm: profile.prewarm,
      pinned: profile.pinned,
    });
  }
  // Without a breakdown, all of the data counts as new, which overestimates rather than under.
  return estimateDataStreamVcuRange(
    profile,
    dataAges ?? [{ age_hours: 0, size_in_bytes: sizeInBytes }]
  );
};

/** The search cost of the data sources a change affects, before and after it. */
export interface CostImpact {
  /** The data sources the change affects, and their total size. */
  dataSourceCount: number;
  sizeInBytes: number;
  /** Total search VCUs for those data sources today, and with the change. */
  current: VcuRange;
  next: VcuRange;
}

const NO_IMPACT: CostImpact = {
  dataSourceCount: 0,
  sizeInBytes: 0,
  current: NO_VCUS,
  next: NO_VCUS,
};

interface RuleImpactInput {
  dataSources: readonly BoostDataSource[];
  rules: readonly BoostRule[];
  profiles: readonly BoostProfile[];
  /** The rule as it would be saved. */
  nextRule: BoostRule;
  /** The rule as it's saved today, when editing. */
  currentRule?: BoostRule;
}

/**
 * Estimates what creating or editing a rule does to search VCUs: for every data source it gains or
 * loses, the total under today's rules and under the changed rules.
 */
export const estimateRuleImpact = ({
  dataSources,
  rules,
  profiles,
  nextRule,
  currentRule,
}: RuleImpactInput): CostImpact => {
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  // Matched by name, since callers may pass a copy of the saved rule.
  const nextRules = [...rules.filter(({ name }) => name !== currentRule?.name), nextRule];
  const rangeFor = (dataSource: BoostDataSource, rule: BoostRule | undefined): VcuRange => {
    const profile = rule && profilesByName.get(rule.boost_profile);
    return profile ? estimateDataSourceVcuRange(dataSource, profile) : NO_VCUS;
  };

  return dataSources.reduce<CostImpact>((impact, dataSource) => {
    const appliedNow = resolveRule(dataSource, rules, profilesByName);
    const appliedNext = resolveRule(dataSource, nextRules, profilesByName);
    const isAffected =
      (currentRule !== undefined && appliedNow?.name === currentRule.name) ||
      appliedNext === nextRule;
    if (!isAffected) {
      return impact;
    }
    return {
      dataSourceCount: impact.dataSourceCount + 1,
      sizeInBytes: impact.sizeInBytes + dataSource.size_in_bytes,
      current: addRanges(impact.current, rangeFor(dataSource, appliedNow)),
      next: addRanges(impact.next, rangeFor(dataSource, appliedNext)),
    };
  }, NO_IMPACT);
};

interface ProfileImpactInput {
  dataSources: readonly BoostDataSource[];
  rules: readonly BoostRule[];
  profiles: readonly BoostProfile[];
  /** The profile as it would be saved, with the saved profile's name and type. */
  nextProfile: BoostProfileInput;
}

/** The cost change of editing a profile, across the data sources whose applied rule uses it. */
export const estimateProfileImpact = ({
  dataSources,
  rules,
  profiles,
  nextProfile,
}: ProfileImpactInput): CostImpact => {
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  const currentProfile = profilesByName.get(nextProfile.name);
  if (!currentProfile) {
    return NO_IMPACT;
  }
  return dataSources
    .filter(
      (dataSource) =>
        resolveRule(dataSource, rules, profilesByName)?.boost_profile === nextProfile.name
    )
    .reduce<CostImpact>(
      (impact, dataSource) => ({
        dataSourceCount: impact.dataSourceCount + 1,
        sizeInBytes: impact.sizeInBytes + dataSource.size_in_bytes,
        current: addRanges(impact.current, estimateDataSourceVcuRange(dataSource, currentProfile)),
        next: addRanges(impact.next, estimateDataSourceVcuRange(dataSource, nextProfile)),
      }),
      NO_IMPACT
    );
};
