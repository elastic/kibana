/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM } from '../constants';

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

export const DEFAULT_ACTIONS_HISTORY_PAGE_SIZE = 25;

export interface BuildEpisodeActionsHistoryQueryOptions {
  /** Keyset cursor: only return records at or before this timestamp (exclusive on refetch, see hook dedup). */
  before?: string;
  /** Page size. Defaults to {@link DEFAULT_ACTIONS_HISTORY_PAGE_SIZE}. */
  limit?: number;
}

/**
 * Returns individual action records for an episode (both episode-level and group-level),
 * sorted newest-first, one keyset page at a time. Non-aggregating counterpart to
 * buildEpisodeActionsQuery. `_id` is projected via `METADATA _id` so callers can dedup records
 * that straddle a page boundary (the `before` cursor is inclusive to avoid dropping same-timestamp
 * records split across pages).
 */
export const buildEpisodeActionsHistoryQuery = (
  spaceId: string,
  episodeId: string,
  groupHash: string,
  { before, limit = DEFAULT_ACTIONS_HISTORY_PAGE_SIZE }: BuildEpisodeActionsHistoryQueryOptions = {}
) => {
  // prettier-ignore
  const query = esql
    .from([ALERT_ACTIONS_DATA_STREAM], ['_id'])
    .where`space_id == ${spaceId}`
    .where`episode_id == ${episodeId} OR (group_hash == ${groupHash} AND episode_id IS NULL)`
    .where`action_type IN ("ack", "unack", "snooze", "unsnooze", "deactivate", "activate", "tag", "assign")`;

  if (before) {
    query.where`@timestamp <= ${before}`;
  }

  return query
    .sort(['@timestamp', 'DESC'])
    .limit(limit)
    .keep(
      '_id',
      '@timestamp',
      'action_type',
      'actor',
      'episode_id',
      'group_hash',
      'tags',
      'assignee_uid',
      'expiry',
      'reason'
    );
};
