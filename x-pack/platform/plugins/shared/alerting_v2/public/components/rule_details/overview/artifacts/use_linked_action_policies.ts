/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useService, CoreStart } from '@kbn/core-di-browser';
import { useMatchedActionPolicies } from '@kbn/alerting-v2-rule-form';

/** Max policies evaluated by _match_for_rule; counts may undercount when the space has more. */
export const LINKED_ACTION_POLICIES_FETCH_LIMIT = 100;

export interface UseLinkedActionPoliciesResult {
  totalCount: number;
  catchAllCount: number;
  matchingCriteriaCount: number;
  /** True when the space has more policies than {@link LINKED_ACTION_POLICIES_FETCH_LIMIT} and some may not have been evaluated. */
  isCountTruncated: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useLinkedActionPolicies = (ruleId: string): UseLinkedActionPoliciesResult => {
  const http = useService(CoreStart('http'));
  const { isLoading, error, items, total } = useMatchedActionPolicies({ http, ruleId });

  return {
    totalCount: items.length,
    catchAllCount: items.filter((item) => item.category === 'global').length,
    matchingCriteriaCount: items.filter((item) => item.category === 'global-filtered').length,
    isCountTruncated: total > LINKED_ACTION_POLICIES_FETCH_LIMIT,
    isLoading,
    isError: error != null,
    error,
  };
};
