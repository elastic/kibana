/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

function excludeTiersQuery(
  excludedDataTiers: Array<'data_frozen' | 'data_cold' | 'data_warm' | 'data_hot'>
): estypes.QueryDslQueryContainer[] {
  return [
    {
      bool: {
        must_not: [
          {
            terms: {
              _tier: excludedDataTiers,
            },
          },
        ],
      },
    },
  ];
}

export function excludeFrozenQuery(): estypes.QueryDslQueryContainer[] {
  return excludeTiersQuery(['data_frozen']);
}

export function kqlQuery(kql?: string): estypes.QueryDslQueryContainer[] {
  if (!kql) {
    return [];
  }

  const ast = fromKueryExpression(kql);
  return [toElasticsearchQuery(ast)];
}

export function rangeQuery(
  start?: number,
  end?: number,
  field = '@timestamp'
): estypes.QueryDslQueryContainer[] {
  return [
    {
      range: {
        [field]: {
          gte: start,
          lte: end,
          format: 'epoch_millis',
        },
      },
    },
  ];
}

export function isKqlQueryValid(kql?: string): boolean {
  if (!kql) {
    return false;
  }

  try {
    fromKueryExpression(kql);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Builds a combined filter for ES|QL queries following the same pattern
 * as the server-side route used to apply.
 */
export function buildEsqlFilter({
  filter,
  kuery,
  start,
  end,
}: {
  filter?: estypes.QueryDslQueryContainer;
  kuery?: string;
  start?: number;
  end?: number;
}): estypes.QueryDslQueryContainer {
  const filters: estypes.QueryDslQueryContainer[] = [
    filter || { match_all: {} },
    ...kqlQuery(kuery),
    ...excludeFrozenQuery(),
  ];

  if (start !== undefined && end !== undefined) {
    filters.push(...rangeQuery(start, end));
  }

  return {
    bool: {
      filter: filters,
    },
  };
}
