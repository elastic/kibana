/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

export function excludeTiersQuery(
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
