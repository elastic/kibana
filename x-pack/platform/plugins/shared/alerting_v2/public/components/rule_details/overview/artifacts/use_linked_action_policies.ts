/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import {
  matchedActionPoliciesQueryKey,
  useMatchedActionPolicies,
} from '@kbn/alerting-v2-rule-form';
import type { MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { useQueryClient } from '@kbn/react-query';
import { actionPolicyKeys } from '../../../../hooks/query_key_factory';

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

const isActionPolicyListInvalidation = (queryKey: readonly unknown[]): boolean => {
  const listKey = actionPolicyKeys.lists();
  return listKey.every((part, index) => queryKey[index] === part);
};

export const useLinkedActionPolicies = (tags: string[]): UseLinkedActionPoliciesResult => {
  const http = useService(CoreStart('http'));
  const queryClient = useQueryClient();

  // Policy mutations already drop action-policy list queries. Refresh matches from that signal.
  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'invalidate') {
        return;
      }
      if (!isActionPolicyListInvalidation(event.query.queryKey)) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: matchedActionPoliciesQueryKey, exact: false });
    });
  }, [queryClient]);

  const {
    isLoading,
    isPreviousData = false,
    error,
    items,
    evaluatedCount,
    isTruncated,
  } = useMatchedActionPolicies({
    http,
    tags,
  });
  // keepPreviousData keeps the last tag query on screen with isLoading false.
  // Hide those rows until the match for the current tags arrives.
  const awaitingCurrentMatches = isPreviousData && error == null;

  const sortedItems = useMemo(
    () => (awaitingCurrentMatches ? [] : sortMatchedActionPolicies(items)),
    [awaitingCurrentMatches, items]
  );

  return {
    items: sortedItems,
    evaluatedCount: awaitingCurrentMatches ? 0 : evaluatedCount,
    isMatchTruncated: awaitingCurrentMatches ? false : isTruncated,
    isLoading: isLoading || awaitingCurrentMatches,
    isError: error != null,
    error,
  };
};
