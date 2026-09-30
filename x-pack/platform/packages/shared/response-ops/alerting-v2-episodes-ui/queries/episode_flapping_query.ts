/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEpisodeFlappingQuery,
  DEFAULT_FLAPPING_LOOKBACK,
} from '@kbn/alerting-v2-common-queries';

/**
 * ES|QL query returning the most recent `limit` rule-event statuses for a single
 * episode, newest first. Callers reverse the rows to restore chronological order.
 */
export const buildEpisodeFlappingEsqlQuery = (
  spaceId: string,
  episodeId: string,
  limit: number = DEFAULT_FLAPPING_LOOKBACK
) => buildEpisodeFlappingQuery(spaceId, episodeId, limit);
