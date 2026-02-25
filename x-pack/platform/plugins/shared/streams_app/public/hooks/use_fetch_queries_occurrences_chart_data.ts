/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type {
  QueryRuleOccurrencesHistogramBucket,
  QueriesOccurrencesGetResponse,
} from '@kbn/streams-schema';
import moment from 'moment';
import { useKibana } from './use_kibana';
import { useTimefilter } from './use_timefilter';
import { useFetchErrorToast } from './use_fetch_error_toast';

export interface QueryOccurrencesChartData {
  buckets: Array<{ x: number; y: number }>;
  total: number;
}

export const QUERY_OCCURRENCES_QUERY_KEY = ['queryOccurrences'] as const;

export const useFetchQueryOccurrencesChartData = (
  options: { queryId?: string } | undefined = {},
  deps: unknown[] = []
) => {
  const { queryId } = options ?? {};
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
        data,
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();
  const { timeState } = useTimefilter();

  const fetchQueryOccurrences = async ({
    signal,
  }: QueryFunctionContext): Promise<QueryOccurrencesChartData | undefined> => {
    if (!queryId) {
      return undefined;
    }

    const isoFrom = new Date(timeState.start).toISOString();
    const isoTo = new Date(timeState.end).toISOString();

    const { min, max } = data.query.timefilter.timefilter.calculateBounds({
      from: isoFrom,
      to: isoTo,
    });

    if (!min || !max) {
      return undefined;
    }

    const bucketSize = calculateAuto.near(50, moment.duration(max.diff(min)));
    if (!bucketSize) {
      return undefined;
    }

    const intervalString = `${bucketSize.asSeconds()}s`;

    const response: QueriesOccurrencesGetResponse = await streamsRepositoryClient.fetch(
      'GET /internal/streams/_queries/{queryId}/_occurrences',
      {
        params: {
          path: { queryId },
          query: {
            from: isoFrom,
            to: isoTo,
            bucketSize: intervalString,
          },
        },
        signal: signal ?? null,
      }
    );

    return {
      buckets: response.buckets.map((bucket: QueryRuleOccurrencesHistogramBucket) => ({
        x: new Date(bucket.date).getTime(),
        y: bucket.count,
      })),
      total: response.total,
    };
  };

  return useQuery<QueryOccurrencesChartData | undefined, Error>({
    queryKey: [...QUERY_OCCURRENCES_QUERY_KEY, queryId, timeState.start, timeState.end, ...deps],
    queryFn: fetchQueryOccurrences,
    onError: showFetchErrorToast,
    keepPreviousData: true,
    enabled: Boolean(queryId),
  });
};
