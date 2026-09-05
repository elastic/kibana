/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, BasicPrettyPrinter, Parser } from '@elastic/esql';
import type { ESQLAstCommand, ESQLSingleAstItem } from '@elastic/esql/types';
import type { BinaryExpressionComparisonOperator } from '@elastic/esql/types';
import { BuilderQueryGenerationError } from '../errors';
import type { GeneratedQuery } from '../types';
import {
  Aggregation,
  Comparator,
  type ThresholdBuilderFields,
  type ThresholdCondition,
  type ThresholdStat,
} from './types';

const AGG_FN_NAME: Record<Aggregation, string> = {
  [Aggregation.COUNT]: 'COUNT',
  [Aggregation.AVG]: 'AVG',
  [Aggregation.SUM]: 'SUM',
  [Aggregation.MIN]: 'MIN',
  [Aggregation.MAX]: 'MAX',
  [Aggregation.CARDINALITY]: 'COUNT_DISTINCT',
  [Aggregation.P95]: 'PERCENTILE',
  [Aggregation.P99]: 'PERCENTILE',
};

const PERCENTILE_RANK: Partial<Record<Aggregation, number>> = {
  [Aggregation.P95]: 95,
  [Aggregation.P99]: 99,
};

const COMPARATOR_OP: Partial<Record<Comparator, BinaryExpressionComparisonOperator>> = {
  [Comparator.GT]: '>',
  [Comparator.GTE]: '>=',
  [Comparator.LT]: '<',
  [Comparator.LTE]: '<=',
};

/** Wraps an identifier in backticks unless it is already a bare ES|QL identifier. */
const escapeField = (field: string): string =>
  /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(field) ? field : `\`${field}\``;

/**
 * Parses a user-supplied expression fragment into an AST node by embedding it in
 * a throwaway `WHERE`, which is the only context that accepts a bare predicate.
 */
const parseFragment = (source: string, path: string): ESQLSingleAstItem => {
  let parsed;
  try {
    parsed = Parser.parse(`ROW x = 1 | WHERE ${source}`);
  } catch (error) {
    throw new BuilderQueryGenerationError(
      `Could not parse ES|QL expression "${source}": ${
        error instanceof Error ? error.message : String(error)
      }`,
      path
    );
  }

  const { root, errors } = parsed;
  if (errors.length > 0) {
    throw new BuilderQueryGenerationError(
      `Invalid ES|QL expression "${source}": ${errors.map((e) => e.message).join('; ')}`,
      path
    );
  }

  const whereCommand = root.commands.find((command) => command.name === 'where');
  const expression = whereCommand?.args[0] as ESQLSingleAstItem | undefined;
  if (!expression) {
    throw new BuilderQueryGenerationError(
      `ES|QL expression "${source}" did not produce a predicate.`,
      path
    );
  }
  return expression;
};

const buildAggFragment = (stat: ThresholdStat): string => {
  const fnName = AGG_FN_NAME[stat.aggregation];
  const arg = stat.aggregation === Aggregation.COUNT || !stat.field ? '*' : escapeField(stat.field);
  const rank = PERCENTILE_RANK[stat.aggregation];

  const call = rank === undefined ? `${fnName}(${arg})` : `${fnName}(${arg}, ${rank})`;
  return stat.filter?.trim() ? `${call} WHERE ${stat.filter.trim()}` : call;
};

/**
 * Builds the `STATS` args by parsing a source fragment rather than assembling
 * them with the expression builder. ES|QL's inline `WHERE` on an aggregation
 * (`COUNT(*) WHERE status >= 500`) is a syntactic form specific to `STATS`, not
 * a binary expression, so the builder would print it wrapped in parentheses.
 */
const parseStatsArgs = (stats: ThresholdStat[], groupByFields: string[]): ESQLSingleAstItem[] => {
  const assignments = stats.map((stat) => `${escapeField(stat.label)} = ${buildAggFragment(stat)}`);
  const groupBy =
    groupByFields.length > 0 ? ` BY ${groupByFields.map(escapeField).join(', ')}` : '';
  const source = `ROW x = 1 | STATS ${assignments.join(', ')}${groupBy}`;

  const { root, errors } = Parser.parse(source);
  if (errors.length > 0) {
    throw new BuilderQueryGenerationError(
      `Could not build STATS command: ${errors.map((e) => e.message).join('; ')}`,
      'stats'
    );
  }

  const statsCommand = root.commands.find((command) => command.name === 'stats');
  if (!statsCommand) {
    throw new BuilderQueryGenerationError('Could not build STATS command.', 'stats');
  }
  return statsCommand.args as ESQLSingleAstItem[];
};

const buildConditionExpression = (condition: ThresholdCondition): ESQLSingleAstItem => {
  const { metric, comparator, threshold } = condition;
  const column = () => Builder.expression.column(metric);
  const lower = Builder.expression.literal.decimal(threshold[0]);

  const simpleOperator = COMPARATOR_OP[comparator];
  if (simpleOperator) {
    return Builder.expression.func.binary(simpleOperator, [column(), lower]);
  }

  const upper = Builder.expression.literal.decimal(threshold[1] ?? threshold[0]);

  if (comparator === Comparator.BETWEEN) {
    return Builder.expression.func.binary('and', [
      Builder.expression.func.binary('>=', [column(), lower]),
      Builder.expression.func.binary('<=', [column(), upper]),
    ]);
  }

  return Builder.expression.func.binary('or', [
    Builder.expression.func.binary('<', [column(), lower]),
    Builder.expression.func.binary('>', [column(), upper]),
  ]);
};

/** Combines conditions into a single predicate joined by AND or OR. */
const combineConditions = (
  conditions: ThresholdCondition[],
  operator: 'AND' | 'OR'
): ESQLSingleAstItem => {
  const joiner = operator === 'OR' ? 'or' : 'and';
  return conditions
    .map(buildConditionExpression)
    .reduce((left, right) => Builder.expression.func.binary(joiner, [left, right]));
};

/**
 * Renders a `WHERE` predicate as an appendable segment (`| WHERE …`), the shape
 * the composed query format splices onto `base`.
 */
const toWhereSegment = (predicate: ESQLSingleAstItem): string =>
  `| ${BasicPrettyPrinter.command(Builder.command({ name: 'where', args: [predicate] }))}`;

/**
 * Builds the portion of the query shared by breach, recovery, and no-data
 * evaluation: `FROM`, the optional global filter, `STATS`, and any `EVAL`s.
 */
const buildBaseCommands = (fields: ThresholdBuilderFields): ESQLAstCommand[] => {
  const commands: ESQLAstCommand[] = [
    Builder.command({
      name: 'from',
      args: [Builder.expression.source.index(fields.indexPattern)],
    }),
  ];

  const filterQuery = fields.filterQuery?.trim();
  if (filterQuery) {
    commands.push(
      Builder.command({ name: 'where', args: [parseFragment(filterQuery, 'filterQuery')] })
    );
  }

  commands.push(
    Builder.command({ name: 'stats', args: parseStatsArgs(fields.stats, fields.groupByFields) })
  );

  fields.evaluations.forEach((evaluation, index) => {
    const expression = parseFragment(
      evaluation.expression.trim(),
      `evaluations[${index}].expression`
    );
    commands.push(
      Builder.command({
        name: 'eval',
        args: [
          Builder.expression.func.binary('=', [
            Builder.expression.column(evaluation.label),
            expression,
          ]),
        ],
      })
    );
  });

  return commands;
};

/**
 * Generates the composed rule query for the `threshold` builder.
 *
 * The base and the breach segment are assembled from separate command lists
 * rather than by splitting a rendered query, so the boundary is exact instead of
 * heuristic.
 *
 * Example output:
 *   base:   FROM logs-*
 *             | WHERE service.name == "api"
 *             | STATS errors = COUNT(*) WHERE status >= 500, total = COUNT(*)
 *             | EVAL error_rate = errors / total * 100
 *   breach: | WHERE error_rate > 5
 *
 * @throws {BuilderQueryGenerationError} when an ES|QL fragment cannot be parsed.
 */
export const generateThresholdQuery = (fields: ThresholdBuilderFields): GeneratedQuery => {
  const base = BasicPrettyPrinter.multiline(Builder.expression.query(buildBaseCommands(fields)), {
    pipeTab: '  ',
  });

  const breachSegment = toWhereSegment(
    combineConditions(fields.alertConditions, fields.conditionOperator)
  );

  const recoveryConditions = fields.recovery?.conditions ?? [];
  const recoverySegment = recoveryConditions.length
    ? toWhereSegment(
        combineConditions(recoveryConditions, fields.recovery?.conditionOperator ?? 'AND')
      )
    : undefined;

  return {
    query: {
      format: 'composed' as const,
      base,
      breach: { segment: breachSegment },
      ...(recoverySegment ? { recovery: { segment: recoverySegment } } : {}),
    },
    time_field: fields.timeField,
    ...(fields.groupByFields.length ? { grouping: { fields: fields.groupByFields } } : {}),
  };
};
