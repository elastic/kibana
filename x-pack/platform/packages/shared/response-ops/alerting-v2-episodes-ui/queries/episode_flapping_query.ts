/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { buildEpisodeFlappingQuery as buildEpisodeFlappingQueryCommon } from '@kbn/alerting-v2-common-queries';
import { DEFAULT_EPISODE_FLAPPING_SETTINGS } from '../utils/is_episode_flapping';

export interface EpisodeFlappingRow {
  'episode.status': AlertEpisodeStatus;
}

/**
 * ES|QL query returning the most recent `limit` rule-event statuses for a single
 * episode, newest first. Callers reverse the rows to restore chronological order.
 */
export const buildEpisodeFlappingEsqlQuery = (
  spaceId: string,
  episodeId: string,
  limit: number = DEFAULT_EPISODE_FLAPPING_SETTINGS.lookBackWindow
) => buildEpisodeFlappingQueryCommon(spaceId, episodeId, limit);
