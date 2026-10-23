/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM, ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { AlertEpisodeEsqlRow } from './episodes_query';
import { ACTIONS_SERIES_ID_EVAL, EVENTS_SERIES_ID_EVAL } from './series_id_eval';
import { asTypedEsqlQuery, type TypedEsqlQuery } from './typed_esql_query';

/**
 * Episode columns computed from the indexed `.rule-events` fields. The latest
 * `data` comes from `buildEpisodeDataRequest`, the action columns (ack,
 * assignee, tags, snooze) from `buildEpisodeActionsQuery` and
 * `buildSeriesSnoozeQuery`.
 */
export const EPISODE_EVENTS_FIELDS = [
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'group_hash',
  'series_id',
  'first_timestamp',
  'last_timestamp',
  'duration',
  'triggered_at',
  'severity',
  'source',
] as const;

export type EpisodeEventsEsqlRow = Pick<
  AlertEpisodeEsqlRow,
  (typeof EPISODE_EVENTS_FIELDS)[number]
>;

/**
 * Aggregates the alert events of each episode into one row, with plain `STATS`
 * over indexed fields only. Shared by the single episode and the related
 * episodes queries.
 */
export const addEpisodeSummaryStats = (query: ComposerQuery): ComposerQuery =>
  // prettier-ignore
  query
    .pipe`STATS last_timestamp   = MAX(@timestamp),
                first_timestamp  = MIN(@timestamp),
                triggered_at     = MIN(@timestamp)                WHERE \`episode.status\` == "active",
                \`episode.status\` = LAST(\`episode.status\`, @timestamp),
                \`rule.id\`        = LAST(\`rule.id\`, @timestamp),
                group_hash       = LAST(group_hash, @timestamp),
                source           = LAST(source, @timestamp),
                space_id         = LAST(space_id, @timestamp),
                severity         = LAST(severity, @timestamp)     WHERE status == "breached" AND severity IS NOT NULL
          BY \`episode.id\``
    .pipe`EVAL @timestamp = last_timestamp, duration = DATE_DIFF("ms", first_timestamp, last_timestamp)`;

/**
 * Builds an ES|QL query that returns the single aggregated row for one
 * episode. It filters on the episode id first and never loads `_source`, so
 * ES only reads indexed columns of the episode's own events.
 */
export const buildEpisodeQuery = (
  spaceId: string,
  episodeId: string
): TypedEsqlQuery<EpisodeEventsEsqlRow> => {
  // prettier-ignore
  const query = esql.from(ALERT_EVENTS_DATA_STREAM)
    .where`space_id == ${spaceId}`
    .where`episode.id == ${episodeId}`
    .where`type == "alert"`;

  addEpisodeSummaryStats(query).pipe(EVENTS_SERIES_ID_EVAL);

  return asTypedEsqlQuery<EpisodeEventsEsqlRow>(query.keep(...EPISODE_EVENTS_FIELDS));
};

/**
 * The DSL filter that must go with the episode data queries: it skips the
 * events without data, including the empty `{}` one, which indexes no values.
 * Breached events always pass, since their data can hold only `null` values,
 * which index nothing either.
 * This also picks breached events with empty data, which the engine writes
 * while a value is between the breach and recovery thresholds. We'll handle
 * that case separately.
 */
export const EPISODE_DATA_FILTER: estypes.QueryDslQueryContainer = {
  bool: {
    should: [{ term: { status: 'breached' } }, { exists: { field: 'data' } }],
    minimum_should_match: 1,
  },
};

/**
 * Raw ES|QL response shape of the episode data lookup.
 */
export interface EpisodeDataEsqlRow {
  /** Timestamp of the event the data comes from. */
  '@timestamp': string;
  episode_data: string | null;
}

/**
 * Builds the request for the `data` of the latest episode event that has
 * some. `data` is a `flattened` field ES|QL can't read, so it is parsed from
 * `_source`. With `EPISODE_DATA_FILTER`, ES picks the single latest doc from
 * the index and only one `_source` is parsed.
 */
export const buildEpisodeDataRequest = (
  spaceId: string,
  episodeId: string
): {
  query: TypedEsqlQuery<EpisodeDataEsqlRow>;
  filter: typeof EPISODE_DATA_FILTER;
} => {
  // prettier-ignore
  const query = esql.from([ALERT_EVENTS_DATA_STREAM], ['_source'])
    .where`space_id == ${spaceId}`
    .where`episode.id == ${episodeId}`
    .where`type == "alert"`
    .sort(['@timestamp', 'DESC'])
    .pipe`LIMIT 1`
    .pipe`EVAL episode_data = JSON_EXTRACT(_source, "data")`;

  return {
    query: asTypedEsqlQuery<EpisodeDataEsqlRow>(query.keep('@timestamp', 'episode_data')),
    filter: EPISODE_DATA_FILTER,
  };
};

/**
 * Raw ES|QL response shape of the multiple episodes data lookup.
 */
export interface EpisodesDataEsqlRow {
  'episode.id': string;
  episode_data: string | null;
}

/**
 * Same as `buildEpisodeDataRequest`, for a few episodes at once: one latest
 * event with data per episode, so at most one `_source` per episode is parsed.
 */
export const buildEpisodesDataRequest = (
  spaceId: string,
  episodeIds: string[]
): {
  query: TypedEsqlQuery<EpisodesDataEsqlRow>;
  filter: typeof EPISODE_DATA_FILTER;
} => {
  const episodeIdLiterals = episodeIds.map((id) => esql.str(id));
  // prettier-ignore
  const query = esql.from([ALERT_EVENTS_DATA_STREAM], ['_source'])
    .where`space_id == ${spaceId}`
    .where`episode.id IN (${episodeIdLiterals})`
    .where`type == "alert"`
    .sort(['@timestamp', 'DESC'])
    .pipe`LIMIT 1 BY \`episode.id\``
    .pipe`EVAL episode_data = JSON_EXTRACT(_source, "data")`;

  return {
    query: asTypedEsqlQuery<EpisodesDataEsqlRow>(query.keep('episode.id', 'episode_data')),
    filter: EPISODE_DATA_FILTER,
  };
};

/**
 * Raw ES|QL response shape of the series snooze lookup.
 */
export interface SeriesSnoozeEsqlRow {
  last_snooze_action: 'snooze' | 'unsnooze' | null;
  snoozed_until: string | null;
}

/**
 * Builds an ES|QL query that returns the snooze state of one series. Snoozes
 * target the series, not a single episode. The `group_hash` filter runs on
 * the index; `series_id` then drops the other rules' series sharing the hash.
 */
export const buildSeriesSnoozeQuery = (
  spaceId: string,
  groupHash: string,
  seriesId: string | null | undefined
): TypedEsqlQuery<SeriesSnoozeEsqlRow> => {
  const query = esql.from(ALERT_ACTIONS_DATA_STREAM).where`space_id == ${spaceId}`
    .where`group_hash == ${groupHash}`.where`action_type IN ("snooze", "unsnooze")`;

  if (seriesId) {
    query.pipe(ACTIONS_SERIES_ID_EVAL).where`series_id == ${seriesId}`;
  }

  // prettier-ignore
  return asTypedEsqlQuery<SeriesSnoozeEsqlRow>(
    query
      .pipe`STATS last_snooze_action = LAST(action_type, @timestamp),
                  snoozed_until      = LAST(expiry, @timestamp) WHERE action_type == "snooze"`
      .keep('last_snooze_action', 'snoozed_until')
  );
};
