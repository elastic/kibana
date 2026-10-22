/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import {
  ALERT_EPISODE_FIELDS,
  addEpisodeAggregation,
  buildEpisodesBaseQuery,
  type AlertEpisodeEsqlRow,
} from './episodes_query';
import { asTypedEsqlQuery, type TypedEsqlQuery } from './typed_esql_query';

/**
 * Builds an ES|QL query that returns the single aggregated row for one episode,
 * reusing the same aggregation pipeline as the list query but narrowed to the
 * episode's `group_hash` so the aggregations don't scan the whole space; they
 * still key the rows by series, so another rule sharing the hash is not mixed in.
 * Callers that don't know the `group_hash` can resolve it first with
 * `buildEpisodeGroupHashQuery`.
 */
export const buildEpisodeQuery = (
  spaceId: string,
  episodeId: string,
  groupHash: string
): TypedEsqlQuery<AlertEpisodeEsqlRow> =>
  asTypedEsqlQuery<AlertEpisodeEsqlRow>(
    buildEpisodesBaseQuery(spaceId, { groupHash }).where`episode.id == ${episodeId}`
      .pipe`LIMIT 1`.keep(...ALERT_EPISODE_FIELDS)
  );

export const BULK_EPISODE_FIELDS = [
  'episode.id',
  'episode.status',
  'rule.id',
  'group_hash',
  'first_timestamp',
  'last_timestamp',
  'episode_data',
  'severity',
  'source',
] as const;

export type BulkEpisodeEsqlRow = Pick<AlertEpisodeEsqlRow, (typeof BULK_EPISODE_FIELDS)[number]>;

/**
 * Builds an ES|QL query that returns one aggregated row per requested episode id
 * (identity, status, first and last event timestamps, latest data, severity and
 * source). It reads only `.rule-events` and filters on the episode ids before the
 * aggregation, so it skips the action state and never aggregates the whole space.
 */
export const buildBulkEpisodeQuery = (
  spaceId: string,
  episodeIds: string[]
): TypedEsqlQuery<BulkEpisodeEsqlRow> => {
  const query = esql.from([ALERT_EVENTS_DATA_STREAM], ['_source']).where`space_id == ${spaceId}`
    .where`type == "alert"`.where`episode.id IN (${episodeIds.map((episodeId) =>
    esql.str(episodeId)
  )})`;

  addEpisodeAggregation(query);

  return asTypedEsqlQuery<BulkEpisodeEsqlRow>(query.keep(...BULK_EPISODE_FIELDS));
};

/**
 * Raw ES|QL response shape of the group hash lookup.
 */
export interface EpisodeGroupHashEsqlRow {
  group_hash: string;
}

/**
 * Builds an ES|QL query that resolves the `group_hash` of an episode from its
 * most recent rule event. Used to narrow `buildEpisodeQuery` when only the
 * episode id is known (e.g. deep links to the episode details page).
 */
export const buildEpisodeGroupHashQuery = (
  spaceId: string,
  episodeId: string
): TypedEsqlQuery<EpisodeGroupHashEsqlRow> => {
  const query = esql.from(ALERT_EVENTS_DATA_STREAM).where`space_id == ${spaceId}`
    .where`episode.id == ${episodeId}`;

  return asTypedEsqlQuery<EpisodeGroupHashEsqlRow>(
    query.sort(['@timestamp', 'DESC']).pipe`LIMIT 1`.keep('group_hash')
  );
};
