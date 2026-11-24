/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, type ESQLAstItem, type ESQLCommand } from '@elastic/esql';
import { getStatsColumns, isNode, type AstNode } from './esql_stats_columns';

/** A problem that stops an ES|QL query from being used by an anomaly detection job. */
export interface EsqlQueryProblem {
  /**
   * - `unnamedColumn`: an expression that creates a column without a name, e.g. `STATS COUNT(*)`.
   * - `unsupportedStatsColumn`: a STATS column that is not a single supported aggregation.
   * - `changedAfterStats`: an EVAL or RENAME command after the last STATS.
   */
  readonly type: 'unnamedColumn' | 'unsupportedStatsColumn' | 'changedAfterStats';
  /** The query text of the expression or command, e.g. `COUNT(*)`. */
  readonly expression: string;
}

// Commands whose expressions each create an output column
const COLUMN_COMMANDS: readonly string[] = ['stats', 'inline stats', 'inlinestats', 'eval'];

// `expr WHERE condition` in STATS wraps the expression, so look at the expression it filters
const unwrapWhere = (node: AstNode): ESQLAstItem | undefined =>
  node.type === 'function' && node.name === 'where' ? node.args[0] : node;

// An expression creates an unnamed column unless it is an assignment (`name = expr`) or a column
const isUnnamed = (item: ESQLAstItem): item is AstNode => {
  if (!isNode(item)) {
    return false;
  }
  const expression = unwrapWhere(item);
  if (!isNode(expression)) {
    return false;
  }
  const isAssignment = expression.type === 'function' && expression.name === '=';
  return !isAssignment && expression.type !== 'column';
};

const getColumnExpressions = ({ args }: ESQLCommand): ESQLAstItem[] =>
  args.flatMap((arg) =>
    isNode(arg) && arg.type === 'option' ? (arg.name === 'by' ? arg.args : []) : [arg]
  );

/**
 * Checks that an ES|QL query can be used by an anomaly detection job:
 * - each output column must have a name the job can refer to, so expressions like
 *   `STATS COUNT(*)` or `BY BUCKET(@timestamp, 1 hour)` are rejected;
 * - each column of the last STATS must be COUNT(*) or a single AVG, MAX, MEDIAN, MIN or SUM,
 *   so the wizard can offer the matching ML functions;
 * - no EVAL or RENAME may follow the last STATS.
 * Queries with syntax errors return no problems, as the editor already reports them.
 */
export const validateEsqlQuery = (query: string): EsqlQueryProblem[] => {
  try {
    const { root, errors } = Parser.parse(query);
    if (errors.length > 0) {
      return [];
    }
    const toProblem =
      (type: EsqlQueryProblem['type']) =>
      ({ location }: AstNode | ESQLCommand): EsqlQueryProblem => ({
        type,
        expression: query.slice(location.min, location.max + 1),
      });

    const unnamed = root.commands
      .filter(({ name }) => COLUMN_COMMANDS.includes(name.toLowerCase()))
      .flatMap(getColumnExpressions)
      .filter(isUnnamed);
    const { unsupported, changedAfterStats } = getStatsColumns(root);

    return [
      ...unnamed.map(toProblem('unnamedColumn')),
      ...unsupported
        .filter((node) => !unnamed.includes(node))
        .map(toProblem('unsupportedStatsColumn')),
      ...changedAfterStats.map(toProblem('changedAfterStats')),
    ];
  } catch {
    return [];
  }
};
