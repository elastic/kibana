/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEpisodeActionsHistoryQuery as buildEpisodeActionsHistoryQueryCommon,
  DEFAULT_ACTIONS_HISTORY_PAGE_SIZE,
} from '@kbn/alerting-v2-common-queries';
import type { BuildEpisodeActionsHistoryQueryOptions as BuildEpisodeActionsHistoryQueryOptionsCommon } from '@kbn/alerting-v2-common-queries';

export interface EpisodeActionHistoryEntry {
  _id: string;
  '@timestamp': string;
  action_type: string;
  actor: string | null;
  episode_id: string | null;
  group_hash: string | null;
  tags: string[] | null;
  assignee_uid: string | null;
  expiry: string | null;
  reason: string | null;
}

export { DEFAULT_ACTIONS_HISTORY_PAGE_SIZE };

export type BuildEpisodeActionsHistoryQueryOptions = BuildEpisodeActionsHistoryQueryOptionsCommon;

/**
 * Returns individual action records for an episode (both episode-level and group-level),
 * sorted newest-first, one keyset page at a time.
 */
export const buildEpisodeActionsHistoryQuery = (
  spaceId: string,
  episodeId: string,
  groupHash: string,
  options?: BuildEpisodeActionsHistoryQueryOptions
) => buildEpisodeActionsHistoryQueryCommon(spaceId, episodeId, groupHash, options);
