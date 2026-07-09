/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { QueryOccurrencesResponse } from '@kbn/significant-events-schema';
import moment from 'moment';
import { useKibana } from '../../../../../../hooks/use_kibana';
import type { StreamQueryStats } from '../../../../../../hooks/significant_events/use_fetch_query_occurrence_stats';

/**
 * Like `useFetchQueryOccurrenceStats`, but over an explicit time window instead of the page's
 * global timefilter — the provenance story needs occurrence series around the time the event's
 * detections actually fired, which is unrelated to whatever range the user is browsing.
 */
export const useFetchEventWindowStats = ({
  streamNames,
  from,
  to,
  enabled = true,
}: {
  streamNames: string[];
  /** ISO timestamps delimiting the window. */
  from?: string;
  to?: string;
  /** Set to false to defer the fetch, e.g. while the consuming section is collapsed. */
  enabled?: boolean;
}) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const fetchStats = async ({
    signal,
  }: QueryFunctionContext): Promise<StreamQueryStats[] | undefined> => {
    if (!from || !to || streamNames.length === 0) {
      return undefined;
    }

    const bucketSize = calculateAuto.near(
      50,
      moment.duration(new Date(to).getTime() - new Date(from).getTime())
    );
    if (!bucketSize) {
      return undefined;
    }

    const response: QueryOccurrencesResponse = await streamsRepositoryClient.fetch(
      'GET /internal/streams/_query_occurrences',
      {
        params: {
          query: {
            from,
            to,
            bucketSize: `${bucketSize.asSeconds()}s`,
            query: '',
            streamNames,
          },
        },
        signal: signal ?? null,
      }
    );

    return response.queries.map((series) => {
      const { occurrences, change_points: changePoints, stream_name, rule_backed, ...rest } = series;
      return {
        query: rest,
        stream_name,
        change_points: changePoints,
        occurrences: occurrences.map((occurrence) => ({
          x: new Date(occurrence.date).getTime(),
          y: occurrence.count,
        })),
        rule_backed,
      };
    });
  };

  return useQuery<StreamQueryStats[] | undefined, Error>({
    queryKey: ['eventWindowQueryStats', streamNames.join(','), from, to],
    queryFn: fetchStats,
    enabled: enabled && Boolean(from && to && streamNames.length > 0),
  });
};
