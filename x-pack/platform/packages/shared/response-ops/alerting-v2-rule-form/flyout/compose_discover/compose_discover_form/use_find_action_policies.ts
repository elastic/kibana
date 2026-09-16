/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { useQuery } from '@kbn/react-query';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '@kbn/alerting-v2-constants';
import type { ActionPolicyResponse, FindActionPoliciesResponse } from '@kbn/alerting-v2-schemas';

interface UseFindActionPoliciesParams {
  http: HttpStart;
  enabled?: boolean;
  search?: string;
}

export interface UseFindActionPoliciesResult {
  isLoading: boolean;
  error: Error | null;
  items: ActionPolicyResponse[];
  total: number;
}

/** True when the policy matches every rule (empty / null matcher). */
export const isCatchAllActionPolicy = (policy: ActionPolicyResponse): boolean => {
  const matcher = policy.matcher;
  if (!matcher) {
    return true;
  }
  const hasTags = Boolean(matcher.tags?.length);
  const hasExpression = Boolean(matcher.expression?.trim());
  return !hasTags && !hasExpression;
};

export const useFindActionPolicies = ({
  http,
  enabled = true,
  search,
}: UseFindActionPoliciesParams): UseFindActionPoliciesResult => {
  const { isLoading, error, data } = useQuery({
    queryKey: ['findActionPolicies', search ?? ''],
    enabled,
    queryFn: () =>
      http.get<FindActionPoliciesResponse>(ALERTING_V2_ACTION_POLICY_API_PATH, {
        query: {
          page: 1,
          per_page: 100,
          ...(search?.trim() ? { search: search.trim() } : {}),
        },
      }),
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  return {
    isLoading,
    error: error instanceof Error ? error : error != null ? new Error(String(error)) : null,
    items: data?.items ?? [],
    total: data?.total ?? 0,
  };
};
