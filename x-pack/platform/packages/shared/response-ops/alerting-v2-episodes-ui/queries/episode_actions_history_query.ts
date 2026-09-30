/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodeActionsHistoryQuery as buildEpisodeActionsHistoryQueryCommon } from '@kbn/alerting-v2-common-queries';
import type { BuildEpisodeActionsHistoryQueryOptions as BuildEpisodeActionsHistoryQueryOptionsCommon } from '@kbn/alerting-v2-common-queries';

export const DEFAULT_ACTIONS_HISTORY_PAGE_SIZE = 25;

export type BuildEpisodeActionsHistoryQueryOptions = Omit<
  BuildEpisodeActionsHistoryQueryOptionsCommon,
  'limit'
> & {
  /** Page size. Defaults to {@link DEFAULT_ACTIONS_HISTORY_PAGE_SIZE}. */
  limit?: number;
};

/**
 * Returns individual action records for an episode (both episode-level and group-level),
 * sorted newest-first, one keyset page at a time.
 */
export const buildEpisodeActionsHistoryQuery = (
  spaceId: string,
  episodeId: string,
  groupHash: string,
  { before, limit = DEFAULT_ACTIONS_HISTORY_PAGE_SIZE }: BuildEpisodeActionsHistoryQueryOptions = {}
) =>
  buildEpisodeActionsHistoryQueryCommon(spaceId, episodeId, groupHash, {
    before,
    limit,
  });
