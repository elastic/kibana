/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Category } from './types';

export const QUERY_MODE = {
  INCLUDE: 'should',
  EXCLUDE: 'must_not',
} as const;
export type QueryMode = (typeof QUERY_MODE)[keyof typeof QUERY_MODE];

export const getCategoryQuery = (
  field: string,
  categories: Category[],
  mode: QueryMode = QUERY_MODE.INCLUDE
): Record<string, estypes.QueryDslBoolQuery> => ({
  bool: {
    [mode]: categories.map(({ key: query }) => ({
      match: {
        [field]: {
          auto_generate_synonyms_phrase_query: false,
          fuzziness: 0,
          operator: 'and',
          query,
        },
      },
    })),
  },
});
