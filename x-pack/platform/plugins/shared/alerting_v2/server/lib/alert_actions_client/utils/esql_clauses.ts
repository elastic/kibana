/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';

/**
 * Builds `(episode_id == "e1" OR episode_id == "e2" OR …)` for the
 * `.alert-actions` data stream (which keeps `episode_id` as a flat field).
 */
export const buildEpisodeIdsInClause = (episodeIds: readonly string[]) => {
  let clause = esql.exp`FALSE`;
  for (const episodeId of episodeIds) {
    clause = esql.exp`${clause} OR episode_id == ${episodeId}`;
  }
  return clause;
};

/**
 * Builds `(episode.id == "e1" OR episode.id == "e2" OR …)` for the
 * `.rule-events` data stream (which keeps the dotted `episode.id` field).
 */
export const buildEpisodeDotIdInClause = (episodeIds: readonly string[]) => {
  let clause = esql.exp`FALSE`;
  for (const episodeId of episodeIds) {
    clause = esql.exp`${clause} OR episode.id == ${episodeId}`;
  }
  return clause;
};
