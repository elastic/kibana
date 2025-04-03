/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { extractIndexNameFromBackingIndex } from '../../common/utils';

export interface PreviewChartResponseItem {
  name: string;
  data: Coordinate[];
}

export interface PreviewChartResponse {
  series: PreviewChartResponseItem[];
  totalGroups: number;
}

const NUM_SERIES = 5;

export const getFilteredBarSeries = (barSeries: any) => {
  const sortedSeries = barSeries.sort((a, b) => {
    const aMax = Math.max(...a.data.map((point) => point.y as number));
    const bMax = Math.max(...b.data.map((point) => point.y as number));
    return bMax - aMax;
  });

  return sortedSeries.slice(0, NUM_SERIES);
};

const DEFAULT_GROUPS = 1000;

export async function getChartPreview({
  esClient,
  index,
  groupBy,
  query = {},
  start,
  end,
  interval,
}: {
  esClient: ElasticsearchClient;
  index: string;
  groupBy: string[];
  query?: {
    must?: QueryDslQueryContainer | QueryDslQueryContainer[];
  };
  start: string;
  end: string;
  interval: string;
}): Promise<PreviewChartResponse> {
  const { must } = query;

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
                    terms: groupBy.map((field) => ({ field })),
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
      bool: {
        ...bool,
        // ...(must ? { must } : {}),
      },
    },
    aggs,
  });

  if (!esResult.aggregations) {
    return { series: [], totalGroups: 0 };
  }

  console.log(JSON.stringify(esResult, null, 2));

  const seriesDataMap = esResult.aggregations.series.buckets.reduce((acc, bucket) => {
    const bucketKey = Array.isArray(bucket.key)
      ? bucket.key.join('_')
      : extractIndexNameFromBackingIndex(bucket.key);
    bucket.timeseries.buckets.forEach((timeseriesBucket) => {
      const x = timeseriesBucket.key;
      const doc_count = timeseriesBucket.doc_count;
      const ignored_count = timeseriesBucket.ignored_fields.doc_count;

      if (acc[bucketKey]) {
        acc[bucketKey].push({ x, doc_count, ignored_count });
      } else {
        acc[bucketKey] = [{ x, doc_count, ignored_count }];
      }
    });

    return acc;
  }, {} as Record<string, Coordinate[]>);

  const series = Object.keys(seriesDataMap).map((key) => ({
    name: key,
    data: Array.from(
      seriesDataMap[key]
        .reduce((map, curr) => {
          if (!map.has(curr.x)) map.set(curr.x, { ...curr });
          else {
            map.get(curr.x).doc_count += curr.doc_count;
            map.get(curr.x).ignored_count += curr.ignored_count;
          }
          return map;
        }, new Map())
        .values()
    ).map((item) => ({
      x: item.x,
      y: (item.ignored_count / item.doc_count) * 100,
    })),
  }));

  const filteredSeries = getFilteredBarSeries(series);

  return {
    series: filteredSeries,
    totalGroups: series.length,
  };
}
