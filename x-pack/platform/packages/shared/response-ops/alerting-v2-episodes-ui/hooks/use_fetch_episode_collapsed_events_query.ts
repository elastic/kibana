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
  buildAlertPhasesQuery,
  buildAlertSeverityPhasesQuery,
  rowsFromEsql,
  type EpisodeEventRow,
} from '@kbn/alerting-v2-common-queries';
import { QUERY_STALE_TIME } from '../constants';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';
import type { AlertTimelineEventRow } from '../alert_timeline/types';
import type {
  SeverityChangeSourceRow,
  StateChangeSourceRow,
} from '../components/details/timeline/entries';
import { useSpaceId } from './use_space_id';

/** A status row for the episode timelines: one event, or one collapsed status phase. */
export interface EpisodeTimelineStatusRow extends StateChangeSourceRow, AlertTimelineEventRow {}

/** A severity row for the episode timelines: one event, or one collapsed severity phase. */
export interface EpisodeTimelineSeverityRow
  extends SeverityChangeSourceRow,
    Pick<EpisodeEventRow, 'data'> {}

export interface UseFetchEpisodeCollapsedEventsQueryOptions {
  episodeId: string | undefined;
  ruleId: string | undefined;
  enabled: boolean;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

export interface EpisodeCollapsedEvents {
  statusRows: EpisodeTimelineStatusRow[];
  severityRows: EpisodeTimelineSeverityRow[];
}

const byTimestamp = (a: { '@timestamp': string }, b: { '@timestamp': string }) =>
  a['@timestamp'].localeCompare(b['@timestamp']);

/**
 * Loads an episode's events collapsed to one row per status and one row per
 * severity (the rule-details Gantt chart grouping), oldest first.
 */
export const useFetchEpisodeCollapsedEventsQuery = ({
  episodeId,
  ruleId,
  enabled,
  services,
}: UseFetchEpisodeCollapsedEventsQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episodeCollapsedEvents(spaceId, episodeId ?? '', ruleId ?? ''),
    queryFn: async ({ signal }): Promise<EpisodeCollapsedEvents> => {
      const options = { ruleId: ruleId!, alertIds: [episodeId!] };
      const phasesQuery = buildAlertPhasesQuery(options);
      const severityQuery = buildAlertSeverityPhasesQuery(options);

      const [phasesRaw, severityRaw] = await Promise.all(
        [phasesQuery, severityQuery].map((query) =>
          runEsqlAsyncSearch({
            data,
            params: {
              query: query.print('basic'),
              time_zone: 'UTC',
            },
            abortSignal: signal,
          })
        )
      );

      const statusRows = rowsFromEsql(phasesQuery, phasesRaw)
        .map((row) => ({
          '@timestamp': row.seg_start,
          'episode.id': row['episode.id'],
          'episode.status': row['episode.status'],
          group_hash: row.group_hash,
          event_count: row.event_count,
        }))
        .sort(byTimestamp);

      const severityRows = rowsFromEsql(severityQuery, severityRaw)
        .map((row) => ({
          '@timestamp': row.seg_start,
          severity: row.severity,
          event_count: row.event_count,
        }))
        .sort(byTimestamp);

      return { statusRows, severityRows };
    },
    enabled: enabled && Boolean(episodeId) && Boolean(ruleId),
    staleTime: QUERY_STALE_TIME,
  });
};
