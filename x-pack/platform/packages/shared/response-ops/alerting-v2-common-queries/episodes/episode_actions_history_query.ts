/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { asTypedEsqlQuery, type TypedEsqlQuery } from './typed_esql_query';

/**
 * Who performed an action: a user (with a profile uid when one could be resolved) or Kibana
 * itself (`internal`, e.g. the dispatcher).
 */
export interface EpisodeActionActor {
  type: 'user' | 'internal';
  profile_uid: string | null;
}

/**
 * Raw ES|QL row shape — `tags` may arrive as a string when ES|QL collapses a single-value
 * multivalue field, and the `actor` object arrives as its two leaf columns.
 */
export interface RawEpisodeActionHistoryEntry {
  _id: string;
  '@timestamp': string;
  action_type: string;
  'actor.type': EpisodeActionActor['type'];
  'actor.profile_uid': string | null;
  alert_id: string | null;
  group_hash: string | null;
  tags?: string | string[] | null;
  assignee_uid: string | null;
  expiry: string | null;
  reason: string | null;
}

/** Normalized entry with `tags` guaranteed to be a string array and `actor` folded into an object. */
export interface EpisodeActionHistoryEntry {
  _id: string;
  '@timestamp': string;
  action_type: string;
  actor: EpisodeActionActor;
  alert_id: string | null;
  group_hash: string | null;
  tags: string[];
  assignee_uid: string | null;
  expiry: string | null;
  reason: string | null;
}

export interface BuildEpisodeActionsHistoryQueryOptions {
  /** Keyset cursor: only return records at or before this timestamp. */
  before?: string;
  /** Page size — owned by the caller (e.g. UI default). */
  limit: number;
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
  { before, limit }: BuildEpisodeActionsHistoryQueryOptions
): TypedEsqlQuery<RawEpisodeActionHistoryEntry> => {
  // prettier-ignore
  const query = esql
    .from([ALERT_ACTIONS_DATA_STREAM], ['_id'])
    .where`space_id == ${spaceId}`
    .where`alert_id == ${episodeId} OR (group_hash == ${groupHash} AND alert_id IS NULL)`
    .where`action_type IN ("ack", "unack", "snooze", "unsnooze", "deactivate", "activate", "tag", "assign")`;

  if (before) {
    query.where`@timestamp <= ${before}`;
  }

  return asTypedEsqlQuery<RawEpisodeActionHistoryEntry>(
    query
      .sort(['@timestamp', 'DESC'])
      .limit(limit)
      .keep(
        '_id',
        '@timestamp',
        'action_type',
        'actor.type',
        'actor.profile_uid',
        'alert_id',
        'group_hash',
        'tags',
        'assignee_uid',
        'expiry',
        'reason'
      )
  );
};

/** Folds the raw `actor.*` leaf columns of a history row into an {@link EpisodeActionActor}. */
export const toEpisodeActionActor = (
  row: Pick<RawEpisodeActionHistoryEntry, 'actor.type' | 'actor.profile_uid'>
): EpisodeActionActor => ({
  type: row['actor.type'],
  profile_uid: row['actor.profile_uid'] ?? null,
});
