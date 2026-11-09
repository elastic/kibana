/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { orderBy } from 'lodash';
import { kqlFilter, parseDatemath, timeRangeFilter } from './dsl_filters';
import { type Bucket, type ChangePoint, getChangePoints } from './get_change_points';

export interface GetLogChangePointParams {
  index: string;
  start: string;
  end: string;
  kqlFilter?: string;
  messageField: string;
  timeField?: string;
  esClient: IScopedClusterClient;
  signal?: AbortSignal;
}

const TARGET_SAMPLE_SIZE = 500_000;

/** Elasticsearch random_sampler requires a probability in (0, 0.5] or exactly 1. */
export const computeSamplingProbability = ({
  totalHits,
  targetSampleSize,
}: {
  totalHits: number;
  targetSampleSize: number;
}): number => {
  const rawProbability = targetSampleSize / totalHits;
  return rawProbability < 0.5 ? rawProbability : 1;
};

const getTotalHits = (response: Pick<SearchResponse<unknown>, 'hits'> | undefined): number => {
  const total = response?.hits?.total;
  return typeof total === 'number' ? total : total?.value ?? 0;
};

/** Runs categorize_text + change_point on the given log index and returns every bucket's outcome. */
export async function getLogChangePoint({
  index,
  start,
  end,
  kqlFilter: kqlFilterValue,
  messageField,
  timeField = '@timestamp',
  esClient,
  signal,
}: GetLogChangePointParams): Promise<ChangePoint[]> {
  const filters = [
    ...timeRangeFilter(timeField, {
      start: parseDatemath(start),
      end: parseDatemath(end),
    }),
    ...kqlFilter(kqlFilterValue),
  ];

  const countDocumentsResponse = await esClient.asCurrentUser.search(
    {
      size: 0,
      track_total_hits: true,
      index,
      query: {
        bool: {
          filter: filters,
        },
      },
    },
    signal ? { signal } : undefined
  );

  const totalHits = getTotalHits(countDocumentsResponse);
  if (totalHits === 0) {
    return [];
  }

  const response = await esClient.asCurrentUser.search(
    {
      index,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        sampler: {
          random_sampler: {
            probability: computeSamplingProbability({
              totalHits,
              targetSampleSize: TARGET_SAMPLE_SIZE,
            }),
          },
          aggs: {
            groups: {
              categorize_text: {
                field: messageField,
                size: 1000,
              },
              aggs: {
                time_series: {
                  auto_date_histogram: {
                    field: timeField,
                    buckets: 100,
                  },
                },
                changes: {
                  change_point: {
                    buckets_path: 'time_series>_count',
                  },
                },
              },
            },
          },
        },
      },
    },
    signal ? { signal } : undefined
  );

  const buckets = (
    response.aggregations as { sampler?: { groups?: { buckets?: Bucket[] } } } | undefined
  )?.sampler?.groups?.buckets;

  if (!buckets) {
    return [];
  }

  return getChangePoints({ buckets });
}

/** Returns the top 25 log change points ordered by p-value. */
export async function getTopLogChangePoints(
  params: GetLogChangePointParams
): Promise<ChangePoint[]> {
  const logChangePoints = await getLogChangePoint(params);
  return orderBy(logChangePoints.flat(), [(item) => item.changes.p_value]).slice(0, 25);
}
