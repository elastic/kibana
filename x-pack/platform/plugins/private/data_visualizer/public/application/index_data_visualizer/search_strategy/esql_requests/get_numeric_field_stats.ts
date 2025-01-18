/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TimeRange } from '@kbn/es-query';
import type { UseCancellableSearch } from '@kbn/ml-cancellable-search';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { ESQL_ASYNC_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { appendToESQLQuery, getStartEndParams } from '@kbn/esql-utils';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import type { Column } from '../../hooks/esql/use_esql_overall_stats_data';
import { processDistributionData } from '../../utils/process_distribution_data';
import { PERCENTILE_SPACING } from '../requests/constants';
import { getESQLPercentileQueryArray, getSafeESQLName, PERCENTS } from '../requests/esql_utils';
import { isFulfilled } from '../../../common/util/promise_all_settled_utils';
import { MAX_CONCURRENT_REQUESTS } from '../../constants/index_data_visualizer_viewer';
import { handleError } from './handle_error';
import type {
  FieldStatsError,
  NonSampledNumericFieldStats,
} from '../../../../../common/types/field_stats';

interface Params {
  runRequest: UseCancellableSearch['runRequest'];
  columns: Column[];
  esqlBaseQuery: string;
  filter?: QueryDslQueryContainer;
  timeRange?: TimeRange;
}
const getESQLNumericFieldStatsInChunk = async ({
  runRequest,
  columns,
  esqlBaseQuery,
  filter,
  timeRange,
}: Params): Promise<Array<NonSampledNumericFieldStats | FieldStatsError>> => {
  // Hashmap of agg to index/order of which is made in the ES|QL query
  // {min: 0, max: 1, p0: 2, p5: 3, ..., p100: 22}
  const numericAccessorMap = PERCENTS.reduce<{ [key: string]: number }>(
    (acc, curr, idx) => {
      // +2 for the min and max aggs
      acc[`p${curr}`] = idx + 2;
      return acc;
    },
    {
      // First two are min and max aggs
      min: 0,
      max: 1,
      // and percentiles p0, p5, ..., p100 are the rest
    }
  );
  const numericFields = columns.map((field, idx) => {
    const percentiles = getESQLPercentileQueryArray(field.name, PERCENTS);
    return {
      field,
      query: `${getSafeESQLName(`${field.name}_min`)} = MIN(${getSafeESQLName(field.name)}),
    ${getSafeESQLName(`${field.name}_max`)} = MAX(${getSafeESQLName(field.name)}),
  ${percentiles.join(',')}
  `,
      // Start index of field in the response, so we know to slice & access the values
      startIndex: idx * Object.keys(numericAccessorMap).length,
    };
  });

  if (numericFields.length > 0) {
    const numericStatsQuery = '| STATS ' + numericFields.map(({ query }) => query).join(',');

    const query = appendToESQLQuery(esqlBaseQuery, numericStatsQuery);
    const namedParams = getStartEndParams(esqlBaseQuery, timeRange);
    const request = {
      params: {
        query,
        ...(filter ? { filter } : {}),
        ...(namedParams.length ? { params: namedParams } : {}),
      },
    };
    try {
      const fieldStatsResp = await runRequest(request, { strategy: ESQL_ASYNC_SEARCH_STRATEGY });

      if (fieldStatsResp) {
        const values = fieldStatsResp.rawResponse.values[0];

        return numericFields.map(({ field, startIndex }, idx) => {
          /** Order of aggs we are expecting back from query
           * 0 = min; 23 = startIndex + 0 for 2nd field
           * 1 = max; 24 = startIndex + 1
           * 2 p0; 25; 24 = startIndex + 2
           * 3 p5; 26
           * 4 p10; 27
           * ...
           * 22 p100;
           */
          const min = values[startIndex + numericAccessorMap.min];
          const max = values[startIndex + numericAccessorMap.max];
          const median = values[startIndex + numericAccessorMap.p50];

          const percentiles = values
            .slice(startIndex + numericAccessorMap.p5, startIndex + numericAccessorMap.p100 + 1)
            .map((value: number) => ({ value }));

          const distribution = processDistributionData(percentiles, PERCENTILE_SPACING, min);

          return {
            fieldName: field.name,
            ...field,
            min,
            max,
            median,
            distribution,
          } as NonSampledNumericFieldStats;
        });
      }
    } catch (error) {
      handleError({ error, request });
      return numericFields.map(({ field }) => {
        return {
          fieldName: field.name,
          error,
        } as FieldStatsError;
      });
    }
  }
  return [];
};

export const getESQLNumericFieldStats = async ({
  runRequest,
  columns,
  esqlBaseQuery,
  filter,
  timeRange,
}: Params): Promise<Array<NonSampledNumericFieldStats | FieldStatsError>> => {
  const limiter = pLimit(MAX_CONCURRENT_REQUESTS);

  // Breakdown so that each requests only contains 10 numeric fields
  // to prevent potential circuit breaking exception
  // or too big of a payload
  const numericColumnChunks = chunk(columns, 10);
  const numericStats = await Promise.allSettled(
    numericColumnChunks.map((numericColumns) =>
      limiter(() =>
        getESQLNumericFieldStatsInChunk({
          columns: numericColumns,
          filter,
          runRequest,
          esqlBaseQuery,
          timeRange,
        })
      )
    )
  );

  return numericStats.filter(isFulfilled).flatMap((stat) => stat.value);
};
