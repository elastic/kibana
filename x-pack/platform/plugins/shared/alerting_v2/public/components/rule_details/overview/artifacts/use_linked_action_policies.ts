/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { useMatchedActionPolicies } from '@kbn/alerting-v2-rule-form';
import type { MatchedActionPolicy } from '@kbn/alerting-v2-schemas';

const CATEGORY_ORDER: Record<MatchedActionPolicy['category'], number> = {
  tags: 0,
  catch_all: 1,
};

/** Matching-criteria first, then catch-all, then name. */
export const sortMatchedActionPolicies = (
  items: readonly MatchedActionPolicy[]
): MatchedActionPolicy[] =>
  [...items].sort((a, b) => {
    const categoryDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (categoryDiff !== 0) {
      return categoryDiff;
    }
    return a.action_policy.name.localeCompare(b.action_policy.name, 'en');
  });

export interface UseLinkedActionPoliciesResult {
  items: MatchedActionPolicy[];
  evaluatedCount: number;
  /** True when some policies in the space were not evaluated and the list may be incomplete. */
  isMatchTruncated: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useLinkedActionPolicies = (tags: string[]): UseLinkedActionPoliciesResult => {
  const http = useService(CoreStart('http'));
  const { isLoading, error, items, evaluatedCount, isTruncated } = useMatchedActionPolicies({
    http,
    tags,
  });

  const sortedItems = useMemo(() => sortMatchedActionPolicies(items), [items]);

  return {
    items: sortedItems,
    evaluatedCount,
    isMatchTruncated: isTruncated,
    isLoading,
    isError: error != null,
    error,
  };
};
