/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { orderBy } from 'lodash';
import { kqlFilter, parseDatemath, timeRangeFilter } from './dsl_filters';
import { type Bucket, type ChangePoint, getChangePoints } from './get_change_points';

export type MetricAggregationType = 'min' | 'max' | 'sum' | 'count' | 'avg' | 'p95' | 'p99';

export interface MetricAggregationConfig {
  field: string;
  type: MetricAggregationType;
}

export interface GetMetricChangePointsParams {
  esClient: IScopedClusterClient;
  start: string;
  end: string;
  index: string;
  aggregation: MetricAggregationConfig | undefined;
  kqlFilter?: string;
  groupBy: readonly string[];
  timeField?: string;
  signal?: AbortSignal;
}

const getMetricAggregation = (
  aggregation: MetricAggregationConfig | undefined
): {
  agg: AggregationsAggregationContainer;
  buckets_path: string;
} => {
  if (!aggregation || aggregation.type === 'count') {
    return {
      agg: {
        filter: {
          match_all: {},
        },
      },
      buckets_path: '_count',
    };
  }

  if (
    aggregation.type === 'min' ||
    aggregation.type === 'max' ||
    aggregation.type === 'sum' ||
    aggregation.type === 'avg'
  ) {
    return {
      agg: {
        [aggregation.type]: {
          field: aggregation.field,
        },
      },
      buckets_path: 'metric',
    };
  }

  const percentile = `${aggregation.type.split('p')[1]}.0`;

  return {
    agg: {
      percentiles: {
        field: aggregation.field,
        percents: [Number(percentile)],
        keyed: true,
      },
    },
    buckets_path: 'metric',
  };
};

const getGroupingAggregation = (groupingFields: readonly string[]) => {
  if (groupingFields.length === 0) {
    return {
      filters: {
        filters: [
          {
            match_all: {},
          },
        ],
      },
    };
  }

  if (groupingFields.length === 1) {
    return { terms: { field: groupingFields[0] } };
  }

  return {
    multi_terms: {
      terms: groupingFields.map((groupingField) => ({ field: groupingField })),
      size: 10,
    },
  };
};

/** Runs change_point across grouped metric buckets on the given index. */
export async function getMetricChangePoints({
  index,
  start,
  end,
  kqlFilter: kuery,
  groupBy,
  aggregation,
  esClient,
  timeField = '@timestamp',
  signal,
}: GetMetricChangePointsParams): Promise<ChangePoint[]> {
  const { agg: metricAgg, buckets_path: bucketsPathMetric } = getMetricAggregation(aggregation);
  const groupAgg = getGroupingAggregation(groupBy);

  const aggregations = {
    groups: {
      ...groupAgg,
      aggs: {
        time_series: {
          auto_date_histogram: {
            field: timeField,
            buckets: 100,
          },
          aggs: {
            metric: metricAgg,
            value: {
              bucket_script: {
                buckets_path: {
                  metric: bucketsPathMetric,
                },
                script: 'params.metric',
              },
            },
          },
        },
        changes: {
          change_point: {
            buckets_path: 'time_series>value',
          },
        },
      },
    },
  };

  const response = await esClient.asCurrentUser.search(
    {
      index,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...timeRangeFilter(timeField, {
              start: parseDatemath(start),
              end: parseDatemath(end),
            }),
            ...kqlFilter(kuery),
          ],
        },
      },
      aggs: aggregations,
    },
    signal ? { signal } : undefined
  );

  const buckets = (response.aggregations as { groups?: { buckets?: Bucket[] } } | undefined)?.groups
    ?.buckets;
  if (!buckets) {
    return [];
  }

  return getChangePoints({ buckets });
}

/** Returns the top 25 metric change points ordered by p-value. */
export async function getTopMetricChangePoints(
  params: GetMetricChangePointsParams
): Promise<ChangePoint[]> {
  const metricChangePoints = await getMetricChangePoints(params);
  return orderBy(metricChangePoints.flat(), [(item) => item.changes.p_value]).slice(0, 25);
}
