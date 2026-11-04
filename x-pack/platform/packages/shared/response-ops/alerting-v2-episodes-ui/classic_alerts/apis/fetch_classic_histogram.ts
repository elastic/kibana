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
  type HistogramBucketCount,
  type TimeBucket,
} from '../../utils/histogram_utils';
import {
  buildClassicAlertsHistogramAggs,
  buildClassicAlertsQuery,
  CLASSIC_HISTOGRAM_UNKNOWN_BREAKDOWN,
  resolveClassicHistogramBreakdown,
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
const toBucketCounts = (
  { started, ended }: ClassicHistogramOverlapAggregations,
  buckets: TimeBucket[],
  breakdown?: string
): HistogramBucketCount[] => {
  const startedTotals = toRunningTotals(started);
  const endedTotals = toRunningTotals(ended);
  return buckets.map(({ start }, i) => ({
    bucketStart: start,
    count: (startedTotals[i] ?? 0) - (endedTotals[i] ?? 0),
    ...(breakdown !== undefined ? { breakdown } : {}),
  }));
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

  const aggregations = response.aggregations ?? {};

  if (!breakdownField) {
    return { counts: toBucketCounts(aggregations, buckets), isCapHit: false };
  }

  if (!breakdown) {
    return {
      counts: toBucketCounts(aggregations, buckets, CLASSIC_HISTOGRAM_UNKNOWN_BREAKDOWN).filter(
        ({ count }) => count > 0
      ),
      isCapHit: false,
    };
  }

  const terms = aggregations.breakdown;
  const counts = (terms?.buckets ?? []).flatMap(({ key, ...overlapAggregations }) =>
    toBucketCounts(overlapAggregations, buckets, breakdown.normalize(String(key))).filter(
      ({ count }) => count > 0
    )
  );

  // Normalised breakdown values can collapse several raw terms into one (e.g. recovered + untracked).
  return {
    counts: mergeBucketCounts(counts),
    isCapHit: (terms?.sum_other_doc_count ?? 0) > 0,
  };
};
