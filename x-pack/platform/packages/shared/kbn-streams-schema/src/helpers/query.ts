/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionToESQL } from '@kbn/streamlang';
import { BasicPrettyPrinter, Builder } from '@kbn/esql-ast';
import type { StreamQuery } from '../queries';

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

  const kqlQuery = Builder.expression.func.call('KQL', [
    Builder.expression.literal.string(query.kql.query),
  ]);

  const whereCondition = query.feature?.filter
    ? Builder.expression.func.binary('and', [
        kqlQuery,
        Builder.expression.literal.string(conditionToESQL(query.feature.filter), {
          unquoted: true,
        }),
      ])
    : kqlQuery;

  const whereCommand = Builder.command({
    name: 'where',
    args: [whereCondition],
  });

  const esqlQuery = Builder.expression.query([fromCommand, whereCommand]);

  return BasicPrettyPrinter.print(esqlQuery);
};
