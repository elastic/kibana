/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const FROZEN_TIER = 'data_frozen';

/**
 * Clauses matching documents indexed into frozen tier indices, to be negated by the caller.
 *
 * @returns Clauses to place under `must_not` when composing the exclusion into an existing `bool`
 * query. Use {@link excludeFrozenTierQuery} instead when a standalone query is needed.
 */
export const frozenTierClauses = (): QueryDslQueryContainer[] => [{ term: { _tier: FROZEN_TIER } }];

/**
 * Query DSL clause excluding documents indexed into frozen tier indices.
 */
export const excludeFrozenTierQuery = (): QueryDslQueryContainer => ({
  bool: {
    must_not: frozenTierClauses(),
  },
});

/**
 * Combines an optional caller-supplied filter with the frozen tier exclusion.
 *
 * @param filter - Query DSL filter the caller wants applied, if any.
 * @param includeFrozen - When true, the caller's filter is returned untouched and frozen
 * tier data stays in scope.
 * @returns The filter to send to Elasticsearch, or `undefined` when there is nothing to
 * apply (only possible when `includeFrozen` is true and no filter was supplied).
 */
export const applyFrozenTierExclusion = (
  filter: QueryDslQueryContainer | undefined,
  includeFrozen: boolean = false
): QueryDslQueryContainer | undefined => {
  if (includeFrozen) {
    return filter;
  }
  if (!filter) {
    return excludeFrozenTierQuery();
  }
  return {
    bool: {
      filter: [filter],
      must_not: frozenTierClauses(),
    },
  };
};
