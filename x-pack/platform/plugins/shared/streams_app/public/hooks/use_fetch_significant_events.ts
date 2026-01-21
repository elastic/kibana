/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { SignificantEventsResponse, StreamQuery } from '@kbn/streams-schema';
import moment from 'moment';
import { useKibana } from './use_kibana';
import { useTimefilter } from './use_timefilter';
import { useFetchErrorToast } from './use_fetch_error_toast';

export interface SignificantEventItem {
  query: StreamQuery;
  stream_name: string;
  occurrences: Array<{ x: number; y: number }>;
  change_points: SignificantEventsResponse['change_points'];
}

type SignificantEventsFetchResult =
  | undefined
  | {
      significant_events: SignificantEventItem[];
      aggregated_occurrences: { x: number; y: number }[];
      total_occurrences: number;
    };

export const useFetchSignificantEvents = (
  options: { name?: string; query?: string } | undefined = {}
) => {
  const { name, query } = options;
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

  const fetchSignificantEvents = async ({
    signal,
  }: QueryFunctionContext): Promise<SignificantEventsFetchResult> => {
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

    const requestPromise = streamsRepositoryClient.fetch(
      'GET /internal/streams/_significant_events',
      {
        params: {
          query: {
            from: isoFrom,
            to: isoTo,
            bucketSize: intervalString,
            query: query?.trim() ?? '',
            streamNames: name ? [name] : undefined,
          },
        },
        signal: signal ?? null,
      }
    );

    return await requestPromise.then(
      ({
        significant_events: significantEvents,
        aggregated_occurrences: aggregatedOccurrences,
      }) => {
        return {
          significant_events: significantEvents.map((series) => {
            const { occurrences, change_points: changePoints, stream_name, ...rest } = series;
            return {
              query: rest,
              stream_name,
              change_points: changePoints,
              occurrences: occurrences.map((occurrence) => ({
                x: new Date(occurrence.date).getTime(),
                y: occurrence.count,
              })),
            };
          }),
          aggregated_occurrences: aggregatedOccurrences.map((occurrence) => ({
            x: new Date(occurrence.date).getTime(),
            y: occurrence.count,
          })),
          total_occurrences: aggregatedOccurrences.reduce(
            (sum, occurrence) => sum + occurrence.count,
            0
          ),
        };
      }
    );
  };

  return useQuery<SignificantEventsFetchResult, Error>({
    queryKey: ['significantEvents', name, timeState.start, timeState.end, query],
    queryFn: fetchSignificantEvents,
    onError: showFetchErrorToast,
  });
};
