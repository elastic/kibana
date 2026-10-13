/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder model for the prototype. Real estimates will come from Elasticsearch, which knows the
// resource curves and the project's data. These constants are illustrative, not pricing.

/** Estimates are expressed per GB of data. */
const ESTIMATE_DATA_GB = 1;
// Data stream estimates spread that data evenly across this many days of age.
const DATA_STREAM_AGE_DAYS = 30;
const DATA_STREAM_GB_PER_DAY = ESTIMATE_DATA_GB / DATA_STREAM_AGE_DAYS;

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

export interface IndicesEstimateInput {
  minBoost: number;
  maxBoost: number;
  extraCopy: boolean;
  prewarm: boolean;
  pinned: boolean;
}

/** Search VCUs per hour, at rest (minimum boost) and at peak load (maximum boost). */
export interface VcuRange {
  atRest: number;
  atPeak: number;
}

const VCUS_PER_BOOST = (ESTIMATE_DATA_GB * CACHE_FACTOR) / CACHE_GB_PER_VCU;

export const estimateIndicesVcuRange = ({
  minBoost,
  maxBoost,
  extraCopy,
  prewarm,
  pinned,
}: IndicesEstimateInput): VcuRange => {
  const copies = extraCopy ? EXTRA_COPY_MULTIPLIER : 1;
  const atRestMultiplier =
    (prewarm ? PREWARM_AT_REST_MULTIPLIER : 1) * (pinned ? PIN_AT_REST_MULTIPLIER : 1);

  const atRest = VCUS_PER_BOOST * minBoost * copies * atRestMultiplier;
  const atPeak = VCUS_PER_BOOST * maxBoost * copies;

  return { atRest, atPeak: Math.max(atRest, atPeak) };
};

export interface BoostRangeInput {
  minBoost: number;
  maxBoost: number;
}

export interface DataStreamsEstimateInput {
  recent: BoostRangeInput & { maxAgeDays: number };
  standard: BoostRangeInput & { maxAgeDays: number };
  background: BoostRangeInput;
}

const vcusForCachedData = (dataGb: number, cacheRatio: number, boost: number) =>
  (dataGb * CACHE_FACTOR * cacheRatio * boost) / CACHE_GB_PER_VCU;

/** Sums each period's estimate, splitting the data across the periods by age. */
export const estimateDataStreamsVcuRange = ({
  recent,
  standard,
  background,
}: DataStreamsEstimateInput): VcuRange => {
  const recentDays = Math.min(recent.maxAgeDays, DATA_STREAM_AGE_DAYS);
  const standardDays = Math.max(
    Math.min(standard.maxAgeDays, DATA_STREAM_AGE_DAYS) - recentDays,
    0
  );
  const backgroundDays = DATA_STREAM_AGE_DAYS - recentDays - standardDays;

  const periods = [
    { days: recentDays, ratio: PERIOD_CACHE_RATIOS.recent, range: recent },
    { days: standardDays, ratio: PERIOD_CACHE_RATIOS.standard, range: standard },
    { days: backgroundDays, ratio: PERIOD_CACHE_RATIOS.background, range: background },
  ];

  return periods.reduce<VcuRange>(
    (total, { days, ratio, range: { minBoost, maxBoost } }) => {
      const dataGb = days * DATA_STREAM_GB_PER_DAY;
      const atRest = vcusForCachedData(dataGb, ratio, minBoost);
      return {
        atRest: total.atRest + atRest,
        atPeak: total.atPeak + Math.max(atRest, vcusForCachedData(dataGb, ratio, maxBoost)),
      };
    },
    { atRest: 0, atPeak: 0 }
  );
};
