/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { useQuery } from '@kbn/react-query';
import type { MatchActionPoliciesResponse, MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_INTERNAL_ACTION_POLICY_MATCH_API_PATH } from '@kbn/alerting-v2-constants';

interface UseMatchedActionPoliciesParams {
  http: HttpStart;
  tags?: string[];
}

export const MATCHED_ACTION_POLICIES_QUERY_KEY = ['matchedActionPolicies'] as const;

export interface UseMatchedActionPoliciesResult {
  isLoading: boolean;
  error: Error | null;
  items: MatchedActionPolicy[];
  total: number;
  evaluatedCount: number;
  isTruncated: boolean;
}

export const useMatchedActionPolicies = ({
  http,
  tags,
}: UseMatchedActionPoliciesParams): UseMatchedActionPoliciesResult => {
  const body = { rule: tags?.length ? { tags } : {} };

  const { isLoading, error, data } = useQuery({
    queryKey: [...MATCHED_ACTION_POLICIES_QUERY_KEY, tags],
    queryFn: () =>
      http.fetch<MatchActionPoliciesResponse>(ALERTING_V2_INTERNAL_ACTION_POLICY_MATCH_API_PATH, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  return {
    isLoading,
    error: error instanceof Error ? error : error != null ? new Error(String(error)) : null,
    items: data?.items ?? [],
    total: data?.total ?? 0,
    evaluatedCount: data?.evaluated_count ?? 0,
    isTruncated: data?.is_truncated ?? false,
  };
};
