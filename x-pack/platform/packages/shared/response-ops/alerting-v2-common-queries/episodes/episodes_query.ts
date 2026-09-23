/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { escapeStringValue } from '@kbn/esql-utils';
import { ALERT_ACTIONS_DATA_STREAM, ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import {
  ALERT_EPISODE_STATUS,
  type AlertEpisode,
  type AlertEpisodeStatus,
} from '@kbn/alerting-v2-schemas';
import { PAGE_SIZE_ESQL_VARIABLE } from './constants';
import {
  EPISODE_SEVERITIES,
  EPISODE_SEVERITY_CHART_VALUE,
  EPISODE_SEVERITY_FILTER_NONE,
  isSupportedEpisodeSeverity,
  normalizeEpisodeSeverity,
} from './episode_severity';
import { asTypedEsqlQuery, type TypedEsqlQuery } from './typed_esql_query';

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
  'triggered_at',
  'last_ack_action',
  'last_assignee_uid',
  'last_snooze_action',
  'snooze_expiry',
  'last_tags',
  'episode_data',
  'severity',
] as const;

export interface EpisodesFilterState {
  /** Status values (OR). Empty/undefined shows all statuses. */
  status?: string[] | null;
  /** Rule ID or null */
  ruleId?: string | null;
  /** Group hash — narrows to a single per-rule series (used for deep-links from rule details). */
  groupHash?: string | null;
  /**
   * Display-only companion to `groupHash`. When a deep-link carries the
   * resolved grouping field values (e.g. `{ "host.name": "web-01" }`), the
   * destination chip can render `host=web-01` without re-running the DSL
   * lookup. Does NOT affect the query — `buildEpisodesQuery` ignores it.
   */
  groupingValues?: Record<string, string | null> | null;
  /** Query string for full-text search */
  queryString?: string | null;
  /** Tag values — episodes matching any selected tag (OR) */
  tags?: string[] | null;
  /** Severity values (OR). Includes EPISODE_SEVERITY_FILTER_NONE for episodes without severity. */
  severity?: string[] | null;
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

export interface EpisodeAggregationOptions {
  /**
   * Keep the last `breached` event of each episode instead of its last event,
   * so `addEpisodeDataExtraction` can read the episode `data` from its
   * `_source` (recovered events write `data: {}`). The row-level `@timestamp`
   * and `episode.status` are replaced with the aggregated values, so the row
   * still describes the latest state. Costs two extra aggregations (~10% on
   * the KPI query), so leave it off when `episode_data` is never read.
   */
  withEpisodeDataRow?: boolean;
}

export const addEpisodeAggregation = (
  query: ComposerQuery,
  { withEpisodeDataRow = false }: EpisodeAggregationOptions = {}
) => {
  /* This will be simplified when the `$.alerting-episodes` ES|QL view works. */

  if (withEpisodeDataRow) {
    // prettier-ignore
    query
      .pipe`INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp), triggered_at = MIN(@timestamp) WHERE \`episode.status\` == "active", start_event_timestamp = MIN(@timestamp) WHERE \`episode.status\` == "pending" AND \`episode.status_count\` == 1, data_timestamp = MAX(@timestamp) WHERE status == "breached", last_status = LAST(\`episode.status\`, @timestamp), severity = LAST(severity, @timestamp) WHERE status == "breached" AND severity IS NOT NULL BY episode.id`
      .pipe`EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)`
      .pipe`WHERE @timestamp == COALESCE(data_timestamp, last_timestamp)`
      .pipe`EVAL @timestamp = last_timestamp, \`episode.status\` = last_status`;
    return;
  }

  // prettier-ignore
  query
    .pipe`INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp), triggered_at = MIN(@timestamp) WHERE \`episode.status\` == "active", start_event_timestamp = MIN(@timestamp) WHERE \`episode.status\` == "pending" AND \`episode.status_count\` == 1, severity = LAST(severity, @timestamp) WHERE status == "breached" AND severity IS NOT NULL BY episode.id`
    .pipe`EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)`
    .pipe`WHERE @timestamp == last_timestamp`;
};

/**
 * Reads the episode `data` JSON from the `_source` of the row kept by
 * `addEpisodeAggregation` (which needs `withEpisodeDataRow`). Call it after
 * `SORT ... | LIMIT`: ES|QL loads `_source` after the TopN operator, so only
 * the returned rows pay for it. Extracting before the aggregation loaded
 * `_source` for every scanned event and cost more than the rest of the query
 * (3.3s vs 1.9s for a 24h range over 600k events / 27k episodes).
 */
export const addEpisodeDataExtraction = (query: ComposerQuery) => {
  query.pipe`EVAL episode_data = JSON_EXTRACT(_source, "data")`;
};

const addGroupHashActionStats = (query: ComposerQuery) => {
  // prettier-ignore
  query
    .pipe`INLINE STATS last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze"),
                       snooze_expiry      = LAST(expiry, @timestamp)      WHERE action_type == "snooze",
                       first_series_event_timestamp = MIN(@timestamp)    WHERE type == "alert"
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
                       last_assignee_uid    = LAST(assignee_uid, @timestamp) WHERE action_type == "assign",
                       last_tags            = LAST(tags,         @timestamp) WHERE action_type == "tag"
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

/**
 * Applies the filters that must run after the aggregations: they either read
 * columns the aggregations compute (tags, severity, assignee) or must only
 * narrow the aggregated rows (status). `ruleId`, `groupHash` and `queryString`
 * are applied before the aggregations by `buildEpisodesBaseQuery` instead.
 */
export const applyFilterState = (query: ComposerQuery, filterState: EpisodesFilterState): void => {
  if (filterState.status?.length) {
    addStatusFilter(query, filterState.status);
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
 * Filters `buildEpisodesBaseQuery` can apply before the aggregations. A
 * subset of {@link EpisodesFilterState} — the other filters need the columns
 * the aggregations compute, so they run after via `applyFilterState`.
 */
export type EpisodesBaseFilterState = Pick<
  EpisodesFilterState,
  'queryString' | 'ruleId' | 'groupHash'
>;

/**
 * Builds an ES|QL query that aggregates episode data from `.rule-events` and
 * `.alert-actions` (last tags per group_hash, last ack / assignee per
 * episode) and narrows to alert episode rows.
 *
 * `episode.status` comes straight from `.rule-events`. User-initiated
 * `deactivate` / `activate` actions also write a synthetic `.rule-events`
 * doc, so the column is always current — callers do **not** derive an
 * `effective_status` by joining `.alert-actions` audit rows back in.
 */
export const buildEpisodesBaseQuery = (
  spaceId: string,
  filterState?: EpisodesBaseFilterState,
  aggregationOptions?: EpisodeAggregationOptions
): ComposerQuery => {
  const query = esql.from([ALERT_EVENTS_DATA_STREAM, ALERT_ACTIONS_DATA_STREAM], ['_source'])
    .where`space_id == ${spaceId}`;

  // Narrowing to a single rule or series before the INLINE STATS lets ES skip
  // the space-wide aggregation: all the event and action docs of an episode
  // carry its rule id and `group_hash`, so the aggregated rows are identical.
  if (filterState?.ruleId) {
    // `.rule-events` docs carry the nested `rule.id`, `.alert-actions` docs
    // the flat `rule_id` — match both so action docs aren't dropped.
    query.where`rule.id == ${filterState.ruleId} OR rule_id == ${filterState.ruleId}`;
  }
  if (filterState?.groupHash) {
    query.where`group_hash == ${filterState.groupHash}`;
  }

  const trimmedSearch = filterState?.queryString?.trim();
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
  addEpisodeAggregation(query, aggregationOptions);

  return query;
};

/**
 * Whether the filters read the action state columns, so they can only be
 * applied by the joined `buildEpisodesQuery`, not by `buildEpisodesListQuery`.
 */
export const episodesFilterNeedsActions = (filterState?: EpisodesFilterState): boolean =>
  Boolean(filterState?.tags?.length || filterState?.assigneeUid);

export const DURATION_LOWER_BOUND_FIELD = 'duration_is_lower_bound';
/**
 * Flags the episodes whose first event was not part of the scanned rows, so
 * `first_timestamp` and `duration` only cover the selected time range. The
 * start was seen when the earliest row is the event that opened the episode
 * (`pending` with `status_count` 1), or when an earlier alert event of the
 * same series is present, which can only belong to a previous episode. Rules
 * that skip the pending state and have no earlier episode in range still get
 * the flag: showing a lower bound is always true, hiding a truncation is not.
 */
const addDurationLowerBoundFlag = (query: ComposerQuery) => {
  // prettier-ignore
  query.pipe(
    `EVAL ${DURATION_LOWER_BOUND_FIELD} = (start_event_timestamp IS NULL OR start_event_timestamp != first_timestamp) AND first_series_event_timestamp >= first_timestamp`
  );
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
): TypedEsqlQuery<AlertEpisodeEsqlRow> => {
  const sortDir = sortState.sortDirection.toUpperCase() as 'ASC' | 'DESC';
  const pageSizeParam = esql.par(undefined, PAGE_SIZE_ESQL_VARIABLE);

  const query = buildEpisodesBaseQuery(spaceId, filterState, { withEpisodeDataRow: true });

  if (filterState) {
    applyFilterState(query, filterState);
  }

  if (sortState.sortField === 'severity') {
    query.pipe(buildSeveritySortEval());
  }

  const sortField = resolveSortField(sortState.sortField);

  addDurationLowerBoundFlag(query);

  query.sort([sortField, sortDir]).pipe`LIMIT ${pageSizeParam}`;
  addEpisodeDataExtraction(query);

  return asTypedEsqlQuery<AlertEpisodeEsqlRow>(
    query.keep(...ALERT_EPISODE_FIELDS, DURATION_LOWER_BOUND_FIELD)
  );
};

/**
 * Row of `buildEpisodesListQuery`: the columns needed to page, sort and
 * filter. `first_timestamp`, `last_timestamp` and `duration` only cover the
 * scanned range, the page lookups (`episodes_page_lookups_query.ts`) replace
 * them with the exact values and fill in the rest.
 */
export type EpisodesListRow = Pick<
  AlertEpisodeEsqlRow,
  | '@timestamp'
  | 'episode.id'
  | 'episode.status'
  | 'rule.id'
  | 'group_hash'
  | 'first_timestamp'
  | 'last_timestamp'
  | 'duration'
> & {
  severity?: AlertEpisodeEsqlRow['severity'];
};

export const ALERT_EPISODE_LIST_FIELDS = [
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'group_hash',
  'first_timestamp',
  'last_timestamp',
  'duration',
] as const;

/**
 * Builds the ES|QL query that pages the episodes from `.rule-events` alone,
 * with a plain `STATS` and as few aggregates as the sort and filters need.
 * Measured on 620k events / 27k episodes: ~150ms against 1.75s for
 * `buildEpisodesQuery`, whose `.alert-actions` join scans every action doc
 * regardless of the time range and whose `INLINE STATS` keeps every event
 * row. Each aggregate here costs 15-70ms and a row-level `EVAL` before the
 * `STATS` ten times that, so the per-page columns (`triggered_at`,
 * `severity`, `episode_data`, action state) come from the lookups in
 * `episodes_page_lookups_query.ts` instead.
 *
 * Tag and assignee filters read the action state, so they still need
 * `buildEpisodesQuery`: see `episodesFilterNeedsActions`.
 */
export const buildEpisodesListQuery = (
  spaceId: string,
  sortState: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' },
  filterState?: EpisodesFilterState
): TypedEsqlQuery<EpisodesListRow> => {
  if (episodesFilterNeedsActions(filterState)) {
    throw new Error('Tag and assignee filters need the actions join, use buildEpisodesQuery');
  }
  const sortDir = sortState.sortDirection.toUpperCase() as 'ASC' | 'DESC';
  const pageSizeParam = esql.par(undefined, PAGE_SIZE_ESQL_VARIABLE);
  const withSeverity = sortState.sortField === 'severity' || Boolean(filterState?.severity?.length);

  const query = esql.from(ALERT_EVENTS_DATA_STREAM).where`space_id == ${spaceId}`
    .where`type == "alert"`;
  if (filterState?.ruleId) {
    query.where`rule.id == ${filterState.ruleId}`;
  }
  if (filterState?.groupHash) {
    query.where`group_hash == ${filterState.groupHash}`;
  }
  const trimmedSearch = filterState?.queryString?.trim();
  if (trimmedSearch) {
    query.pipe(`WHERE QSTR(${escapeStringValue(trimmedSearch)})`);
  }

  // `rule.id` and `group_hash` are constant within an episode, MAX is cheaper
  // than LAST for keywords.
  const aggregates = [
    'last_timestamp = MAX(@timestamp)',
    'first_timestamp = MIN(@timestamp)',
    '`episode.status` = LAST(`episode.status`, @timestamp)',
    '`rule.id` = MAX(`rule.id`)',
    'group_hash = MAX(group_hash)',
    ...(withSeverity
      ? [
          'severity = LAST(severity, @timestamp) WHERE status == "breached" AND severity IS NOT NULL',
        ]
      : []),
  ];
  query.pipe(`STATS ${aggregates.join(', ')} BY \`episode.id\``);
  query.pipe`EVAL @timestamp = last_timestamp, duration = DATE_DIFF("ms", first_timestamp, last_timestamp)`;

  if (filterState) {
    applyFilterState(query, filterState);
  }
  if (sortState.sortField === 'severity') {
    query.pipe(buildSeveritySortEval());
  }
  query.sort([resolveSortField(sortState.sortField), sortDir]).pipe`LIMIT ${pageSizeParam}`;

  return asTypedEsqlQuery<EpisodesListRow>(
    query.keep(...ALERT_EPISODE_LIST_FIELDS, ...(withSeverity ? ['severity' as const] : []))
  );
};
