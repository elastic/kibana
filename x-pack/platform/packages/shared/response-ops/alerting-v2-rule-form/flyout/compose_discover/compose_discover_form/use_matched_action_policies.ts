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

interface UseMatchedActionPoliciesParams {
  http: HttpStart;
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
  tags,
}: UseMatchedActionPoliciesParams): UseMatchedActionPoliciesResult => {
  const body = { rule: tags?.length ? { tags } : {} };

  const { isLoading, error, data } = useQuery({
    queryKey: ['matchedActionPolicies', tags],
    queryFn: () =>
      http.fetch<MatchActionPoliciesForRuleResponse>(
        '/api/alerting/v2/action_policies/_match_for_rule',
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
