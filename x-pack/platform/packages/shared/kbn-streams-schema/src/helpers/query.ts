/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { conditionToESQLAst } from '@kbn/streamlang';
import { BasicPrettyPrinter, Builder } from '@kbn/esql-language';
import type { KqlQuery } from '../queries';

/**
 * @deprecated Legacy helper that converts a KQL query + optional feature filter
 * into an ES|QL query string. Only used for storage migration of pre-existing
 * KQL-based queries.
 */
export const buildEsqlQuery = (
  indices: string[],
  input: {
    kql: KqlQuery;
    feature?: { name: string; filter: Condition; type: 'system' };
  },
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
    Builder.expression.literal.string(input.kql.query),
  ]);

  const whereCondition = input.feature?.filter
    ? Builder.expression.func.binary('and', [kqlQuery, conditionToESQLAst(input.feature.filter)])
    : kqlQuery;

  const whereCommand = Builder.command({
    name: 'where',
    args: [whereCondition],
  });

  const esqlQuery = Builder.expression.query([fromCommand, whereCommand]);

  return BasicPrettyPrinter.print(esqlQuery);
};
