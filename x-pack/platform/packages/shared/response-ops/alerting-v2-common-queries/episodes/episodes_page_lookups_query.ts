/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { escapeStringValue } from '@kbn/esql-utils';
import { ALERT_ACTIONS_DATA_STREAM, ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { asTypedEsqlQuery, type TypedEsqlQuery } from './typed_esql_query';

/*
 * Per-page lookups completing the rows of `buildEpisodesListQuery`. Each one
 * filters on a literal `IN` list of the page's ids, which ES pushes down to
 * Lucene, so they run in a few ms whatever the size of the data streams.
 *
 * The details lookup runs without the time range filter: it reads the whole
 * history of the page's episodes, so the boundaries and the data are exact
 * even when the picker cuts an episode. That is what the list query cannot
 * afford for every episode in range.
 */

/**
 * Action state of a page of episodes: snooze is series-level (keyed by the
 * `group_hash`), ack / assignee / tags are episode-level (keyed by the
 * `episode_id`). `action_key` holds whichever applies to the row. Same
 * definitions as `addGroupHashActionStats` / `addEpisodeIdActionStats`,
 * `last_tags` still needs the client-side normalization to an array.
 */
export interface EpisodeActionStateRow {
  action_key: string;
  last_snooze_action?: AlertEpisode['last_snooze_action'];
  snooze_expiry?: AlertEpisode['snooze_expiry'];
  last_ack_action?: AlertEpisode['last_ack_action'];
  last_assignee_uid?: AlertEpisode['last_assignee_uid'];
  last_tags?: string | string[] | null;
}

const toInList = (values: string[]) => values.map((value) => escapeStringValue(value)).join(', ');

/**
 * Per-episode columns that only the page rows need, computed over the whole
 * history of the episode (no time range filter): the exact first and last
 * event, the trigger time, the severity and the `data` of the last breached
 * event. Same definitions as `addEpisodeAggregation` / `addEpisodeDataExtraction`.
 */
export interface EpisodeDetailsRow {
  'episode.id': string;
  first_timestamp: AlertEpisode['first_timestamp'];
  last_timestamp: AlertEpisode['last_timestamp'];
  triggered_at?: AlertEpisode['triggered_at'];
  severity?: AlertEpisode['severity'];
  episode_data?: AlertEpisode['episode_data'];
}

export const buildEpisodeDetailsQuery = (
  spaceId: string,
  episodeIds: string[]
): TypedEsqlQuery<EpisodeDetailsRow> => {
  const query = esql.from([ALERT_EVENTS_DATA_STREAM], ['_source']).where`space_id == ${spaceId}`
    .where`type == "alert"`;
  query.pipe(`WHERE \`episode.id\` IN (${toInList(episodeIds)})`);
  // prettier-ignore
  query
    .pipe`INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp), data_timestamp = MAX(@timestamp) WHERE status == "breached", triggered_at = MIN(@timestamp) WHERE \`episode.status\` == "active", severity = LAST(severity, @timestamp) WHERE status == "breached" AND severity IS NOT NULL BY episode.id`
    .pipe`WHERE @timestamp == COALESCE(data_timestamp, last_timestamp)`
    .pipe`EVAL episode_data = JSON_EXTRACT(_source, "data")`;

  return asTypedEsqlQuery<EpisodeDetailsRow>(
    query.keep(
      'episode.id',
      'first_timestamp',
      'last_timestamp',
      'triggered_at',
      'severity',
      'episode_data'
    )
  );
};

/**
 * Builds the ES|QL query that returns the action state of a page: the snooze
 * state of its series and the ack / assignee / tags state of its episodes, in
 * one pass over the matching action docs. The literal `IN` lists are pushed
 * down to Lucene, so this only reads the action docs of the page (a few ms).
 */
export const buildEpisodeActionStateQuery = (
  spaceId: string,
  { episodeIds, groupHashes }: { episodeIds: string[]; groupHashes: string[] }
): TypedEsqlQuery<EpisodeActionStateRow> => {
  const query = esql.from(ALERT_ACTIONS_DATA_STREAM).where`space_id == ${spaceId}`;
  query.pipe(
    `WHERE (episode_id IN (${toInList(
      episodeIds
    )}) AND action_type IN ("ack", "unack", "assign", "tag")) OR (group_hash IN (${toInList(
      groupHashes
    )}) AND action_type IN ("snooze", "unsnooze"))`
  );
  // prettier-ignore
  query
    .pipe`EVAL action_key = CASE(action_type IN ("snooze", "unsnooze"), group_hash, episode_id)`
    .pipe`STATS last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze"),
                 snooze_expiry      = LAST(expiry, @timestamp)      WHERE action_type == "snooze",
                 last_ack_action    = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
                 last_assignee_uid  = LAST(assignee_uid, @timestamp) WHERE action_type == "assign",
                 last_tags          = LAST(tags, @timestamp)        WHERE action_type == "tag"
           BY action_key`;

  return asTypedEsqlQuery<EpisodeActionStateRow>(query);
};
