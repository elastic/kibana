/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ThresholdConditionCombinator,
  ThresholdConditionOperator,
  ThresholdConditionRow,
  ThresholdStatRow,
} from '../types';

/** Default index pattern when no data source is selected. */
export const THRESHOLD_BUILDER_DEFAULT_FROM = 'FROM logs-*';

/**
 * Builds the `FROM …` clause for the threshold builder evaluation query.
 */
export const formatThresholdFromClause = (dataSource: string | undefined): string => {
  const raw = dataSource?.trim();
  if (!raw) {
    return THRESHOLD_BUILDER_DEFAULT_FROM;
  }
  if (/^[a-zA-Z0-9_*.@-]+$/.test(raw)) {
    return `FROM ${raw}`;
  }
  return `FROM \`${raw.replace(/`/g, '``')}\``;
};

/**
 * Escapes a field reference for use inside STATS aggregate functions.
 * Uses backticks so dotted metric names are valid identifiers.
 */
export const escapeStatsFieldReference = (field: string): string => {
  const trimmed = field.trim();
  if (!trimmed) {
    return '*';
  }
  return `\`${trimmed.replace(/`/g, '``')}\``;
};

/** Maps a user stat label to the STATS column alias (left-hand side of `alias = agg(...)`). */
export const sanitizeThresholdStatColumnAlias = (label: string): string => {
  const trimmed = label.trim();
  const sanitized = trimmed.replace(/[^a-zA-Z0-9_]/g, '_');
  return sanitized.length > 0 ? sanitized : 'stat';
};

export const isCompleteThresholdStatRow = (row: ThresholdStatRow | undefined): boolean => {
  if (!row) {
    return false;
  }
  if (!(row.label ?? '').trim()) {
    return false;
  }
  if (row.aggregation === 'count') {
    return true;
  }
  return Boolean((row.field ?? '').trim());
};

const aggregationToEsql = (row: ThresholdStatRow): string | undefined => {
  const { aggregation, field } = row;
  const ref = escapeStatsFieldReference(field);

  switch (aggregation) {
    case 'avg':
      return `AVG(${ref})`;
    case 'max':
      return `MAX(${ref})`;
    case 'min':
      return `MIN(${ref})`;
    case 'sum':
      return `SUM(${ref})`;
    case 'p95':
      return `PERCENTILE(${ref}, 95)`;
    case 'p99':
      return `PERCENTILE(${ref}, 99)`;
    case 'count':
      return field.trim() ? `COUNT(${ref})` : `COUNT(*)`;
    case 'cardinality':
      return `COUNT_DISTINCT(${ref})`;
    default:
      return undefined;
  }
};

const operatorToEsql = (op: ThresholdConditionOperator): string => {
  switch (op) {
    case 'gt':
      return '>';
    case 'lt':
      return '<';
    case 'gte':
      return '>=';
    case 'lte':
      return '<=';
    case 'eq':
      return '==';
    case 'neq':
      return '!=';
    default:
      return '>';
  }
};

const formatThresholdConditionValue = (raw: string): string => {
  const t = raw.trim();
  if (t === '') {
    return '0';
  }
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(t)) {
    return t;
  }
  return `"${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
};

const buildThresholdWhereClause = (
  conditions: ThresholdConditionRow[] | undefined,
  combinator: ThresholdConditionCombinator | undefined,
  stats: ThresholdStatRow[] | undefined
): string | undefined => {
  const validColumns = new Set(
    (stats ?? [])
      .filter(isCompleteThresholdStatRow)
      .map((r) => sanitizeThresholdStatColumnAlias(r.label))
  );
  const parts: string[] = [];
  for (const c of conditions ?? []) {
    const label = c.statLabel.trim();
    const valueRaw = c.value.trim();
    if (!label || !valueRaw) {
      continue;
    }
    const col = sanitizeThresholdStatColumnAlias(label);
    if (!validColumns.has(col)) {
      continue;
    }
    const op = operatorToEsql(c.operator);
    const rhs = formatThresholdConditionValue(valueRaw);
    parts.push(`${col} ${op} ${rhs}`);
  }
  if (parts.length === 0) {
    return undefined;
  }
  const joiner = combinator === 'or' ? ' OR ' : ' AND ';
  return parts.join(joiner);
};

/**
 * Maps short schedule intervals (for example `5m`, `1h`) to ES|QL duration literals for {@link BUCKET}.
 */
export const formatScheduleEveryToEsqlDuration = (every: string | undefined): string | undefined => {
  const raw = every?.trim();
  if (!raw) {
    return undefined;
  }
  if (/\s/.test(raw)) {
    return raw;
  }
  const m = raw.match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!m) {
    return undefined;
  }
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  switch (u) {
    case 'ms':
      return `${n} millisecond${n === 1 ? '' : 's'}`;
    case 's':
      return `${n} second${n === 1 ? '' : 's'}`;
    case 'm':
      return `${n} minute${n === 1 ? '' : 's'}`;
    case 'h':
      return `${n} hour${n === 1 ? '' : 's'}`;
    case 'd':
      return `${n} day${n === 1 ? '' : 's'}`;
    default:
      return undefined;
  }
};

/**
 * Builds the evaluation ES|QL query for the threshold alert builder from stat rows and group fields.
 * Incomplete rows are skipped. When nothing usable is defined, returns a minimal valid query.
 *
 * Output follows common ES|QL layout: `alias = AGG(field)` in STATS, optional multi-line clauses,
 * `BY` including `BUCKET` on the time field when interval is known, and WHERE on stat aliases.
 */
export const buildThresholdEvaluationQuery = (
  stats: ThresholdStatRow[] | undefined,
  groupingFields: string[] | undefined,
  dataSource?: string,
  conditions?: ThresholdConditionRow[],
  conditionCombinator?: ThresholdConditionCombinator,
  timeField?: string,
  scheduleEvery?: string
): string => {
  const fromClause = formatThresholdFromClause(dataSource);
  const completeRows = (stats ?? []).filter(isCompleteThresholdStatRow);
  const groups = (groupingFields ?? []).map((g) => g.trim()).filter(Boolean);

  if (completeRows.length === 0) {
    return `${fromClause}\n| LIMIT 1`;
  }

  const statClauses = completeRows
    .map((row) => {
      const expr = aggregationToEsql(row);
      if (!expr) {
        return undefined;
      }
      const alias = sanitizeThresholdStatColumnAlias(row.label);
      return `${alias} = ${expr}`;
    })
    .filter((clause): clause is string => Boolean(clause));

  if (statClauses.length === 0) {
    return `${fromClause}\n| LIMIT 1`;
  }

  const statsSegment = `| STATS ${statClauses.join(',\n        ')}`;

  const byParts: string[] = [];
  for (const g of groups) {
    byParts.push(escapeStatsFieldReference(g));
  }

  const bucketDuration = formatScheduleEveryToEsqlDuration(scheduleEvery);
  const tf = timeField?.trim();
  if (tf && bucketDuration) {
    byParts.push(`ts = BUCKET(${escapeStatsFieldReference(tf)}, ${bucketDuration})`);
  }

  const bySegment = byParts.length > 0 ? `\n    BY ${byParts.join(', ')}` : '';

  let query = `${fromClause}\n${statsSegment}${bySegment}`;
  const whereClause = buildThresholdWhereClause(conditions, conditionCombinator, stats);
  if (whereClause) {
    query += `\n| WHERE ${whereClause}`;
  }
  return query;
};
