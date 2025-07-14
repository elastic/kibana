/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

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

export function kqlQuery(kuery?: string): estypes.QueryDslQueryContainer[] {
  if (!kuery) {
    return [];
  }

  return [
    {
      kql: {
        query: kuery,
      },
    } as estypes.QueryDslQueryContainer,
  ];
}
