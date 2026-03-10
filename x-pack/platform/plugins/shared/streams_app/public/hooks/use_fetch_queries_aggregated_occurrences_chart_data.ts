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
  StreamQueryCategory,
  StreamQuerySource,
  StreamQueryType,
} from '@kbn/streams-schema';
import moment from 'moment';
import { useKibana } from './use_kibana';
import { useTimefilter } from './use_timefilter';
import { useFetchErrorToast } from './use_fetch_error_toast';

export interface QueriesAggregatedOccurrencesChartData {
  buckets: Array<{ x: number; y: number }>;
  total: number;
}

export const DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY = ['discoveryQueriesOccurrences'] as const;

interface QueryOccurrencesFilters {
  name?: string;
  streamName?: string | string[];
  search?: string;
  type?: StreamQueryType[];
  category?: StreamQueryCategory[];
  source?: StreamQuerySource[];
}

export const useFetchQueriesAggregatedOccurrencesChartData = (
  options: QueryOccurrencesFilters | undefined = {},
  deps: unknown[] = []
) => {
  const { name, streamName, search, type, category, source } = options ?? {};
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
  const normalizedStreamName = streamName ?? (name ? [name] : undefined);

  const fetchDiscoveryQueriesOccurrences = async ({
    signal,
  }: QueryFunctionContext): Promise<QueriesAggregatedOccurrencesChartData | undefined> => {
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
      'GET /internal/streams/_queries/_occurrences_histogram',
      {
        params: {
          query: {
            from: isoFrom,
            to: isoTo,
            bucketSize: intervalString,
            search: search?.trim() ?? '',
            streamName: normalizedStreamName,
            type,
            category,
            source,
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

  return useQuery<QueriesAggregatedOccurrencesChartData | undefined, Error>({
    queryKey: [
      ...DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY,
      normalizedStreamName,
      timeState.start,
      timeState.end,
      search,
      type,
      category,
      source,
      ...deps,
    ],
    queryFn: fetchDiscoveryQueriesOccurrences,
    onError: showFetchErrorToast,
    keepPreviousData: true,
  });
};
