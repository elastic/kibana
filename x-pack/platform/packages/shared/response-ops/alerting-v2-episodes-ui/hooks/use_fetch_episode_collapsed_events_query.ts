/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import {
  buildCollapsedStatusPhasesQuery,
  buildCollapsedSeverityPhasesQuery,
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
import { shouldSwallowFetchError } from '../utils/should_swallow_fetch_error';
import { sweepPhaseRanges } from '../utils/sweep_phase_ranges';
import {
  COLLAPSED_EVENTS_FETCH_ERROR_TOAST_TITLE,
  getCollapsedEventsFetchErrorToastMessage,
} from './translations';
import { useSpaceId } from './use_space_id';

/** Retries before the failure is toasted; the timeline then shows only the first events. */
const COLLAPSED_EVENTS_QUERY_RETRIES = 2;

/** A status row for the episode timelines: one event, or one collapsed status phase. */
export interface EpisodeTimelineStatusRow extends StateChangeSourceRow, AlertTimelineEventRow {}

/** A severity row for the episode timelines: one event, or one collapsed severity phase. */
export interface EpisodeTimelineSeverityRow
  extends SeverityChangeSourceRow,
    Pick<EpisodeEventRow, 'data'> {}

export interface UseFetchEpisodeCollapsedEventsQueryOptions {
  episodeId: string | undefined;
  enabled: boolean;
  /** Events the truncated events query returned, named in the failure toast. */
  shownEventCount: number;
  /** Events the episode has in total, named in the failure toast. */
  totalEventCount: number;
  services: {
    data: DataPublicPluginStart;
    notifications: NotificationsStart;
    spaces: SpacesPluginStart;
  };
}

export interface EpisodeCollapsedEvents {
  statusRows: EpisodeTimelineStatusRow[];
  severityRows: EpisodeTimelineSeverityRow[];
}

interface CollapsedPhaseRow {
  seg_start: string;
  seg_end: string;
}

/**
 * Sweeps collapsed phase rows into the chronological changes of the current value, so a
 * phase that is still open (an alert that flapped but is active now) stays the last one.
 */
const sweepRows = <Row extends CollapsedPhaseRow>(
  rows: Row[]
): Array<{ row: Row; timestamp: string }> =>
  sweepPhaseRanges(
    rows.map((row) => ({
      value: row,
      startMs: Date.parse(row.seg_start),
      endMs: Date.parse(row.seg_end),
    }))
  ).map(({ value, atMs }) => ({ row: value, timestamp: new Date(atMs).toISOString() }));

/**
 * Loads an episode's events collapsed to one row per status and one row per
 * severity (the rule-details Gantt chart grouping), swept into chronological
 * changes, oldest first. Scoped by space and episode only, so alerts without a
 * rule (external ingest) collapse too. Per-change event counts are not
 * available once phases are merged, so the rows carry none. A failure is
 * retried, then toasted, since the timeline falls back to the truncated events.
 */
export const useFetchEpisodeCollapsedEventsQuery = ({
  episodeId,
  enabled,
  shownEventCount,
  totalEventCount,
  services,
}: UseFetchEpisodeCollapsedEventsQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episodeCollapsedEvents(spaceId, episodeId ?? ''),
    queryFn: async ({ signal }): Promise<EpisodeCollapsedEvents> => {
      if (episodeId === undefined) {
        return { statusRows: [], severityRows: [] };
      }
      const options = { spaceId, alertIds: [episodeId] };
      const phasesQuery = buildCollapsedStatusPhasesQuery(options);
      const severityQuery = buildCollapsedSeverityPhasesQuery(options);

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

      const statusRows = sweepRows(rowsFromEsql(phasesQuery, phasesRaw)).map(
        ({ row, timestamp }) => ({
          '@timestamp': timestamp,
          'episode.id': row['episode.id'],
          'episode.status': row['episode.status'],
          group_hash: row.group_hash,
        })
      );

      const severityRows = sweepRows(rowsFromEsql(severityQuery, severityRaw)).map(
        ({ row, timestamp }) => ({
          '@timestamp': timestamp,
          severity: row.severity,
        })
      );

      return { statusRows, severityRows };
    },
    enabled: enabled && Boolean(episodeId),
    staleTime: QUERY_STALE_TIME,
    retry: COLLAPSED_EVENTS_QUERY_RETRIES,
    onError: (error: Error) => {
      if (shouldSwallowFetchError(error)) {
        return;
      }
      services.notifications.toasts.addError(error, {
        title: COLLAPSED_EVENTS_FETCH_ERROR_TOAST_TITLE,
        toastMessage: getCollapsedEventsFetchErrorToastMessage(shownEventCount, totalEventCount),
      });
    },
  });
};
