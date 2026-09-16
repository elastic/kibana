/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { useQuery } from '@kbn/react-query';
import type {
  MatchActionPoliciesForRuleResponse,
  MatchedActionPolicy,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_INTERNAL_ACTION_POLICY_API_PATH } from '@kbn/alerting-v2-constants';

interface UseMatchedActionPoliciesParams {
  http: HttpStart;
  /** Kept for callers; match API currently keys off tags only. */
  ruleId?: string;
  name?: string;
  tags?: string[];
}

export interface UseMatchedActionPoliciesResult {
  isLoading: boolean;
  error: Error | null;
  items: MatchedActionPolicy[];
  total: number;
}

export const useMatchedActionPolicies = ({
  http,
  ruleId,
  name,
  tags,
}: UseMatchedActionPoliciesParams): UseMatchedActionPoliciesResult => {
  // Always fetch on mount so catch-all policies appear before the rule has tags.
  // Request body follows the structured match-for-rule API (tags only).
  const body = { rule: tags?.length ? { tags } : {} };

  const { isLoading, error, data } = useQuery({
    queryKey: ['matchedActionPolicies', ruleId, name, tags],
    queryFn: () =>
      http.fetch<MatchActionPoliciesForRuleResponse>(
        `${ALERTING_V2_INTERNAL_ACTION_POLICY_API_PATH}/_match_for_rule`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
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
