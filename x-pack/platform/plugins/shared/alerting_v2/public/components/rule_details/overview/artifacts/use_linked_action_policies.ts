/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import { summarizeExplicitlyLinkedActionPolicies } from '@kbn/alerting-v2-rule-form';
import { ActionPoliciesApi } from '../../../../services/action_policies_api';
import { actionPolicyKeys } from '../../../../hooks/query_key_factory';

/** Max policies fetched from the list API; linked counts may undercount when the space has more. */
export const LINKED_ACTION_POLICIES_FETCH_LIMIT = 100;

export interface UseLinkedActionPoliciesResult {
  totalCount: number;
  catchAllCount: number;
  matchingCriteriaCount: number;
  /** True when the space has more policies than {@link LINKED_ACTION_POLICIES_FETCH_LIMIT} and the list response was truncated. */
  isCountTruncated: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useLinkedActionPolicies = (ruleId: string): UseLinkedActionPoliciesResult => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const enabled = Boolean(ruleId);

  const { isLoading, error, data } = useQuery({
    queryKey: actionPolicyKeys.linkedForRule(ruleId),
    queryFn: () =>
      actionPoliciesApi.listActionPolicies({
        page: 1,
        perPage: LINKED_ACTION_POLICIES_FETCH_LIMIT,
      }),
    enabled,
    refetchOnWindowFocus: false,
    /*
     * Client-side filter for policies whose matcher explicitly includes rule.id.
     * We do not use _match_for_rule here — that endpoint returns broader matches
     * (global and global-filtered policies), not only explicit rule.id linkage.
     */
    select: (response) => {
      const summary = summarizeExplicitlyLinkedActionPolicies(response.items, ruleId);

      return {
        ...summary,
        isCountTruncated: response.total > LINKED_ACTION_POLICIES_FETCH_LIMIT,
      };
    },
  });

  return {
    totalCount: data?.totalCount ?? 0,
    catchAllCount: data?.catchAllCount ?? 0,
    matchingCriteriaCount: data?.matchingCriteriaCount ?? 0,
    isCountTruncated: data?.isCountTruncated ?? false,
    isLoading: enabled && isLoading,
    isError: error != null,
    error: error instanceof Error ? error : error != null ? new Error(String(error)) : null,
  };
};
