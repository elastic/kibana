/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { getGroupByColumnsFromQuery, splitResultToRuleQuery } from '@kbn/alerting-v2-utils';
import type { ConvertRuleParams, RuleParamsConversion } from '@kbn/alerting-v2-plugin/server';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const getIndices = (value: unknown): string[] => {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((index): index is string => typeof index === 'string' && index !== '');
};

const getLookback = ({ timeWindowSize, timeWindowUnit }: Record<string, unknown>) =>
  typeof timeWindowSize === 'number' && typeof timeWindowUnit === 'string'
    ? `${timeWindowSize}${timeWindowUnit}`
    : undefined;

const TRAILING_BREACH_COMMANDS = new Set(['sort', 'keep', 'limit']);

/** Moves `SORT`/`KEEP`/`LIMIT` commands that follow the last `STATS` into the breach segment. */
const splitTrailingCommands = (esql: string): RuleParamsConversion['query'] | undefined => {
  const { commands } = Parser.parse(esql).root;
  const lastStatsIdx = commands.reduce(
    (lastIdx, { name }, idx) => (name === 'stats' ? idx : lastIdx),
    -1
  );
  const tail = commands.slice(lastStatsIdx + 1);
  if (lastStatsIdx === -1 || !tail.length) return undefined;
  if (!tail.every(({ name }) => TRAILING_BREACH_COMMANDS.has(name))) return undefined;

  const cutAt = esql.lastIndexOf('|', tail[0].location.min);
  if (cutAt === -1) return undefined;
  return { base: esql.slice(0, cutAt).trim(), breach: { segment: esql.slice(cutAt).trim() } };
};

/**
 * ES|QL rules are split into a base query and a breach segment. DSL and KQL rules cannot
 * be translated, so only a `FROM` over the source indices is seeded for the user to finish.
 */
const getRuleQuery = (params: Record<string, unknown>): RuleParamsConversion['query'] => {
  const esql = isRecord(params.esqlQuery) ? getNonEmptyString(params.esqlQuery.esql) : undefined;
  if (esql) {
    const { query, outcome } = splitResultToRuleQuery(esql);
    if (outcome === 'success') return query;
    return splitTrailingCommands(esql) ?? { base: query.base.trim() ? query.base : esql };
  }

  const indices = getIndices(params.index);
  return { base: indices.length ? `FROM ${indices.join(', ')}` : '' };
};

/** Converts Elasticsearch query rule params into a v2 query, time field, lookback and grouping. */
export const convertEsQueryParams: ConvertRuleParams = (params) => {
  const query = getRuleQuery(params);
  const groupingFields = getGroupByColumnsFromQuery(query.base);
  const timeField = getNonEmptyString(params.timeField);
  const lookback = getLookback(params);

  return {
    query,
    ...(timeField ? { time_field: timeField } : {}),
    ...(lookback ? { lookback } : {}),
    ...(groupingFields.length ? { grouping: { fields: groupingFields } } : {}),
  };
};
