/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM, DEFAULT_ACTIONS_HISTORY_PAGE_SIZE } from './constants';

export interface BuildEpisodeActionsHistoryQueryOptions {
  before?: string;
  limit?: number;
}

export const buildEpisodeActionsHistoryQuery = (
  spaceId: string,
  episodeId: string,
  groupHash: string,
  { before, limit = DEFAULT_ACTIONS_HISTORY_PAGE_SIZE }: BuildEpisodeActionsHistoryQueryOptions = {}
): ComposerQuery => {
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
