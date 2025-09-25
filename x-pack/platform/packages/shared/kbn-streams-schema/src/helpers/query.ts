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
  const metadata = includeMetadata ? ' METADATA _id, _source' : '';
  const fromCommand = Builder.command({
    name: 'from',
    args: [
      Builder.expression.literal.string(`${indices.join(',')}${metadata}`, { unquoted: true }),
    ],
  });

  const whereCondition = query.system
    ? Builder.expression.func.binary('and', [
        Builder.expression.func.call('KQL', [Builder.expression.literal.string(query.kql.query)]),
        Builder.expression.literal.string(conditionToESQL(query.system.filter), { unquoted: true }),
      ])
    : Builder.expression.func.call('KQL', [Builder.expression.literal.string(query.kql.query)]);

  const whereCommand = Builder.command({
    name: 'where',
    args: [whereCondition],
  });

  const esqlQuery = Builder.expression.query([fromCommand, whereCommand]);

  return BasicPrettyPrinter.print(esqlQuery);
};
