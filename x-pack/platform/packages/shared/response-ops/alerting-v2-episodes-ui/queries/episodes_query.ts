/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { escapeStringValue } from '@kbn/esql-utils/src/utils/append_to_query/utils';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import {
  ALERT_EVENTS_DATA_STREAM,
  ALERT_ACTIONS_DATA_STREAM,
  PAGE_SIZE_ESQL_VARIABLE,
} from '../constants';

export interface AlertEpisode {
  '@timestamp': string;
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  'rule.id': string;
  group_hash: string;
  first_timestamp: string;
  last_timestamp: string;
  duration: number;
  last_ack_action?: 'ack' | 'unack';
  last_assignee_uid?: string | null;
  last_snooze_action?: 'snooze' | 'unsnooze';
  snooze_expiry?: string;
  last_deactivate_action?: 'activate' | 'deactivate';
  last_tags?: string[];
  /** JSON string from the latest **non-empty** alert `data` (see `addEpisodeAggregation`) */
  episode_data?: string | null;
}

/**
 * Raw ES|QL response shape before client-side normalization.
 */
export interface AlertEpisodeEsqlRow extends Omit<AlertEpisode, 'last_tags'> {
  last_tags?: string | string[] | null;
}

export const ALERT_EPISODE_FIELDS = [
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'group_hash',
  'first_timestamp',
  'last_timestamp',
  'duration',
  'last_ack_action',
  'last_assignee_uid',
  'last_snooze_action',
  'snooze_expiry',
  'last_deactivate_action',
  'last_tags',
  'episode_data',
] as const;

export interface EpisodesFilterState {
  /** Single episode status (inactive | pending | active | recovering) or null for All */
  status?: string | null;
  /** Rule ID or null */
  ruleId?: string | null;
  /** Query string for full-text search */
  queryString?: string | null;
  /** Tag values — episodes matching any selected tag (OR) */
  tags?: string[] | null;
  /** Assignee UID — episodes whose last assignee matches this user profile UID */
  assigneeUid?: string;
}

export interface EpisodesSortState {
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

const ALLOWLISTED_SORT_FIELDS = new Set([
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'duration',
]);

const sanitizeSortField = (field: string) => {
  return ALLOWLISTED_SORT_FIELDS.has(field) ? field : '@timestamp';
};

export const addEpisodeAggregation = (query: ComposerQuery) => {
  /* This will be simplified when the `$.alerting-episodes` ES|QL view works.
   * Matches `buildEpisodeEventDataQuery` and `buildRelatedEpisodesQuery`.
   */

  // prettier-ignore
  query
    .pipe`EVAL extracted_data = JSON_EXTRACT(_source, "data")`
    .pipe`INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp), episode_data = LAST(extracted_data, @timestamp) WHERE extracted_data != "{}" BY episode.id`
    .pipe`EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)`
    .pipe`WHERE @timestamp == last_timestamp`;
};

const addGroupHashActionStats = (query: ComposerQuery) => {
  // prettier-ignore
  query
    .pipe`INLINE STATS last_deactivate_action = LAST(action_type, @timestamp) WHERE action_type IN ("deactivate", "activate"),
                       last_snooze_action     = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze"),
                       snooze_expiry          = LAST(expiry, @timestamp)      WHERE action_type == "snooze",
                       last_tags              = LAST(tags, @timestamp)        WHERE action_type == "tag"
          BY group_hash`;
};

const addEpisodeIdActionStats = (query: ComposerQuery) => {
  // `.rule-events` documents carry the nested `episode.id`, while `.alert-actions`
  // documents carry a flat `episode_id` — unify them so INLINE STATS groups both
  // sides under the same key.
  // prettier-ignore
  query
    .pipe`EVAL episode_id = COALESCE(\`episode.id\`, episode_id)`
    .pipe`INLINE STATS last_ack_action      = LAST(action_type,  @timestamp) WHERE action_type IN ("ack", "unack"),
                       last_assignee_uid    = LAST(assignee_uid, @timestamp) WHERE action_type == "assign"
          BY episode_id`;
};

const addTagsFilter = (query: ComposerQuery, tags: string[]) => {
  const trimmed = tags.map((t) => t.trim()).filter(Boolean);
  if (trimmed.length === 0) {
    return;
  }
  if (trimmed.length === 1) {
    query.where`MV_CONTAINS(last_tags, ${trimmed[0]})`;
    return;
  }
  const clause = trimmed.map((t) => `MV_CONTAINS(last_tags, ${escapeStringValue(t)})`).join(' OR ');
  query.pipe(`WHERE (${clause})`);
};

/**
 * Builds an ES|QL query that aggregates episode data from `.rule-events` and
 * `.alert-actions` (last tags / deactivate state per group_hash, last assignee per episode),
 * then narrows to episode rows and derives `effective_status`.
 */
export const buildEpisodesBaseQuery = (search?: string): ComposerQuery => {
  const query = esql.from([ALERT_EVENTS_DATA_STREAM, ALERT_ACTIONS_DATA_STREAM], ['_source']);

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    query.pipe(
      `WHERE ((type == "alert" AND QSTR(${escapeStringValue(
        trimmedSearch
      )})) OR (action_type IN ("deactivate", "activate", "snooze", "unsnooze", "tag", "ack", "unack", "assign")))`
    );
  } else {
    query.where`type == "alert" OR action_type IN ("deactivate", "activate", "snooze", "unsnooze", "tag", "ack", "unack", "assign")`;
  }

  addGroupHashActionStats(query);
  addEpisodeIdActionStats(query);
  query.where`type == "alert"`;
  addEpisodeAggregation(query);
  // Derive effective status: overridden to "inactive" when the latest action is "deactivate"
  query.pipe`EVAL effective_status = CASE(last_deactivate_action == "deactivate", "inactive", \`episode.status\`)`;

  return query;
};

/**
 * Builds an ES|QL query for episodes request with sorting and filtering.
 *
 * Joins `.rule-events` and `.alert-actions` so that user-driven deactivation
 * is reflected in an `effective_status` column, and per-episode assignee info
 * is available for `assigneeUid` filtering.
 */
export const buildEpisodesQuery = (
  sortState: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' },
  filterState?: EpisodesFilterState
): ComposerQuery => {
  const sortField = sanitizeSortField(sortState.sortField);
  const sortDir = sortState.sortDirection.toUpperCase() as 'ASC' | 'DESC';
  const pageSizeParam = esql.par(undefined, PAGE_SIZE_ESQL_VARIABLE);

  const query = buildEpisodesBaseQuery(filterState?.queryString?.trim());

  if (filterState?.status) {
    query.where`effective_status == ${filterState.status}`;
  }

  if (filterState?.ruleId) {
    query.where`rule.id == ${filterState.ruleId}`;
  }

  if (filterState?.tags?.length) {
    addTagsFilter(query, filterState.tags);
  }

  if (filterState?.assigneeUid) {
    query.where`last_assignee_uid == ${filterState.assigneeUid}`;
  }

  return query.sort([sortField, sortDir]).pipe`LIMIT ${pageSizeParam}`.keep(
    ...ALERT_EPISODE_FIELDS
  );
};
