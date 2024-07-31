/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { NumericChartData, SignificantItemHistogramItem } from '@kbn/ml-agg-utils';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';

export interface MiniHistogramAgg extends estypes.AggregationsSingleBucketAggregateBase {
  doc_count: number;
  mini_histogram: {
    buckets: Array<
      estypes.AggregationsSingleBucketAggregateBase & estypes.AggregationsHistogramBucketKeys
    >;
  };
}

export const MINI_HISTOGRAM_AGG_PREFIX = 'mini_histogram_';
export const MINI_HISTOGRAM_BAR_TARGET = 20;

export const getMiniHistogramAgg = (params: AiopsLogRateAnalysisSchema) => {
  return {
    mini_histogram: {
      histogram: {
        field: params.timeFieldName,
        interval: (params.end - params.start) / (MINI_HISTOGRAM_BAR_TARGET - 1),
        min_doc_count: 0,
        extended_bounds: {
          min: params.start,
          max: params.end,
        },
      },
    },
  };
};

export const getMiniHistogramDataFromAggResponse = (
  overallTimeSeries: NumericChartData['data'],
  aggReponse: Record<string, MiniHistogramAgg>,
  index: number
): SignificantItemHistogramItem[] =>
  overallTimeSeries.map((o) => {
    const current = aggReponse[`${MINI_HISTOGRAM_AGG_PREFIX}${index}`].mini_histogram.buckets.find(
      (d1) => d1.key_as_string === o.key_as_string
    ) ?? {
      doc_count: 0,
    };

    return {
      key: o.key,
      key_as_string: o.key_as_string ?? '',
      doc_count_significant_item: current.doc_count,
      doc_count_overall: Math.max(0, o.doc_count - current.doc_count),
    };
  }) ?? [];
