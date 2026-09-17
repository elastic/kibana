/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Filter, TimeRange } from '@kbn/es-query';
import {
  asEsqlRows,
  buildEpisodeActionStateQuery,
  buildEpisodeDetailsQuery,
  buildEpisodesListQuery,
  buildEpisodesQuery,
  DURATION_LOWER_BOUND_FIELD,
  episodesFilterNeedsActions,
  PAGE_SIZE_ESQL_VARIABLE,
  type AlertEpisodeEsqlRow,
  type EpisodesFilterState,
  type EpisodesListRow,
  type EpisodesSortState,
  type TypedEsqlQuery,
} from '@kbn/alerting-v2-common-queries';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { buildAlertEventsTimeRangeFilter } from '../utils/build_alert_events_time_range_filter';

export interface FetchAlertingEpisodesOptions {
  spaceId: string;
  pageSize: number;
  timeRange?: TimeRange | null;
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  abortSignal?: AbortSignal;
  services: { expressions: ExpressionsStart };
}

interface EpisodesQueryInput {
  type: 'kibana_context';
  esqlVariables?: ESQLControlVariable[];
  filters?: Filter[];
}

interface QueryContext {
  expressions: ExpressionsStart;
  abortSignal?: AbortSignal;
}

const runTypedQuery = <TRow extends object>(
  query: TypedEsqlQuery<TRow>,
  input: EpisodesQueryInput,
  { expressions, abortSignal }: QueryContext
): Promise<TRow[]> =>
  executeEsqlQuery({ expressions, query: query.print('basic'), input, abortSignal }).then((rows) =>
    asEsqlRows(query, rows)
  );

/**
 * Completes the rows of `buildEpisodesListQuery` with two lookups on the
 * page's episodes and series, run in parallel on literal id lists:
 * - the episode details over their whole history (no time range), which
 *   give the exact `first_timestamp`, `last_timestamp` and `duration` in
 *   place of the range-clamped values of the list query, plus trigger time,
 *   severity and data;
 * - the action state, snooze by series and ack / assignee / tags by episode.
 * Replaces the `.alert-actions` join in the list query, whose cost didn't
 * depend on the time range.
 */
const withPageLookups = async ({
  rows,
  spaceId,
  context,
}: {
  rows: EpisodesListRow[];
  spaceId: string;
  context: QueryContext;
}): Promise<AlertEpisodeEsqlRow[]> => {
  const groupHashes = [...new Set(rows.map((row) => row.group_hash))];
  const episodeIds = rows.map((row) => row['episode.id']);
  const input: EpisodesQueryInput = { type: 'kibana_context' };

  const [detailRows, actionRows] = await Promise.all([
    runTypedQuery(buildEpisodeDetailsQuery(spaceId, episodeIds), input, context),
    runTypedQuery(
      buildEpisodeActionStateQuery(spaceId, { episodeIds, groupHashes }),
      input,
      context
    ),
  ]);
  const detailsByEpisode = new Map(detailRows.map((row) => [row['episode.id'], row]));
  // `action_key` is the episode id for ack / assignee / tags rows and the
  // group hash for snooze rows.
  const actionsByKey = new Map(actionRows.map((row) => [row.action_key, row]));

  return rows.map((row) => {
    const details = detailsByEpisode.get(row['episode.id']);
    const actions = actionsByKey.get(row['episode.id']);
    const snooze = actionsByKey.get(row.group_hash);
    const firstTimestamp = details?.first_timestamp ?? row.first_timestamp;
    const lastTimestamp = details?.last_timestamp ?? row.last_timestamp;
    return {
      ...row,
      first_timestamp: firstTimestamp,
      last_timestamp: lastTimestamp,
      duration: Date.parse(lastTimestamp) - Date.parse(firstTimestamp),
      // The details cover the whole episode, so the duration is never truncated.
      [DURATION_LOWER_BOUND_FIELD]: false,
      triggered_at: details?.triggered_at ?? null,
      severity: details?.severity ?? row.severity ?? null,
      episode_data: details?.episode_data ?? null,
      last_ack_action: actions?.last_ack_action ?? null,
      last_assignee_uid: actions?.last_assignee_uid ?? null,
      last_tags: actions?.last_tags ?? null,
      last_snooze_action: snooze?.last_snooze_action ?? null,
      snooze_expiry: snooze?.snooze_expiry ?? null,
    };
  });
};

export const fetchAlertingEpisodes = async ({
  spaceId,
  abortSignal,
  pageSize,
  services: { expressions },
  filterState,
  sortState = { sortField: '@timestamp', sortDirection: 'desc' },
  timeRange,
}: FetchAlertingEpisodesOptions): Promise<AlertEpisodeEsqlRow[]> => {
  const context: QueryContext = { expressions, abortSignal };
  const timeRangeFilter = buildAlertEventsTimeRangeFilter(timeRange);
  const input: EpisodesQueryInput = {
    type: 'kibana_context',
    esqlVariables: [
      { key: PAGE_SIZE_ESQL_VARIABLE, value: pageSize, type: ESQLVariableType.VALUES },
    ],
    ...(timeRangeFilter ? { filters: [timeRangeFilter] } : {}),
  };

  // Tag and assignee filters read the action state columns before paging, so
  // they need the `.alert-actions` join. Everything else pages on the events
  // alone and gets the rest of the columns from per-page lookups.
  if (episodesFilterNeedsActions(filterState)) {
    return runTypedQuery(buildEpisodesQuery(spaceId, sortState, filterState), input, context);
  }

  const rows = await runTypedQuery(
    buildEpisodesListQuery(spaceId, sortState, filterState),
    input,
    context
  );
  if (rows.length === 0) {
    return [];
  }
  return withPageLookups({ rows, spaceId, context });
};
