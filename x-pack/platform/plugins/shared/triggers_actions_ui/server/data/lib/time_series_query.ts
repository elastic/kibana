/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getEsErrorMessage } from '@kbn/alerting-plugin/server';
import { toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import {
  buildAggregation,
  getDateRangeInfo,
  isCountAggregation,
  isGroupAggregation,
} from '../../../common';

import {
  TimeSeriesQuery,
  TimeSeriesResult,
  TimeSeriesResultRow,
  TimeSeriesCondition,
} from './time_series_types';
export type { TimeSeriesQuery, TimeSeriesResult } from './time_series_types';

export const TIME_SERIES_BUCKET_SELECTOR_PATH_NAME = 'compareValue';
export const TIME_SERIES_BUCKET_SELECTOR_FIELD = `params.${TIME_SERIES_BUCKET_SELECTOR_PATH_NAME}`;

export interface TimeSeriesQueryParameters {
  logger: Logger;
  esClient: ElasticsearchClient;
  query: TimeSeriesQuery;
  condition?: TimeSeriesCondition;
  useCalculatedDateRange?: boolean;
}

export async function timeSeriesQuery(
  params: TimeSeriesQueryParameters
): Promise<TimeSeriesResult> {
  const {
    logger,
    esClient,
    query: queryParams,
    condition: conditionParams,
    useCalculatedDateRange = true,
  } = params;
  const {
    index,
    timeWindowSize,
    timeWindowUnit,
    interval,
    timeField,
    dateStart,
    dateEnd,
    filterKuery,
  } = queryParams;

  const window = `${timeWindowSize}${timeWindowUnit}`;
  const dateRangeInfo = getDateRangeInfo({ dateStart, dateEnd, window, interval });
  const { aggType, aggField, termField, termSize } = queryParams;

  // core query
  // Constructing a typesafe ES query in JS is problematic, use any escapehatch for now

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esQuery: any = {
    index,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                [timeField]: {
                  gte: useCalculatedDateRange ? dateRangeInfo.dateStart : dateStart,
                  lt: useCalculatedDateRange ? dateRangeInfo.dateEnd : dateEnd,
                  format: 'strict_date_time',
                },
              },
            },
            ...(!!filterKuery ? [toElasticsearchQuery(fromKueryExpression(filterKuery))] : []),
          ],
        },
      },
      aggs: buildAggregation({
        timeSeries: {
          timeField,
          timeWindowSize,
          timeWindowUnit,
          dateStart,
          dateEnd,
          interval,
        },
        aggType,
        aggField,
        termField,
        termSize,
        condition: conditionParams,
      }),
    },
    ignore_unavailable: true,
    allow_no_indices: true,
  };

  // add the aggregations

  const isCountAgg = isCountAggregation(aggType);
  const isGroupAgg = isGroupAggregation(termField);
  const includeConditionInQuery = !!conditionParams;

  const logPrefix = 'indexThreshold timeSeriesQuery: callCluster';
  logger.debug(() => `${logPrefix} call: ${JSON.stringify(esQuery)}`);
  let esResult: estypes.SearchResponse<unknown>;
  // note there are some commented out console.log()'s below, which are left
  // in, as they are VERY useful when debugging these queries; debug logging
  // isn't as nice since it's a single long JSON line.

  // console.log('time_series_query.ts request\n', JSON.stringify(esQuery, null, 4));
  try {
    esResult = (await esClient.search(esQuery, { ignore: [404], meta: true })).body;
  } catch (err) {
    // console.log('time_series_query.ts error\n', JSON.stringify(err, null, 4));
    logger.warn(`${logPrefix} error: ${getEsErrorMessage(err)}`);
    return { results: [], truncated: false };
  }

  // console.log('time_series_query.ts response\n', JSON.stringify(esResult, null, 4));
  logger.debug(() => `${logPrefix} result: ${JSON.stringify(esResult)}`);
  return getResultFromEs({
    isCountAgg,
    isGroupAgg,
    isConditionInQuery: includeConditionInQuery,
    esResult,
    resultLimit: conditionParams?.resultLimit,
  });
}

interface GetResultFromEsParams {
  isCountAgg: boolean;
  isGroupAgg: boolean;
  isConditionInQuery: boolean;
  esResult: estypes.SearchResponse<unknown>;
  resultLimit?: number;
}

export function getResultFromEs({
  isCountAgg,
  isGroupAgg,
  isConditionInQuery,
  esResult,
  resultLimit,
}: GetResultFromEsParams): TimeSeriesResult {
  const aggregations = esResult?.aggregations || {};

  // add a fake 'all documents' group aggregation, if a group aggregation wasn't used
  if (!isGroupAgg && aggregations.dateAgg) {
    const dateAgg = aggregations.dateAgg;

    aggregations.groupAgg = {
      buckets: [{ key: 'all documents', dateAgg }],
    };

    delete aggregations.dateAgg;
  }

  // @ts-expect-error specify aggregations type explicitly
  const groupBuckets = aggregations.groupAgg?.buckets || [];
  // @ts-expect-error specify aggregations type explicitly
  const numGroupsTotal = aggregations.groupAggCount?.count ?? 0;
  const result: TimeSeriesResult = {
    results: [],
    truncated: isConditionInQuery && resultLimit ? numGroupsTotal > resultLimit : false,
  };

  for (const groupBucket of groupBuckets) {
    if (resultLimit && result.results.length === resultLimit) break;

    const groupName: string = `${groupBucket?.key}`;
    const dateBuckets = groupBucket?.dateAgg?.buckets || [];
    const groupResult: TimeSeriesResultRow = {
      group: groupName,
      metrics: [],
    };
    result.results.push(groupResult);

    for (const dateBucket of dateBuckets) {
      const date: string = dateBucket.to_as_string;
      const value: number = isCountAgg ? dateBucket.doc_count : dateBucket.metricAgg.value;
      groupResult.metrics.push([date, value]);
    }
  }

  return result;
}
