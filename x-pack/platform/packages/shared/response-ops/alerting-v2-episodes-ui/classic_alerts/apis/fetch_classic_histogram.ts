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
  classicHistogramBucketAggName,
  CLASSIC_HISTOGRAM_UNKNOWN_BREAKDOWN,
  resolveClassicHistogramBreakdown,
} from '../utils/query';
import {
  type BaseRacOptions,
  type ClassicHistogramAggregations,
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

/**
 * Returns per-bucket classic alert overlap counts computed by Elasticsearch
 * filter aggregations (RBAC enforced by the RAC alerts API).
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

  let isCapHit = false;
  const counts = buckets.flatMap(({ start }, i): HistogramBucketCount[] => {
    const agg = response.aggregations?.[classicHistogramBucketAggName(i)];
    if (!agg) {
      return [];
    }
    if (!breakdownField) {
      return [{ bucketStart: start, count: agg.doc_count }];
    }
    if (!breakdown) {
      return [
        {
          bucketStart: start,
          count: agg.doc_count,
          breakdown: CLASSIC_HISTOGRAM_UNKNOWN_BREAKDOWN,
        },
      ];
    }
    if ((agg.breakdown?.sum_other_doc_count ?? 0) > 0) {
      isCapHit = true;
    }
    return (agg.breakdown?.buckets ?? []).map(({ key, doc_count: count }) => ({
      bucketStart: start,
      count,
      breakdown: breakdown.normalize(String(key)),
    }));
  });

  // Normalised breakdown values can collapse several raw terms into one (e.g. recovered + untracked).
  return { counts: mergeBucketCounts(counts), isCapHit };
};
