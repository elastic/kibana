/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import type { EpisodesFilterState } from '../../queries/episodes_query';
import type { EpisodeSourceHistogram } from '../../types/episode_data_source';
import {
  mergeBucketCounts,
  sumBreakdownTotals,
  type HistogramBucketCount,
  type TimeBucket,
} from '../../utils/histogram_utils';
import { HISTOGRAM_OTHER_BREAKDOWN, HISTOGRAM_UNKNOWN_BREAKDOWN } from '../../constants';
import {
  buildClassicAlertsHistogramAggs,
  buildClassicAlertsQuery,
  resolveClassicHistogramBreakdown,
  type ClassicHistogramBreakdown,
} from '../utils/query';
import {
  type BaseRacOptions,
  type ClassicHistogramAggregations,
  type ClassicHistogramOverlapAggregations,
  type ClassicHistogramRangeAggregation,
  findClassicAlerts,
  toTimeRangeParam,
} from './rac_find';

export interface FetchClassicAlertsHistogramOptions extends BaseRacOptions {
  timeRange?: TimeRange | null;
  filterState?: EpisodesFilterState;
  breakdownField?: string;
  buckets: TimeBucket[];
  nowMs: number;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

const EMPTY_HISTOGRAM: EpisodeSourceHistogram = { counts: [], isCapHit: false };

const toRunningTotals = (aggregation?: ClassicHistogramRangeAggregation): number[] => {
  let total = 0;
  return (aggregation?.buckets ?? []).map(({ doc_count: count }) => {
    total += count;
    return total;
  });
};

/**
 * Overlap count per histogram bucket: alerts started before the bucket ends minus alerts
 * ended at or before it starts (see `buildClassicAlertsHistogramAggs`).
 */
const toOverlapCounts = (
  { started, ended }: ClassicHistogramOverlapAggregations,
  bucketCount: number
): number[] => {
  const startedTotals = toRunningTotals(started);
  const endedTotals = toRunningTotals(ended);
  return Array.from(
    { length: bucketCount },
    (_, i) => (startedTotals[i] ?? 0) - (endedTotals[i] ?? 0)
  );
};

const toBucketCounts = (
  counts: number[],
  buckets: TimeBucket[],
  breakdown?: string
): HistogramBucketCount[] =>
  buckets.map(({ start }, i) => ({
    bucketStart: start,
    count: counts[i],
    ...(breakdown !== undefined ? { breakdown } : {}),
  }));

const isNonEmpty = ({ count }: HistogramBucketCount): boolean => count > 0;

/**
 * Maps the range aggregations onto bucket counts. With a breakdown, values outside the top terms
 * are returned under `HISTOGRAM_OTHER_BREAKDOWN` as overall minus top terms.
 */
const toClassicHistogram = (
  aggregations: ClassicHistogramAggregations,
  buckets: TimeBucket[],
  breakdownField?: string,
  breakdown?: ClassicHistogramBreakdown
): Omit<EpisodeSourceHistogram, 'isCapHit'> => {
  const overall = toOverlapCounts(aggregations, buckets.length);

  if (!breakdownField) {
    return { counts: toBucketCounts(overall, buckets) };
  }

  if (!breakdown) {
    // Every matching alert starts before the last bucket ends, so the final running total is the alert count.
    const alertCount = toRunningTotals(aggregations.started).at(-1) ?? 0;
    return {
      counts: toBucketCounts(overall, buckets, HISTOGRAM_UNKNOWN_BREAKDOWN).filter(isNonEmpty),
      breakdownTotals: { [HISTOGRAM_UNKNOWN_BREAKDOWN]: alertCount },
    };
  }

  const terms = (aggregations.breakdown?.buckets ?? []).map(
    ({ key, doc_count: alertCount, ...overlapAggregations }) => ({
      value: breakdown.normalize(String(key)),
      alertCount,
      counts: toOverlapCounts(overlapAggregations, buckets.length),
    })
  );
  const rest = overall.map(
    (count, i) => count - terms.reduce((sum, { counts }) => sum + counts[i], 0)
  );

  return {
    // Normalised values can collapse several raw terms into one (e.g. recovered + untracked).
    counts: mergeBucketCounts(
      ...terms.map(({ value, counts }) => toBucketCounts(counts, buckets, value)),
      toBucketCounts(rest, buckets, HISTOGRAM_OTHER_BREAKDOWN)
    ).filter(isNonEmpty),
    breakdownTotals: sumBreakdownTotals(
      ...terms.map(({ value, alertCount }) => ({ [value]: alertCount }))
    ),
  };
};

/**
 * Returns per-bucket classic alert overlap counts computed from Elasticsearch
 * range aggregations (RBAC enforced by the RAC alerts API).
 */
export const fetchClassicAlertsHistogram = async ({
  ruleTypeIds,
  timeRange,
  filterState,
  breakdownField,
  buckets,
  nowMs,
  abortSignal,
  services: { http },
}: FetchClassicAlertsHistogramOptions): Promise<EpisodeSourceHistogram> => {
  if (buckets.length === 0) {
    return EMPTY_HISTOGRAM;
  }

  const breakdown = breakdownField ? resolveClassicHistogramBreakdown(breakdownField) : undefined;

  const response = await findClassicAlerts<ClassicHistogramAggregations>(
    http,
    {
      rule_type_ids: ruleTypeIds,
      query: buildClassicAlertsQuery(filterState, toTimeRangeParam(timeRange)),
      aggs: buildClassicAlertsHistogramAggs({ buckets, nowMs, breakdown }),
      size: 0,
      track_total_hits: false,
      _source: false,
    },
    abortSignal
  );

  return {
    ...toClassicHistogram(response.aggregations ?? {}, buckets, breakdownField, breakdown),
    isCapHit: false,
  };
};
