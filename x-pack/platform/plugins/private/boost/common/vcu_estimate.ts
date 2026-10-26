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
// Prewarm and pinned data keep slightly more cached data ready at rest.
const PREWARM_AT_REST_MULTIPLIER = 1.1;
const PINNED_AT_REST_MULTIPLIER = 1.1;
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
    (prewarm ? PREWARM_AT_REST_MULTIPLIER : 1) * (pinned ? PINNED_AT_REST_MULTIPLIER : 1);

  const atRest = vcusForCachedData(dataGb, 1, minBoost) * copies * atRestMultiplier;
  const atPeak = vcusForCachedData(dataGb, 1, maxBoost) * copies;

  return { atRest, atPeak: Math.max(atRest, atPeak) };
};

type DataStreamsProfile = Extract<BoostProfile | BoostProfileInput, { type: 'data_streams' }>;

const maxAgeHours = (maxAge: string | undefined): number => {
  const parsed = parseMaxAge(maxAge);
  return parsed ? toMaxAgeHours(parsed) : 0;
};

export type DataStreamPeriod = 'recent' | 'standard' | 'background';

/**
 * The period data of this age is in: recent until the recent period's max age, standard until the
 * standard period's, and background after that. Periods apply to whole backing indices, so a part
 * moves on once its newest data is old enough.
 */
export const getDataStreamPeriod = (
  { recent, standard }: DataStreamsProfile,
  ageHours: number
): DataStreamPeriod =>
  ageHours < maxAgeHours(recent.max_age)
    ? 'recent'
    : ageHours < maxAgeHours(standard.max_age)
    ? 'standard'
    : 'background';

/** One period's share of data streams' data, and the search VCUs it uses. */
export interface DataStreamPeriodEstimate {
  sizeInBytes: number;
  vcus: VcuRange;
}

export type DataStreamPeriodEstimates = Record<DataStreamPeriod, DataStreamPeriodEstimate>;

const NO_PERIOD_ESTIMATE: DataStreamPeriodEstimate = { sizeInBytes: 0, vcus: NO_VCUS };

// Without a breakdown, all of a data stream's data counts as new, which overestimates rather than
// under.
const getDataAges = ({
  size_in_bytes: sizeInBytes,
  data_ages: dataAges,
}: BoostDataSource): readonly BoostDataAge[] =>
  dataAges ?? [{ age_hours: 0, size_in_bytes: sizeInBytes }];

/** Search VCUs for this much data in one of the profile's periods. */
const estimatePeriodVcuRange = (
  profile: DataStreamsProfile,
  periodName: DataStreamPeriod,
  bytes: number
): VcuRange => {
  const period = profile[periodName];
  const ratio = PERIOD_CACHE_RATIOS[periodName];
  const dataGb = bytes / BYTES_PER_GB;
  const atRest = vcusForCachedData(dataGb, ratio, period.min_boost);
  return { atRest, atPeak: Math.max(atRest, vcusForCachedData(dataGb, ratio, period.max_boost)) };
};

/** How much of these data streams' data is in each of the profile's periods, and its search VCUs. */
export const estimateDataStreamPeriods = (
  profile: DataStreamsProfile,
  dataSources: readonly BoostDataSource[]
): DataStreamPeriodEstimates =>
  dataSources.flatMap(getDataAges).reduce<DataStreamPeriodEstimates>(
    (periods, { age_hours: ageHours, size_in_bytes: bytes }) => {
      const periodName = getDataStreamPeriod(profile, ageHours);
      const { sizeInBytes, vcus } = periods[periodName];
      return {
        ...periods,
        [periodName]: {
          sizeInBytes: sizeInBytes + bytes,
          vcus: addRanges(vcus, estimatePeriodVcuRange(profile, periodName, bytes)),
        },
      };
    },
    { recent: NO_PERIOD_ESTIMATE, standard: NO_PERIOD_ESTIMATE, background: NO_PERIOD_ESTIMATE }
  );

/** Search VCUs for a data stream's data, with each part in the period its age falls in. */
export const estimateDataStreamVcuRange = (
  profile: DataStreamsProfile,
  dataAges: readonly BoostDataAge[]
): VcuRange =>
  dataAges.reduce<VcuRange>(
    (total, { age_hours: ageHours, size_in_bytes: bytes }) =>
      addRanges(
        total,
        estimatePeriodVcuRange(profile, getDataStreamPeriod(profile, ageHours), bytes)
      ),
    NO_VCUS
  );

/** Search VCUs a profile would use for one index's or data stream's actual data. */
export const estimateDataSourceVcuRange = (
  dataSource: BoostDataSource,
  profile: BoostProfile | BoostProfileInput
): VcuRange => {
  if (profile.type === 'indices') {
    return estimateIndicesVcuRange(dataSource.size_in_bytes / BYTES_PER_GB, {
      minBoost: profile.min_boost,
      maxBoost: profile.max_boost,
      extraCopy: profile.high_availability === 'one_extra_copy',
      prewarm: profile.prewarm,
      pinned: profile.pinned,
    });
  }
  return estimateDataStreamVcuRange(profile, getDataAges(dataSource));
};

/** Search VCUs a profile uses today for these indices or data streams together. */
export const estimateDataSourcesVcuRange = (
  dataSources: readonly BoostDataSource[],
  profile: BoostProfile | BoostProfileInput
): VcuRange =>
  dataSources.reduce<VcuRange>(
    (total, dataSource) => addRanges(total, estimateDataSourceVcuRange(dataSource, profile)),
    NO_VCUS
  );

/**
 * Search VCUs the whole project uses today: each index and data stream under the profile of the
 * rule that applies to it.
 */
export const estimateProjectVcuRange = (
  dataSources: readonly BoostDataSource[],
  appliedRules: ReadonlyMap<string, BoostRule>,
  profiles: readonly BoostProfile[]
): VcuRange => {
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  return dataSources.reduce<VcuRange>((total, dataSource) => {
    const rule = appliedRules.get(dataSource.name);
    const profile = rule && profilesByName.get(rule.boost_profile);
    return profile ? addRanges(total, estimateDataSourceVcuRange(dataSource, profile)) : total;
  }, NO_VCUS);
};

/** The search cost an estimate covers, today and with a change. */
export interface CostImpact {
  /** The data sources the estimate covers with the change, and their total size. */
  dataSourceCount: number;
  sizeInBytes: number;
  /** Total search VCUs today, and with the change. */
  current: VcuRange;
  next: VcuRange;
  /** Whether today's cost covers any data, so a change that leaves none still compares with it. */
  hasCurrentData: boolean;
  /** With a data streams profile, how its periods split the data and its search VCUs. */
  periods?: DataStreamPeriodsImpact;
}

/** A data streams profile's periods, and each one's data and search VCUs with the change. */
export interface DataStreamPeriodsImpact {
  /** The max ages that end the recent and standard periods. */
  maxAges: { recent?: string; standard?: string };
  /** Each period's min and max boost. */
  boosts: DataStreamPeriodBoosts;
  estimates: DataStreamPeriodEstimates;
}

/** Each data stream period's min and max boost. */
export type DataStreamPeriodBoosts = Record<
  DataStreamPeriod,
  { min_boost: number; max_boost: number }
>;

interface RuleCostInput {
  dataSources: readonly BoostDataSource[];
  rules: readonly BoostRule[];
  profiles: readonly BoostProfile[];
  /** The rule as it would be saved. */
  nextRule: BoostRule;
  /** The saved rule that the next rule replaces, when editing. */
  replacedRuleName?: string;
  /** The saved rule to compare with: the one being edited, or the one being copied. */
  comparedRule?: BoostRule;
}

/**
 * Estimates a rule's own search cost: the data sources it would apply to, after higher-ranked rules,
 * with its profile, compared with what a saved rule costs today.
 */
export const estimateRuleCost = ({
  dataSources,
  rules,
  profiles,
  nextRule,
  replacedRuleName,
  comparedRule,
}: RuleCostInput): CostImpact => {
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  const nextRules = [...rules.filter(({ name }) => name !== replacedRuleName), nextRule];
  const nextProfile = profilesByName.get(nextRule.boost_profile);
  const comparedProfile = comparedRule && profilesByName.get(comparedRule.boost_profile);

  const appliesNext = nextProfile
    ? dataSources.filter(
        (dataSource) => resolveRule(dataSource, nextRules, profilesByName) === nextRule
      )
    : [];
  // Matched by name, since callers may pass a copy of the saved rule.
  const appliesNow = comparedProfile
    ? dataSources.filter(
        (dataSource) => resolveRule(dataSource, rules, profilesByName)?.name === comparedRule?.name
      )
    : [];

  return {
    dataSourceCount: appliesNext.length,
    sizeInBytes: appliesNext.reduce((total, { size_in_bytes: bytes }) => total + bytes, 0),
    next: nextProfile ? estimateDataSourcesVcuRange(appliesNext, nextProfile) : NO_VCUS,
    current: comparedProfile ? estimateDataSourcesVcuRange(appliesNow, comparedProfile) : NO_VCUS,
    hasCurrentData: appliesNow.length > 0,
    periods:
      nextProfile?.type === 'data_streams'
        ? {
            maxAges: {
              recent: nextProfile.recent.max_age,
              standard: nextProfile.standard.max_age,
            },
            boosts: nextProfile,
            estimates: estimateDataStreamPeriods(nextProfile, appliesNext),
          }
        : undefined,
  };
};

interface ProfileCostInput {
  dataSources: readonly BoostDataSource[];
  rules: readonly BoostRule[];
  profiles: readonly BoostProfile[];
  /** The saved profile being edited. */
  savedProfile: BoostProfile;
  /** The profile as it would be saved. */
  nextProfile: BoostProfileInput;
}

/**
 * Estimates an edit to a profile: the search cost of what rules apply it to, with the edit, compared
 * with today. An edit changes how the profile boosts, not what the rules apply it to.
 */
export const estimateProfileCost = ({
  dataSources,
  rules,
  profiles,
  savedProfile,
  nextProfile,
}: ProfileCostInput): CostImpact => {
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  const applies = dataSources.filter(
    (dataSource) =>
      resolveRule(dataSource, rules, profilesByName)?.boost_profile === savedProfile.name
  );
  return {
    dataSourceCount: applies.length,
    sizeInBytes: applies.reduce((total, { size_in_bytes: bytes }) => total + bytes, 0),
    next: estimateDataSourcesVcuRange(applies, nextProfile),
    current: estimateDataSourcesVcuRange(applies, savedProfile),
    hasCurrentData: applies.length > 0,
    periods:
      nextProfile.type === 'data_streams'
        ? {
            maxAges: {
              recent: nextProfile.recent.max_age,
              standard: nextProfile.standard.max_age,
            },
            boosts: nextProfile,
            estimates: estimateDataStreamPeriods(nextProfile, applies),
          }
        : undefined,
  };
};
