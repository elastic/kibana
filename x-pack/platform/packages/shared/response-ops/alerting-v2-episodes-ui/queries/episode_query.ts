/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEpisodeQuery as buildEpisodeQueryCommon,
  buildEpisodeGroupHashQuery as buildEpisodeGroupHashQueryCommon,
  type AlertEpisodeEsqlRow,
  type EpisodeGroupHashEsqlRow,
  type TypedEsqlQuery,
} from '@kbn/alerting-v2-common-queries';

/**
 * Builds an ES|QL query that returns the single aggregated row for one episode,
 * reusing the same aggregation pipeline as the list query but narrowed to the
 * episode's series (`group_hash`).
 */
export const buildEpisodeQuery = (
  spaceId: string,
  episodeId: string,
  groupHash: string
): TypedEsqlQuery<AlertEpisodeEsqlRow> => buildEpisodeQueryCommon(spaceId, episodeId, groupHash);

/**
 * Builds an ES|QL query that resolves the `group_hash` of an episode from its
 * most recent rule event.
 */
export const buildEpisodeGroupHashQuery = (
  spaceId: string,
  episodeId: string
): TypedEsqlQuery<EpisodeGroupHashEsqlRow> => buildEpisodeGroupHashQueryCommon(spaceId, episodeId);
