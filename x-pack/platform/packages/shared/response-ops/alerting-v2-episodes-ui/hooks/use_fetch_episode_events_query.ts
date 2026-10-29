/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import {
  buildEpisodeEventsWithTotalCountQuery,
  rowsFromEsql,
  type EpisodeEventRow,
} from '@kbn/alerting-v2-common-queries';
import { QUERY_STALE_TIME } from '../constants';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeEventsQueryOptions {
  episodeId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

export interface EpisodeEvents {
  /** The returned events, oldest first; cut off at the ES|QL result limit. */
  eventRows: EpisodeEventRow[];
  /** Number of events in the whole episode, including any that were cut off. */
  totalEventCount: number;
}

/**
 * Loads all `.rule-events` rows for an episode (sorted ascending by @timestamp)
 * together with the episode's total event count.
 */
export const useFetchEpisodeEventsQuery = ({
  episodeId,
  services,
}: UseFetchEpisodeEventsQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episodeEvents(spaceId, episodeId ?? ''),
    queryFn: async ({ signal }): Promise<EpisodeEvents> => {
      const query = buildEpisodeEventsWithTotalCountQuery(spaceId, episodeId!);
      const raw = await runEsqlAsyncSearch({
        data,
        params: {
          query: query.print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      });
      const eventRows = rowsFromEsql(query, raw);
      return { eventRows, totalEventCount: eventRows[0]?.total_event_count ?? 0 };
    },
    enabled: Boolean(episodeId),
    staleTime: QUERY_STALE_TIME,
  });
};
