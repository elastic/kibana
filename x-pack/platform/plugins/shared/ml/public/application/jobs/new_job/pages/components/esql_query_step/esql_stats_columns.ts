/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Parser,
  type ESQLAstItem,
  type ESQLAstQueryExpression,
  type ESQLCommand,
} from '@elastic/esql';
import { ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils';

export type AstNode = Exclude<ESQLAstItem, ESQLAstItem[]>;

export const isNode = (item: ESQLAstItem | undefined): item is AstNode =>
  item !== undefined && !Array.isArray(item);

const firstNode = (item: ESQLAstItem | undefined) => (Array.isArray(item) ? item[0] : item);

/** The ML functions a job can use on a column created by each ES|QL aggregation. */
const ML_FUNCTIONS_BY_ESQL_FUNCTION: Readonly<Record<string, readonly ML_JOB_AGGREGATION[]>> = {
  avg: [ML_JOB_AGGREGATION.MEAN, ML_JOB_AGGREGATION.HIGH_MEAN, ML_JOB_AGGREGATION.LOW_MEAN],
  sum: [ML_JOB_AGGREGATION.SUM, ML_JOB_AGGREGATION.HIGH_SUM, ML_JOB_AGGREGATION.LOW_SUM],
  max: [ML_JOB_AGGREGATION.MAX],
  min: [ML_JOB_AGGREGATION.MIN],
  median: [
    ML_JOB_AGGREGATION.MEDIAN,
    ML_JOB_AGGREGATION.HIGH_MEDIAN,
    ML_JOB_AGGREGATION.LOW_MEDIAN,
  ],
};

// COUNT(*) or COUNT(), which count the source documents in each output row
const isDocCount = (node: AstNode): boolean => {
  if (node.type !== 'function' || node.name.toLowerCase() !== 'count') {
    return false;
  }
  const argNode = firstNode(node.args[0]);
  return argNode === undefined || (isNode(argNode) && argNode.name === '*');
};

/**
 * Returns the ML functions for a STATS aggregation, an empty list for COUNT(*), or undefined
 * when the job cannot use it, e.g. COUNT_DISTINCT(x), AVG(x) / 1024 or a filtered aggregation.
 */
const getMlFunctions = (
  item: ESQLAstItem | undefined
): readonly ML_JOB_AGGREGATION[] | undefined => {
  const node = firstNode(item);
  if (!isNode(node) || node.type !== 'function') {
    return undefined;
  }
  if (isDocCount(node)) {
    return [];
  }
  return node.subtype === 'variadic-call'
    ? ML_FUNCTIONS_BY_ESQL_FUNCTION[node.name.toLowerCase()]
    : undefined;
};

export interface EsqlStatsColumns {
  /**
   * The ML functions allowed for each column of the last STATS command. Grouping and COUNT(*)
   * columns have none, as they are not metrics.
   */
  readonly columnFunctions: Readonly<Record<string, readonly ML_JOB_AGGREGATION[]>>;
  /** STATS aggregations the job cannot use. */
  readonly unsupported: readonly AstNode[];
  /** EVAL and RENAME commands after the last STATS, which change its columns. */
  readonly changedAfterStats: readonly ESQLCommand[];
  /** The expression of each named BY grouping, e.g. `BUCKET(@timestamp, 1 hour)` for `t`. */
  readonly groupExpressions: Readonly<Record<string, AstNode>>;
}

const EMPTY: EsqlStatsColumns = {
  columnFunctions: {},
  unsupported: [],
  changedAfterStats: [],
  groupExpressions: {},
};
const CHANGING_COMMANDS: readonly string[] = ['eval', 'rename'];

/** Reads the columns of the last STATS command of a parsed query. */
export const getStatsColumns = (root: ESQLAstQueryExpression): EsqlStatsColumns => {
  const { commands } = root;
  const statsIndex = commands.map(({ name }) => name.toLowerCase()).lastIndexOf('stats');
  if (statsIndex === -1) {
    return EMPTY;
  }

  const columnFunctions: Record<string, readonly ML_JOB_AGGREGATION[]> = {};
  const unsupported: AstNode[] = [];
  const groupExpressions: Record<string, AstNode> = {};
  for (const arg of commands[statsIndex].args) {
    if (!isNode(arg)) {
      continue;
    }
    if (arg.type === 'option') {
      // BY groupings, e.g. `host` or `t = BUCKET(@timestamp, 1 hour)`
      for (const group of arg.name === 'by' ? arg.args : []) {
        const groupNode = firstNode(group);
        const isAssignment =
          isNode(groupNode) && groupNode.type === 'function' && groupNode.name === '=';
        const column = isAssignment ? firstNode(groupNode.args[0]) : groupNode;
        if (isNode(column) && column.type === 'column') {
          columnFunctions[column.name] = [];
          const expression = isAssignment ? firstNode(groupNode.args[1]) : undefined;
          if (isNode(expression)) {
            groupExpressions[column.name] = expression;
          }
        }
      }
      continue;
    }
    // only `name = AGG(...)`; unnamed aggregations are reported by the query validation
    if (arg.type !== 'function' || arg.name !== '=') {
      if (arg.type === 'function' && arg.name === 'where') {
        unsupported.push(arg);
      }
      continue;
    }
    const column = firstNode(arg.args[0]);
    const functions = getMlFunctions(arg.args[1]);
    if (functions === undefined) {
      unsupported.push(arg);
    } else if (isNode(column) && column.type === 'column') {
      columnFunctions[column.name] = functions;
    }
  }

  const changedAfterStats = commands
    .slice(statsIndex + 1)
    .filter(({ name }) => CHANGING_COMMANDS.includes(name.toLowerCase()));

  return { columnFunctions, unsupported, changedAfterStats, groupExpressions };
};

/**
 * Returns the ML functions allowed for each column created by the query's last STATS command,
 * e.g. mean, high_mean and low_mean for `avgBytes = AVG(bytes)`. Columns not listed, such as
 * those of a query without STATS, allow any function their type supports.
 */
export const getEsqlColumnFunctions = (
  query: string
): Readonly<Record<string, readonly ML_JOB_AGGREGATION[]>> => {
  try {
    const { root, errors } = Parser.parse(query);
    return errors.length > 0 ? {} : getStatsColumns(root).columnFunctions;
  } catch {
    return {};
  }
};

// ES|QL time units with a fixed length, as ML bucket span units and multipliers. Months, quarters
// and years vary in length, so they cannot be a bucket span.
const BUCKET_SPAN_UNITS: Readonly<Record<string, readonly [string, number]>> = {
  ms: ['ms', 1],
  millisecond: ['ms', 1],
  milliseconds: ['ms', 1],
  s: ['s', 1],
  sec: ['s', 1],
  second: ['s', 1],
  seconds: ['s', 1],
  m: ['m', 1],
  min: ['m', 1],
  minute: ['m', 1],
  minutes: ['m', 1],
  h: ['h', 1],
  hour: ['h', 1],
  hours: ['h', 1],
  d: ['d', 1],
  day: ['d', 1],
  days: ['d', 1],
  w: ['d', 7],
  week: ['d', 7],
  weeks: ['d', 7],
};

// Converts a duration literal, e.g. `1 hour` or "15 minutes", to a bucket span, e.g. `1h`
const toBucketSpan = (item: ESQLAstItem | undefined): string | null => {
  const node = firstNode(item);
  if (!isNode(node) || node.type !== 'literal') {
    return null;
  }
  let quantity: number;
  let unit: string;
  if (node.literalType === 'time_duration' || node.literalType === 'date_period') {
    ({ quantity, unit } = node);
  } else if (node.literalType === 'keyword') {
    const match = /^\s*(\d+)\s*([a-z]+)\s*$/i.exec(node.valueUnquoted);
    if (match === null) {
      return null;
    }
    quantity = Number(match[1]);
    unit = match[2];
  } else {
    return null;
  }
  const mlUnit = BUCKET_SPAN_UNITS[unit.toLowerCase()];
  return mlUnit !== undefined && quantity > 0 ? `${quantity * mlUnit[1]}${mlUnit[0]}` : null;
};

/**
 * Returns the bucket span set by the query, e.g. `1h` for
 * `STATS ... BY timestamp = BUCKET(@timestamp, 1 hour)` when `timestamp` is the job's time field.
 * Returns null when the time field is not a BUCKET or TBUCKET grouping of the last STATS, or its
 * interval has no fixed length, e.g. a number of buckets or `1 month`.
 */
export const getEsqlBucketSpan = (query: string, timeField: string): string | null => {
  try {
    const { root, errors } = Parser.parse(query);
    if (errors.length > 0) {
      return null;
    }
    const expression = getStatsColumns(root).groupExpressions[timeField];
    if (expression === undefined || expression.type !== 'function') {
      return null;
    }
    switch (expression.name.toLowerCase()) {
      case 'bucket':
        return toBucketSpan(expression.args[1]);
      case 'tbucket':
        return toBucketSpan(expression.args[0]);
      default:
        return null;
    }
  } catch {
    return null;
  }
};
