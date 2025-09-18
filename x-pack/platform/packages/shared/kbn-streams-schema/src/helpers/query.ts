/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@kbn/esql-ast';
import type { StreamQuery } from '../queries';

export const buildEsqlQuery = (
  indices: string[],
  query: StreamQuery,
  includeMetadata: boolean = false
): string => {
  const esqlQuery = Builder.expression.query([
    Builder.command({
      name: 'from',
      args: [
        Builder.expression.source.node({
          index: indices.join(','),
          sourceType: 'index',
        }),
        ...(includeMetadata
          ? [
              Builder.option({
                name: 'metadata',
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
    }),
    Builder.command({
      name: 'where',
      args: [
        Builder.expression.func.call('kql', [Builder.expression.literal.string(query.kql.query)]),
      ],
    }),
  ]);

  return BasicPrettyPrinter.expression(esqlQuery);
};
