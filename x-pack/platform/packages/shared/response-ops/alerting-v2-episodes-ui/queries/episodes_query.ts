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
  buildEpisodesBaseQuery as buildEpisodesBaseQueryCommon,
  addEpisodeAggregation as addEpisodeAggregationCommon,
  ALERT_EPISODE_FIELDS as ALERT_EPISODE_FIELDS_COMMON,
  HISTOGRAM_EPISODE_LIMIT,
} from '@kbn/alerting-v2-common-queries';
import type {
  EpisodesFilterState as EpisodesFilterStateCommon,
  EpisodesSortState as EpisodesSortStateCommon,
} from '@kbn/alerting-v2-common-queries';
import { PAGE_SIZE_ESQL_VARIABLE } from '../constants';
import {
  EPISODE_SEVERITIES,
  EPISODE_SEVERITY_CHART_VALUE,
  EPISODE_SEVERITY_FILTER_NONE,
  isSupportedEpisodeSeverity,
  normalizeEpisodeSeverity,
} from '../components/severity/severity_utils';

export type EpisodesFilterState = EpisodesFilterStateCommon;
export type EpisodesSortState = EpisodesSortStateCommon;

export interface AlertEpisode {
  '@timestamp': string;
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  'rule.id': string;
  group_hash: string;
  first_timestamp: string;
  last_timestamp: string;
  duration: number;
  /** ISO timestamp of the first event where episode.status === 'active'. */
  triggered_at?: string;
  last_ack_action?: 'ack' | 'unack';
  last_assignee_uid?: string | null;
  last_snooze_action?: 'snooze' | 'unsnooze';
  snooze_expiry?: string;
  last_tags?: string[];
  /** JSON string from the latest **non-empty** alert `data` (see `addEpisodeAggregation`) */
  episode_data?: string | null;
  /** Latest top-level `severity` from a breached rule event, when present. */
  severity?: string | null;
}

/**
 * Raw ES|QL response shape before client-side normalization.
 */
export interface AlertEpisodeEsqlRow extends Omit<AlertEpisode, 'last_tags'> {
  last_tags?: string | string[] | null;
}

export const ALERT_EPISODE_FIELDS = ALERT_EPISODE_FIELDS_COMMON;

export const addEpisodeAggregation = addEpisodeAggregationCommon;

export const buildEpisodesBaseQuery = buildEpisodesBaseQueryCommon;

const ALLOWLISTED_SORT_FIELDS = new Set([
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'duration',
]);

const SEVERITY_SORT_FIELD = '_severity_sort';
const EPISODE_WITHOUT_SEVERITY_SORT_VALUE = -1;

const sanitizeSortField = (field: string) => {
  return ALLOWLISTED_SORT_FIELDS.has(field) ? field : '@timestamp';
};

const buildSeveritySortEval = (): string => {
  const cases = EPISODE_SEVERITIES.map(
    (severity) => `severity == "${severity}", ${EPISODE_SEVERITY_CHART_VALUE[severity]}`
  ).join(', ');

  return `EVAL ${SEVERITY_SORT_FIELD} = CASE(${cases}, ${EPISODE_WITHOUT_SEVERITY_SORT_VALUE})`;
};

const resolveSortField = (sortField: string): string => {
  if (sortField === 'severity') {
    return SEVERITY_SORT_FIELD;
  }

  return sanitizeSortField(sortField);
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

const addStatusFilter = (query: ComposerQuery, statuses: string[]) => {
  const validStatuses = statuses.filter((status): status is AlertEpisodeStatus =>
    (Object.values(ALERT_EPISODE_STATUS) as string[]).includes(status)
  );
  if (!validStatuses.length) {
    return;
  }
  if (validStatuses.length === 1) {
    query.where`\`episode.status\` == ${validStatuses[0]}`;
    return;
  }
  const inList = validStatuses.map((status) => escapeStringValue(status)).join(', ');
  query.pipe(`WHERE \`episode.status\` IN (${inList})`);
};

const addSeverityFilter = (query: ComposerQuery, severities: string[]) => {
  const severityValues = severities
    .filter((severity) => severity !== EPISODE_SEVERITY_FILTER_NONE)
    .filter(isSupportedEpisodeSeverity)
    .map(normalizeEpisodeSeverity);
  const includeNoSeverity = severities.includes(EPISODE_SEVERITY_FILTER_NONE);

  const parts: string[] = [];
  if (severityValues.length) {
    const inList = severityValues.map((severity) => escapeStringValue(severity)).join(', ');
    parts.push(`severity IN (${inList})`);
  }
  if (includeNoSeverity) {
    parts.push('severity IS NULL');
  }
  if (!parts.length) {
    return;
  }
  query.pipe(`WHERE ${parts.join(' OR ')}`);
};

const applyFilterState = (query: ComposerQuery, filterState: EpisodesFilterState): void => {
  if (filterState.status?.length) {
    addStatusFilter(query, filterState.status);
  }
  if (filterState.ruleId) {
    query.where`rule.id == ${filterState.ruleId}`;
  }
  if (filterState.groupHash) {
    query.where`group_hash == ${filterState.groupHash}`;
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

/**
 * Builds an ES|QL query for episodes request with sorting and filtering.
 *
 * Joins `.rule-events` and `.alert-actions` so that per-group action state
 * (snooze, tags) and per-episode action state (ack, assignee) are available
 * for filtering. `episode.status` is read directly from `.rule-events`.
 */
export const buildEpisodesQuery = (
  spaceId: string,
  sortState: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' },
  filterState?: EpisodesFilterState
): ComposerQuery => {
  const sortDir = sortState.sortDirection.toUpperCase() as 'ASC' | 'DESC';
  const pageSizeParam = esql.par(undefined, PAGE_SIZE_ESQL_VARIABLE);

  const query = buildEpisodesBaseQuery(spaceId, filterState?.queryString?.trim());

  if (filterState) {
    applyFilterState(query, filterState);
  }

  if (sortState.sortField === 'severity') {
    query.pipe(buildSeveritySortEval());
  }

  const sortField = resolveSortField(sortState.sortField);

  return query.sort([sortField, sortDir]).pipe`LIMIT ${pageSizeParam}`.keep(
    ...ALERT_EPISODE_FIELDS
  );
};

/**
 * Builds an ES|QL query that computes six KPI counts in a single STATS pass.
 * Uses indicator EVALs (CASE-based 0/1 columns) so all aggregations can share
 * one STATS command without sub-queries.
 *
 * Counts: active_alerts, firing_rules, assigned_to_me, unassigned, acknowledged, snoozed.
 */
export const buildEpisodesKpisQuery = (
  spaceId: string,
  currentUserUid?: string,
  filterState?: EpisodesFilterState
): string => {
  const query = buildEpisodesBaseQuery(spaceId, filterState?.queryString?.trim());

  if (filterState) {
    applyFilterState(query, filterState);
  }

  // prettier-ignore
  query
    .pipe`EVAL _active_rule_id = CASE(\`episode.status\` == "active", \`rule.id\`, null)`
    .pipe(
      currentUserUid
        ? `EVAL _assigned_to_me = CASE(last_assignee_uid == ${escapeStringValue(currentUserUid)}, 1, 0)`
        : `EVAL _assigned_to_me = 0`
    )
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

  return query.print('basic');
};

/**
 * Builds a lightweight ESQL query for histogram data.
 * Returns only the fields needed for overlap counting; no SORT.
 * Time range is applied by the caller via executeEsqlQuery's input.timeRange.
 */
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
