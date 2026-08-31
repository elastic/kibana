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

/** Max policies evaluated by _match_for_rule; the list may be incomplete when the space has more. */
export const LINKED_ACTION_POLICIES_FETCH_LIMIT = 100;

const CATEGORY_ORDER: Record<MatchedActionPolicy['category'], number> = {
  'global-filtered': 0,
  global: 1,
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
    return a.actionPolicy.name.localeCompare(b.actionPolicy.name, 'en');
  });

export interface UseLinkedActionPoliciesResult {
  items: MatchedActionPolicy[];
  /** True when the space has more policies than {@link LINKED_ACTION_POLICIES_FETCH_LIMIT} and some may not have been evaluated. */
  isMatchTruncated: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useLinkedActionPolicies = (ruleId: string): UseLinkedActionPoliciesResult => {
  const http = useService(CoreStart('http'));
  const { isLoading, error, items, total } = useMatchedActionPolicies({ http, ruleId });

  const sortedItems = useMemo(() => sortMatchedActionPolicies(items), [items]);

  return {
    items: sortedItems,
    isMatchTruncated: total > LINKED_ACTION_POLICIES_FETCH_LIMIT,
    isLoading,
    isError: error != null,
    error,
  };
};
