/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { escapeStringValue } from '@kbn/esql-utils';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import {
  ALERT_EVENTS_DATA_STREAM,
  ALERT_ACTIONS_DATA_STREAM,
  HISTOGRAM_EPISODE_LIMIT,
} from './constants';

export const ALERT_EPISODE_FIELDS = [
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'group_hash',
  'first_timestamp',
  'last_timestamp',
  'duration',
  'triggered_at',
  'last_ack_action',
  'last_assignee_uid',
  'last_snooze_action',
  'snooze_expiry',
  'last_tags',
  'episode_data',
  'severity',
  'space_id',
] as const;

export interface EpisodesFilterState {
  status?: string[] | null;
  /** Filter by one or more rule IDs (OR). */
  ruleIds?: string[] | null;
  /** Filter by one or more group hashes (OR). */
  groupHashes?: string[] | null;
  groupingValues?: Record<string, string | null> | null;
  queryString?: string | null;
  tags?: string[] | null;
  severity?: string[] | null;
  assigneeUid?: string;
}

export interface EpisodesSortState {
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

const EPISODE_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
const EPISODE_SEVERITY_CHART_VALUE: Record<string, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
const EPISODE_SEVERITY_FILTER_NONE = '__no_severity__';
const EPISODE_WITHOUT_SEVERITY_SORT_VALUE = -1;

const addGroupHashActionStats = (query: ComposerQuery) => {
  query
    .pipe`INLINE STATS last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze"),
                       snooze_expiry      = LAST(expiry, @timestamp)      WHERE action_type == "snooze",
                       last_tags          = LAST(tags, @timestamp)        WHERE action_type == "tag"
          BY group_hash`;
};

const addEpisodeIdActionStats = (query: ComposerQuery) => {
  query
    .pipe`EVAL episode_id = COALESCE(\`episode.id\`, episode_id)`
    .pipe`INLINE STATS last_ack_action      = LAST(action_type,  @timestamp) WHERE action_type IN ("ack", "unack"),
                       last_assignee_uid    = LAST(assignee_uid, @timestamp) WHERE action_type == "assign"
          BY episode_id`;
};

export const addEpisodeAggregation = (query: ComposerQuery) => {
  query
    .pipe`EVAL extracted_data = JSON_EXTRACT(_source, "data")`
    .pipe`INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp), triggered_at = MIN(@timestamp) WHERE \`episode.status\` == "active", episode_data = LAST(extracted_data, @timestamp) WHERE extracted_data != "{}", severity = LAST(severity, @timestamp) WHERE status == "breached" AND severity IS NOT NULL BY episode.id`
    .pipe`EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)`
    .pipe`WHERE @timestamp == last_timestamp`;
};

export const buildEpisodesBaseQuery = (spaceId: string, search?: string): ComposerQuery => {
  const query = esql.from([ALERT_EVENTS_DATA_STREAM, ALERT_ACTIONS_DATA_STREAM], ['_source'])
    .where`space_id == ${spaceId}`;

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    query.pipe(
      `WHERE ((type == "alert" AND QSTR(${escapeStringValue(
        trimmedSearch
      )})) OR (action_type IN ("snooze", "unsnooze", "tag", "ack", "unack", "assign")))`
    );
  } else {
    query.where`type == "alert" OR action_type IN ("snooze", "unsnooze", "tag", "ack", "unack", "assign")`;
  }

  addGroupHashActionStats(query);
  addEpisodeIdActionStats(query);
  query.where`type == "alert"`;
  addEpisodeAggregation(query);

  return query;
};

const addTagsFilter = (query: ComposerQuery, tags: string[]) => {
  const trimmed = tags.map((t) => t.trim()).filter(Boolean);
  if (trimmed.length === 0) return;
  if (trimmed.length === 1) {
    query.where`MV_CONTAINS(last_tags, ${trimmed[0]})`;
    return;
  }
  const clause = trimmed.map((t) => `MV_CONTAINS(last_tags, ${escapeStringValue(t)})`).join(' OR ');
  query.pipe(`WHERE (${clause})`);
};

const addStatusFilter = (query: ComposerQuery, statuses: string[]) => {
  const validStatuses = statuses.filter((status): status is AlertEpisodeStatus =>
    (Object.values(ALERT_EPISODE_STATUS) as string[]).includes(status)
  );
  if (!validStatuses.length) return;
  if (validStatuses.length === 1) {
    query.where`\`episode.status\` == ${validStatuses[0]}`;
    return;
  }
  const inList = validStatuses.map((status) => escapeStringValue(status)).join(', ');
  query.pipe(`WHERE \`episode.status\` IN (${inList})`);
};

const isSupportedEpisodeSeverity = (severity: string | undefined | null): severity is string => {
  if (!severity || typeof severity !== 'string') return false;
  return (EPISODE_SEVERITIES as readonly string[]).includes(severity.toLowerCase());
};

const normalizeEpisodeSeverity = (severity: string): string => severity.toLowerCase();

const addSeverityFilter = (query: ComposerQuery, severities: string[]) => {
  const severityValues = severities
    .filter((s) => s !== EPISODE_SEVERITY_FILTER_NONE)
    .filter(isSupportedEpisodeSeverity)
    .map(normalizeEpisodeSeverity);
  const includeNoSeverity = severities.includes(EPISODE_SEVERITY_FILTER_NONE);

  const parts: string[] = [];
  if (severityValues.length) {
    const inList = severityValues.map((s) => escapeStringValue(s)).join(', ');
    parts.push(`severity IN (${inList})`);
  }
  if (includeNoSeverity) {
    parts.push('severity IS NULL');
  }
  if (!parts.length) return;
  query.pipe(`WHERE ${parts.join(' OR ')}`);
};

export const applyFilterState = (query: ComposerQuery, filterState: EpisodesFilterState): void => {
  if (filterState.status?.length) {
    addStatusFilter(query, filterState.status);
  }

  const ruleIds = filterState.ruleIds?.filter(Boolean) ?? [];
  if (ruleIds.length === 1) {
    query.where`rule.id == ${ruleIds[0]}`;
  } else if (ruleIds.length > 1) {
    const inList = ruleIds.map((id) => escapeStringValue(id)).join(', ');
    query.pipe(`WHERE \`rule.id\` IN (${inList})`);
  }

  const groupHashes = filterState.groupHashes?.filter(Boolean) ?? [];
  if (groupHashes.length === 1) {
    query.where`group_hash == ${groupHashes[0]}`;
  } else if (groupHashes.length > 1) {
    const inList = groupHashes.map((hash) => escapeStringValue(hash)).join(', ');
    query.pipe(`WHERE group_hash IN (${inList})`);
  }

  if (filterState.tags?.length) {
    addTagsFilter(query, filterState.tags);
  }
  if (filterState.severity?.length) {
    addSeverityFilter(query, filterState.severity);
  }
  if (filterState.assigneeUid) {
    query.where`last_assignee_uid == ${filterState.assigneeUid}`;
  }
};

const ALLOWLISTED_SORT_FIELDS = new Set([
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'duration',
  'first_timestamp',
  'last_timestamp',
]);

const SEVERITY_SORT_FIELD = '_severity_sort';

const sanitizeSortField = (field: string) =>
  ALLOWLISTED_SORT_FIELDS.has(field) ? field : '@timestamp';

const buildSeveritySortEval = (): string => {
  const cases = EPISODE_SEVERITIES.map(
    (severity) => `severity == "${severity}", ${EPISODE_SEVERITY_CHART_VALUE[severity]}`
  ).join(', ');
  return `EVAL ${SEVERITY_SORT_FIELD} = CASE(${cases}, ${EPISODE_WITHOUT_SEVERITY_SORT_VALUE})`;
};

const resolveSortField = (sortField: string): string =>
  sortField === 'severity' ? SEVERITY_SORT_FIELD : sanitizeSortField(sortField);

export const buildEpisodesQuery = (
  spaceId: string,
  sortState: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' },
  filterState?: EpisodesFilterState,
  pageSizeVariable?: string
): ComposerQuery => {
  const sortDir = sortState.sortDirection.toUpperCase() as 'ASC' | 'DESC';

  const query = buildEpisodesBaseQuery(spaceId, filterState?.queryString?.trim());

  if (filterState) {
    applyFilterState(query, filterState);
  }

  if (sortState.sortField === 'severity') {
    query.pipe(buildSeveritySortEval());
  }

  const sortField = resolveSortField(sortState.sortField);
  query.sort([sortField, sortDir]);

  if (pageSizeVariable) {
    const pageSizeParam = esql.par(undefined, pageSizeVariable);
    query.pipe`LIMIT ${pageSizeParam}`;
  }

  return query.keep(...ALERT_EPISODE_FIELDS);
};

export const buildEpisodesKpisQuery = (
  spaceId: string,
  currentUserUid?: string,
  filterState?: EpisodesFilterState
): ComposerQuery => {
  const query = buildEpisodesBaseQuery(spaceId, filterState?.queryString?.trim());

  if (filterState) {
    applyFilterState(query, filterState);
  }

  query
    .pipe`EVAL _active_rule_id = CASE(\`episode.status\` == "active", \`rule.id\`, null)`;

  if (currentUserUid) {
    query.pipe(
      `EVAL _assigned_to_me = CASE(last_assignee_uid == ${escapeStringValue(currentUserUid)}, 1, 0)`
    );
  } else {
    query.pipe`EVAL _assigned_to_me = 0`;
  }

  query
    .pipe`EVAL _is_unassigned  = CASE(last_assignee_uid IS NULL, 1, 0)`
    .pipe`EVAL _is_acked       = CASE(last_ack_action == "ack", 1, 0)`
    .pipe`EVAL _is_snoozed     = CASE(last_snooze_action == "snooze" AND (snooze_expiry IS NULL OR TO_DATETIME(snooze_expiry) > NOW()), 1, 0)`
    .pipe`STATS
      alerts_count   = COUNT(*),
      firing_rules   = COUNT_DISTINCT(_active_rule_id),
      assigned_to_me = SUM(_assigned_to_me),
      unassigned     = SUM(_is_unassigned),
      acknowledged   = SUM(_is_acked),
      snoozed        = SUM(_is_snoozed)`;

  return query;
};

export const buildEpisodesHistogramQuery = (
  spaceId: string,
  filterState?: EpisodesFilterState,
  breakdownField?: string
): ComposerQuery => {
  const query = buildEpisodesBaseQuery(spaceId, filterState?.queryString?.trim());

  if (filterState) {
    applyFilterState(query, filterState);
  }

  const keepFields = [
    ...new Set(
      ['first_timestamp', 'last_timestamp', 'episode.status', breakdownField].filter(
        (f): f is string => Boolean(f)
      )
    ),
  ];

  return query.keep(...(keepFields as [string, ...string[]])).limit(HISTOGRAM_EPISODE_LIMIT);
};
