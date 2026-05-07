/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { EsQueryConfig } from '@kbn/es-query';
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

export function kqlQuery(
  kql?: string,
  esQueryConfig?: EsQueryConfig
): estypes.QueryDslQueryContainer[] {
  if (!kql) {
    return [];
  }

  const allowLeadingWildcards = esQueryConfig?.allowLeadingWildcards ?? false;
  const ast = fromKueryExpression(kql, { allowLeadingWildcards });
  return [toElasticsearchQuery(ast, undefined, esQueryConfig ?? {})];
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

export function isKqlQueryValid(kql?: string, esQueryConfig?: EsQueryConfig): boolean {
  if (!kql) {
    return false;
  }

  try {
    fromKueryExpression(kql, {
      allowLeadingWildcards: esQueryConfig?.allowLeadingWildcards ?? false,
    });
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
  esQueryConfig,
}: {
  filter?: estypes.QueryDslQueryContainer;
  kuery?: string;
  start?: number;
  end?: number;
  esQueryConfig?: EsQueryConfig;
}): estypes.QueryDslQueryContainer {
  const filters: estypes.QueryDslQueryContainer[] = [
    filter || { match_all: {} },
    ...kqlQuery(kuery, esQueryConfig),
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
