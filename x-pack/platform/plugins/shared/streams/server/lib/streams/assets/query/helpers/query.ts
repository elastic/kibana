/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { v5 } from 'uuid';
import type { Condition } from '@kbn/streamlang';
import { conditionToESQLAst } from '@kbn/streamlang';
import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import { buildMetadataOption } from '@kbn/streams-schema/src/helpers/esql_helpers';

export function computeRuleId(assetUuid: string, query: string): string {
  const queryHash = objectHash([assetUuid, query]);
  return v5(queryHash, v5.DNS);
}

/**
 * @deprecated Legacy helper that converts a KQL query + optional feature filter
 * into an ES|QL query string. Only used for storage migration of pre-existing
 * KQL-based queries. Always includes `METADATA _id, _source` so the resulting
 * query is self-contained for alerting rules.
 */
export const buildEsqlQueryFromKql = (
  indices: string[],
  input: {
    kql: { query: string };
    feature?: { name: string; filter: Condition; type: 'system' };
  }
): string => {
  const fromCommand = Builder.command({
    name: 'from',
    args: [Builder.expression.source.index(indices.join(',')), buildMetadataOption()],
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
