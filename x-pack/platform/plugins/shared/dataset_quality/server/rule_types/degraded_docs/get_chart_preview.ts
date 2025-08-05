/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';
import { PreviewChartResponse } from '../../../common/api_types';
import { Coordinate } from '../../../common/types';
import { extractKey } from '../extract_key';
import { MISSING_VALUE } from '../types';

interface DataStreamTotals {
  x: Coordinate['x'];
  totalCount: number;
  ignoredCount: number;
}

const NUM_SERIES = 5;
const DEFAULT_GROUPS = 1000;

export const getFilteredBarSeries = (barSeries: PreviewChartResponse['series']) => {
  const sortedSeries = barSeries.sort((a, b) => {
    const aMax = Math.max(...a.data.map((point) => point.y as number));
    const bMax = Math.max(...b.data.map((point) => point.y as number));
    return bMax - aMax;
  });

  return sortedSeries.slice(0, NUM_SERIES);
};

export async function getChartPreview({
  esClient,
  index,
  groupBy,
  start,
  end,
  interval,
}: {
  esClient: ElasticsearchClient;
  index: string;
  groupBy: string[];
  start: string;
  end: string;
  interval: string;
}): Promise<PreviewChartResponse> {
  const bool = {
    filter: [
      {
        range: {
          '@timestamp': {
            gte: start,
            lte: end,
            format: 'epoch_millis',
          },
        },
      },
    ],
  };

  const aggs = {
    ...(groupBy.length > 0
      ? {
          series: {
            ...(groupBy.length === 1
              ? {
                  terms: {
                    field: groupBy[0],
                    size: DEFAULT_GROUPS,
                    order: { _count: 'desc' as const },
                  },
                }
              : {
                  multi_terms: {
                    terms: groupBy.map((field) => ({ field, missing: MISSING_VALUE })),
                    size: DEFAULT_GROUPS,
                    order: { _count: 'desc' as const },
                  },
                }),
            aggs: {
              timeseries: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: interval,
                  extended_bounds: {
                    min: start,
                    max: end,
                  },
                },
                aggs: {
                  ignored_fields: {
                    filter: {
                      exists: {
                        field: '_ignored',
                      },
                    },
                  },
                },
              },
            },
          },
        }
      : {}),
  };

  const esResult = await esClient.search<
    unknown,
    { series: estypes.AggregationsStringTermsAggregate }
  >({
    index,
    track_total_hits: false,
    size: 0,
    query: {
      bool,
    },
    aggs,
  });

  if (!esResult.aggregations) {
    return { series: [], totalGroups: 0 };
  }

  const seriesBuckets = (esResult.aggregations?.series?.buckets ??
    []) as estypes.AggregationsStringTermsBucket[];

  const seriesDataMap: Record<string, DataStreamTotals[]> = seriesBuckets.reduce((acc, bucket) => {
    const bucketKey = extractKey({
      groupBy,
      bucketKey: Array.isArray(bucket.key) ? bucket.key : [bucket.key],
    });
    const timeSeriesBuckets = bucket.timeseries as estypes.AggregationsTimeSeriesAggregate;
    const timeseries = timeSeriesBuckets.buckets as estypes.AggregationsTimeSeriesBucket[];
    timeseries.forEach((timeseriesBucket: estypes.AggregationsTimeSeriesBucket) => {
      const x = (timeseriesBucket as Record<string, estypes.FieldValue>).key as number;
      const totalCount = timeseriesBucket.doc_count ?? 0;
      const ignoredCount =
        (timeseriesBucket.ignored_fields as estypes.AggregationsMultiBucketBase)?.doc_count ?? 0;

      if (acc[bucketKey.join(',')]) {
        acc[bucketKey.join(',')].push({ x, totalCount, ignoredCount });
      } else {
        acc[bucketKey.join(',')] = [{ x, totalCount, ignoredCount }];
      }
    });

    return acc;
  }, {} as Record<string, DataStreamTotals[]>);

  const series = Object.keys(seriesDataMap).map((key) => ({
    name: key,
    data: Array.from(
      seriesDataMap[key]
        .reduce((map, curr: DataStreamTotals) => {
          if (!map.has(curr.x)) map.set(curr.x, { ...curr });
          else {
            map.get(curr.x).totalCount += curr.totalCount;
            map.get(curr.x).ignoredCount += curr.ignoredCount;
          }

          return map;
        }, new Map())
        .values()
    ).map((item: DataStreamTotals) => ({
      x: item.x,
      y: item.totalCount ? (item.ignoredCount / item.totalCount) * 100 : 0,
    })),
  }));

  const filteredSeries = getFilteredBarSeries(series);

  return {
    series: filteredSeries,
    totalGroups: series.length,
  };
}
