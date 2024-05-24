/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import dateMath from '@kbn/datemath';
import type { ElasticsearchClient } from '@kbn/core/server';

import { getExtendedChangePoint } from '../get_extended_change_point';
import { getWindowParametersForTrigger } from '../get_window_parameters_for_trigger';
import type { DocumentCountStatsChangePoint } from '../types';
import type { WindowParameters } from '../window_parameters';

// Change point detection requires a minimum of 22 buckets to be able to run.
const CHANGE_POINT_MIN_BUCKETS = 22;

interface ChangePointDetectionData {
  changePoint: DocumentCountStatsChangePoint;
  changePointDocCount: number;
  dateHistogramBuckets: Record<string, number>;
  intervalMs: number;
  windowParameters: WindowParameters;
}
type ChangePointDetectionError = [string, null];
type ChangePointDetectionSuccess = [null, ChangePointDetectionData];
type ChangePointDetectionResponse = ChangePointDetectionError | ChangePointDetectionSuccess;

/**
 * Fetches change points for doc count histogram.
 *
 * @param esClient Elasticsearch client.
 * @param index The Elasticsearch source index pattern.
 * @param start The start of the time range, in Elasticsearch date math, like `now`.
 * @param end The end of the time range, in Elasticsearch date math, like `now-24h`.
 * @param timefield The Elasticesarch source index pattern time field.
 * @param abortSignal Abort signal.
 * @returns change point data.
 */
export const fetchChangePointDetection = async (
  esClient: ElasticsearchClient,
  index: string,
  earliestMs: number,
  latestMs: number,
  timefield: string,
  searchQuery: estypes.QueryDslQueryContainer,
  abortSignal?: AbortSignal
): Promise<ChangePointDetectionResponse> => {
  const barTarget = 75;

  const delta = latestMs - earliestMs;

  const dayMs = 86400 * 1000;
  const dayThreshold = dayMs * CHANGE_POINT_MIN_BUCKETS;

  const weekMs = dayMs * 7;
  const weekThreshold = weekMs * CHANGE_POINT_MIN_BUCKETS;

  const monthMs = dayMs * 30;
  const monthThreshold = monthMs * CHANGE_POINT_MIN_BUCKETS;

  let intervalMs = Math.round(delta / barTarget);

  if (delta > monthThreshold) {
    intervalMs = monthMs;
  } else if (delta > weekThreshold) {
    intervalMs = weekMs;
  } else if (delta > dayThreshold) {
    intervalMs = dayMs;
  }

  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {
    eventRate: {
      date_histogram: {
        field: timefield,
        fixed_interval: `${intervalMs}ms`,
        min_doc_count: 0,
        ...(earliestMs !== undefined && latestMs !== undefined
          ? {
              extended_bounds: {
                min: earliestMs,
                max: latestMs,
              },
            }
          : {}),
      },
    },
    change_point_request: {
      // @ts-expect-error missing from ES spec
      change_point: {
        buckets_path: 'eventRate>_count',
      },
    },
  };

  const searchBody: estypes.MsearchMultisearchBody = {
    query: searchQuery,
    aggs,
    track_total_hits: false,
    size: 0,
  };

  const histogram = await esClient.search(
    {
      index,
      body: searchBody,
    },
    {
      signal: abortSignal,
      maxRetries: 0,
    }
  );

  if (histogram.aggregations === undefined) {
    return ['No log rate change detected.', null];
  }

  if (histogram.aggregations.change_point_request.bucket === undefined) {
    return ['No log rate change detected.', null];
  }

  const dateHistogramBuckets = histogram.aggregations.eventRate.buckets.reduce((acc, cur) => {
    acc[cur.key] = cur.doc_count;
    return acc;
  }, {});

  const changePointTs = dateMath
    .parse(histogram.aggregations.change_point_request.bucket.key)
    ?.valueOf();

  if (changePointTs === undefined) {
    return ['There was an error parsing the log rate change timestamp.', null];
  }

  const extendedChangePoint = getExtendedChangePoint(dateHistogramBuckets, changePointTs);
  const logRateType = Object.keys(histogram.aggregations.change_point_request.type)[0];

  const changePoint = {
    ...extendedChangePoint,
    key: changePointTs,
    type: logRateType,
  };

  const windowParameters = getWindowParametersForTrigger(
    extendedChangePoint.startTs,
    intervalMs,
    earliestMs,
    latestMs,
    changePoint
  );

  return [
    null,
    {
      changePoint: { ...extendedChangePoint, key: changePointTs, type: logRateType },
      changePointDocCount: histogram.aggregations.change_point_request.bucket.doc_count,
      dateHistogramBuckets,
      intervalMs,
      windowParameters,
    },
  ];
};
