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
  buildEpisodesBaseQuery,
  type AlertEpisodeEsqlRow,
} from './episodes_query';
import { asTypedEsqlQuery, type TypedEsqlQuery } from './typed_esql_query';

/**
 * Builds an ES|QL query that returns the single aggregated row for one episode,
 * reusing the same aggregation pipeline as the list query but narrowed to the
 * episode's series (`group_hash`) so the aggregations don't scan the whole
 * space. Callers that don't know the `group_hash` can resolve it first with
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
