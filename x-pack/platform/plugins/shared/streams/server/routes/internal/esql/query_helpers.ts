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
