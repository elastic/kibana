/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils/src/utils/append_to_query/utils';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODES_ENRICHED_VIEW_NAME } from '../../resources/esql_views/alert_episodes_enriched';
import { CLASSIC_ALERTS_VIEW_NAME } from '../../resources/esql_views/classic_alerts';
import { buildV1AuthzWhereExpression, type AuthorizedRuleTypesLike } from './build_v1_authz_where';

export interface UnifiedEpisodesSortState {
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

export interface UnifiedEpisodesFilterState {
  status?: string[] | null;
  ruleId?: string | null;
  groupHash?: string | null;
  queryString?: string | null;
  tags?: string[] | null;
  severity?: string[] | null;
  assigneeUid?: string;
}

export interface BuildUnifiedEpisodesQueryParams {
  spaceId: string;
  pageSize: number;
  sortState?: UnifiedEpisodesSortState;
  filterState?: UnifiedEpisodesFilterState;
  /**
   * When provided, classic rows are filtered to authorized rule types.
   * When omitted/empty, only v2 rows (no `kibana.alert.rule.rule_type_id`) pass.
   */
  authorizedRuleTypes?: AuthorizedRuleTypesLike | null;
  /**
   * When false, query only the enriched v2 view (no classic alerts).
   * Default true.
   */
  includeClassicAlerts?: boolean;
}

const EPISODE_FIELDS = [
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

const CLASSIC_ONLY_FIELDS = ['_is_v1', '_v1_rule_name'] as const;

const ALLOWLISTED_SORT_FIELDS = new Set([
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'duration',
]);

const SEVERITY_SORT_FIELD = '_severity_sort';
const EPISODE_WITHOUT_SEVERITY_SORT_VALUE = -1;
const MAX_PAGE_SIZE = 1000;

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

const EPISODE_SEVERITY_FILTER_NONE = 'none';
const SUPPORTED_SEVERITIES = new Set(Object.keys(SEVERITY_RANK));

const buildSeveritySortEval = (): string => {
  const cases = Object.entries(SEVERITY_RANK)
    .map(([severity, rank]) => `severity == ${escapeStringValue(severity)}, ${rank}`)
    .join(', ');
  return `EVAL ${SEVERITY_SORT_FIELD} = CASE(${cases}, ${EPISODE_WITHOUT_SEVERITY_SORT_VALUE})`;
};

const resolveSortField = (sortField: string): string => {
  if (sortField === 'severity') {
    return SEVERITY_SORT_FIELD;
  }
  return ALLOWLISTED_SORT_FIELDS.has(sortField) ? sortField : '@timestamp';
};

const buildSpaceWhere = (spaceId: string): string => {
  const escaped = escapeStringValue(spaceId);
  return `(space_id == ${escaped} OR MV_CONTAINS(\`kibana.space_ids\`, ${escaped}) OR MV_CONTAINS(\`kibana.space_ids\`, "*"))`;
};

const appendFilterClauses = (filterState: UnifiedEpisodesFilterState | undefined): string[] => {
  if (!filterState) {
    return [];
  }

  const clauses: string[] = [];

  if (filterState.status?.length) {
    const valid = filterState.status.filter((status) =>
      (Object.values(ALERT_EPISODE_STATUS) as string[]).includes(status)
    );
    if (valid.length === 1) {
      clauses.push(`\`episode.status\` == ${escapeStringValue(valid[0])}`);
    } else if (valid.length > 1) {
      clauses.push(
        `\`episode.status\` IN (${valid.map((status) => escapeStringValue(status)).join(', ')})`
      );
    }
  }

  if (filterState.ruleId) {
    clauses.push(`\`rule.id\` == ${escapeStringValue(filterState.ruleId)}`);
  }

  if (filterState.groupHash) {
    clauses.push(`group_hash == ${escapeStringValue(filterState.groupHash)}`);
  }

  if (filterState.tags?.length) {
    const trimmed = filterState.tags.map((t) => t.trim()).filter(Boolean);
    if (trimmed.length === 1) {
      clauses.push(`MV_CONTAINS(last_tags, ${escapeStringValue(trimmed[0])})`);
    } else if (trimmed.length > 1) {
      clauses.push(
        `(${trimmed.map((t) => `MV_CONTAINS(last_tags, ${escapeStringValue(t)})`).join(' OR ')})`
      );
    }
  }

  if (filterState.severity?.length) {
    const severityValues = filterState.severity
      .filter((s) => s !== EPISODE_SEVERITY_FILTER_NONE)
      .filter((s) => SUPPORTED_SEVERITIES.has(s.toLowerCase()))
      .map((s) => s.toLowerCase());
    const includeNoSeverity = filterState.severity.includes(EPISODE_SEVERITY_FILTER_NONE);
    const parts: string[] = [];
    if (severityValues.length) {
      parts.push(`severity IN (${severityValues.map((s) => escapeStringValue(s)).join(', ')})`);
    }
    if (includeNoSeverity) {
      parts.push('severity IS NULL');
    }
    if (parts.length) {
      clauses.push(parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`);
    }
  }

  if (filterState.assigneeUid) {
    clauses.push(`last_assignee_uid == ${escapeStringValue(filterState.assigneeUid)}`);
  }

  const trimmedSearch = filterState.queryString?.trim();
  if (trimmedSearch) {
    // Best-effort full-text across both sources; action-row QSTR semantics from
    // the client builder do not apply once views are already episode-shaped.
    clauses.push(`QSTR(${escapeStringValue(trimmedSearch)})`);
  }

  return clauses;
};

/**
 * Builds a single ES|QL query over the enriched v2 episodes view and (optionally)
 * classic alerts, with space + v1 RBAC + list filters, sort, and LIMIT.
 */
export const buildUnifiedEpisodesQuery = ({
  spaceId,
  pageSize,
  sortState = { sortField: '@timestamp', sortDirection: 'desc' },
  filterState,
  authorizedRuleTypes,
  includeClassicAlerts = true,
}: BuildUnifiedEpisodesQueryParams): string => {
  const fromSources = includeClassicAlerts
    ? `${ALERT_EPISODES_ENRICHED_VIEW_NAME}, ${CLASSIC_ALERTS_VIEW_NAME}`
    : ALERT_EPISODES_ENRICHED_VIEW_NAME;

  const pipes: string[] = [`FROM ${fromSources}`];

  pipes.push(`| WHERE ${buildSpaceWhere(spaceId)}`);

  if (includeClassicAlerts) {
    pipes.push(`| WHERE ${buildV1AuthzWhereExpression(authorizedRuleTypes)}`);
  }

  for (const clause of appendFilterClauses(filterState)) {
    pipes.push(`| WHERE ${clause}`);
  }

  if (sortState.sortField === 'severity') {
    pipes.push(`| ${buildSeveritySortEval()}`);
  }

  const sortField = resolveSortField(sortState.sortField);
  const sortFieldExpr = sortField.includes('.') ? `\`${sortField}\`` : sortField;
  const sortDir = sortState.sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const limit = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);

  pipes.push(`| SORT ${sortFieldExpr} ${sortDir}`);
  pipes.push(`| LIMIT ${limit}`);

  const keepFields = includeClassicAlerts
    ? [...EPISODE_FIELDS, ...CLASSIC_ONLY_FIELDS]
    : [...EPISODE_FIELDS];
  pipes.push(`| KEEP ${keepFields.map((f) => (f.includes('.') ? `\`${f}\`` : f)).join(', ')}`);

  return pipes.join('\n');
};
