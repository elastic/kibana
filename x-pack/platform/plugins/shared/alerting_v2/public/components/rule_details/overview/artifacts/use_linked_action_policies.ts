/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import { summarizeExplicitlyLinkedActionPolicies } from '@kbn/alerting-v2-rule-form';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { ActionPoliciesApi } from '../../../../services/action_policies_api';
import { actionPolicyKeys } from '../../../../hooks/query_key_factory';

/** List API max page size; client-side filter may miss policies beyond the first page. */
const LINKED_ACTION_POLICIES_LIST_PER_PAGE = 100;

export interface UseLinkedActionPoliciesResult {
  policies: ActionPolicyResponse[];
  totalCount: number;
  catchAllCount: number;
  matchingCriteriaCount: number;
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
        perPage: LINKED_ACTION_POLICIES_LIST_PER_PAGE,
      }),
    enabled,
    refetchOnWindowFocus: false,
    select: (response) => summarizeExplicitlyLinkedActionPolicies(response.items, ruleId),
  });

  return {
    policies: data?.policies ?? [],
    totalCount: data?.totalCount ?? 0,
    catchAllCount: data?.catchAllCount ?? 0,
    matchingCriteriaCount: data?.matchingCriteriaCount ?? 0,
    isLoading: enabled && isLoading,
    isError: error != null,
    error: error instanceof Error ? error : error != null ? new Error(String(error)) : null,
  };
};
