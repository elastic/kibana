/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Aggregation,
  Comparator,
  AGGREGATIONS_REQUIRING_FIELD,
  type StatDefinition,
  type AlertCondition,
  type ThresholdRuleFormValues,
} from './types';

const escapeField = (field: string): string => {
  if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(field)) {
    return field;
  }
  return `\`${field}\``;
};

const buildAggFn = (aggregation: Aggregation, escapedField: string): string => {
  switch (aggregation) {
    case Aggregation.COUNT:
      return 'COUNT(*)';
    case Aggregation.AVG:
      return `AVG(${escapedField})`;
    case Aggregation.SUM:
      return `SUM(${escapedField})`;
    case Aggregation.MIN:
      return `MIN(${escapedField})`;
    case Aggregation.MAX:
      return `MAX(${escapedField})`;
    case Aggregation.CARDINALITY:
      return `COUNT_DISTINCT(${escapedField})`;
    case Aggregation.P95:
      return `PERCENTILE(${escapedField}, 95)`;
    case Aggregation.P99:
      return `PERCENTILE(${escapedField}, 99)`;
    default:
      return 'COUNT(*)';
  }
};

const buildStatExpression = (stat: StatDefinition): string => {
  const escapedField = stat.field ? escapeField(stat.field) : '';
  const aggFn = buildAggFn(stat.aggregation, escapedField);
  const filterClause = stat.filter?.trim() ? ` WHERE ${stat.filter.trim()}` : '';
  return `${stat.label} = ${aggFn}${filterClause}`;
};

const isStatComplete = (stat: StatDefinition): boolean => {
  if (!stat.label?.trim()) return false;
  if (AGGREGATIONS_REQUIRING_FIELD.includes(stat.aggregation) && !stat.field) return false;
  return true;
};

const buildAlertWhereClause = (condition: AlertCondition): string => {
  const { metric, comparator, threshold } = condition;

  switch (comparator) {
    case Comparator.GT:
      return `${metric} > ${threshold[0]}`;
    case Comparator.GTE:
      return `${metric} >= ${threshold[0]}`;
    case Comparator.LT:
      return `${metric} < ${threshold[0]}`;
    case Comparator.LTE:
      return `${metric} <= ${threshold[0]}`;
    case Comparator.BETWEEN:
      return `${metric} >= ${threshold[0]} AND ${metric} <= ${threshold[1]}`;
    case Comparator.NOT_BETWEEN:
      return `(${metric} < ${threshold[0]} OR ${metric} > ${threshold[1]})`;
    default:
      return `${metric} > ${threshold[0]}`;
  }
};

const isAlertConditionComplete = (condition: AlertCondition): boolean => {
  if (!condition.metric?.trim()) return false;
  if (condition.threshold.length === 0 || condition.threshold.some((t) => isNaN(t))) return false;
  if (
    (condition.comparator === Comparator.BETWEEN ||
      condition.comparator === Comparator.NOT_BETWEEN) &&
    condition.threshold.length < 2
  ) {
    return false;
  }
  return true;
};

export const buildEsqlQuery = (values: ThresholdRuleFormValues): string => {
  const {
    indexPattern,
    filterQuery,
    stats,
    evaluations,
    alertConditions,
    conditionOperator,
    groupBy,
  } = values;

  if (!indexPattern) {
    return '';
  }

  const completeStats = stats.filter(isStatComplete);
  const globalFilter = filterQuery?.trim();

  if (completeStats.length === 0) {
    const lines = [`FROM ${indexPattern}`];
    if (globalFilter) {
      lines.push(`| WHERE ${globalFilter}`);
    }
    lines.push('| LIMIT 10');
    return lines.join('\n');
  }

  const lines = [`FROM ${indexPattern}`];

  if (globalFilter) {
    lines.push(`| WHERE ${globalFilter}`);
  }

  const statsExpressions = completeStats.map((s) => buildStatExpression(s));
  const groupByClause =
    groupBy && groupBy.length > 0 ? ` BY ${groupBy.map(escapeField).join(', ')}` : '';
  lines.push(`| STATS ${statsExpressions.join(', ')}${groupByClause}`);

  const completeEvals = evaluations.filter((e) => e.label?.trim() && e.expression?.trim());
  for (const evalDef of completeEvals) {
    lines.push(`| EVAL ${evalDef.label} = ${evalDef.expression}`);
  }

  const completeAlertConditions = alertConditions.filter(isAlertConditionComplete);
  if (completeAlertConditions.length > 0) {
    const whereClauses = completeAlertConditions.map((c) => buildAlertWhereClause(c));
    const operator = ` ${conditionOperator} `;
    lines.push(`| WHERE ${whereClauses.join(operator)}`);
  }

  return lines.join('\n');
};
