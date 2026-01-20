/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionToESQLAst } from '@kbn/streamlang';
import { BasicPrettyPrinter, Builder, Parser } from '@kbn/esql-language';
import type { ESQLSingleAstItem, ESQLCommand } from '@kbn/esql-language';
import type { StreamQuery } from '../queries';

/**
 * Builds the WHERE condition AST node for a StreamQuery.
 * Combines the KQL query with the feature filter (if present) using AND.
 */
const buildWhereConditionAst = (query: Pick<StreamQuery, 'kql' | 'feature'>) => {
  const kqlQuery = Builder.expression.func.call('KQL', [
    Builder.expression.literal.string(query.kql.query),
  ]);

  return query.feature?.filter
    ? Builder.expression.func.binary('and', [kqlQuery, conditionToESQLAst(query.feature.filter)])
    : kqlQuery;
};

/**
 * Builds the WHERE condition for a StreamQuery as an ESQL expression string.
 * Combines the KQL query with the feature filter (if present) using AND.
 *
 * @example
 * // Returns: 'KQL("message: error") AND `system.name` == "auth"'
 * buildEsqlWhereCondition({ kql: { query: 'message: error' }, feature: { filter: { field: 'system.name', eq: 'auth' } } })
 */
export const buildEsqlWhereCondition = (query: Pick<StreamQuery, 'kql' | 'feature'>): string => {
  return BasicPrettyPrinter.expression(buildWhereConditionAst(query));
};

export const buildEsqlQuery = (
  indices: string[],
  query: StreamQuery,
  includeMetadata: boolean = false
): string => {
  const fromCommand = Builder.command({
    name: 'from',
    args: [
      Builder.expression.source.index(indices.join(',')),
      ...(includeMetadata
        ? [
            Builder.option({
              name: 'METADATA',
              args: [
                Builder.expression.column({
                  args: [Builder.identifier({ name: '_id' })],
                }),
                Builder.expression.column({
                  args: [Builder.identifier('_source')],
                }),
              ],
            }),
          ]
        : []),
    ],
  });

  const commands: ESQLCommand[] = [fromCommand];

  // Try to use esql.where when populated, fall back to deprecated kql/feature
  let whereExpression: ESQLSingleAstItem | undefined;

  if (query.esql?.where) {
    try {
      whereExpression = Parser.parseExpression(query.esql.where).root;
    } catch {
      // Fall back to deprecated kql/feature on parse error
    }
  }

  commands.push(
    Builder.command({
      name: 'where',
      args: [whereExpression ?? buildWhereConditionAst(query)],
    })
  );

  const esqlQuery = Builder.expression.query(commands);

  return BasicPrettyPrinter.print(esqlQuery);
};
