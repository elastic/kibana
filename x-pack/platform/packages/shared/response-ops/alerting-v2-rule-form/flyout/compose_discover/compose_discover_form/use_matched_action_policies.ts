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
  ruleId: string;
}

export interface UseMatchedActionPoliciesResult {
  isLoading: boolean;
  error: Error | null;
  items: MatchedActionPolicy[];
}

export const useMatchedActionPolicies = ({
  http,
  ruleId,
}: UseMatchedActionPoliciesParams): UseMatchedActionPoliciesResult => {
  const { isLoading, error, data } = useQuery({
    queryKey: ['matchedActionPolicies', ruleId],
    queryFn: () =>
      http.fetch<MatchActionPoliciesForRuleResponse>(
        '/api/alerting/v2/action_policies/_match_for_rule',
        { method: 'POST', body: JSON.stringify({ rule: { id: ruleId } }) }
      ),
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  return {
    isLoading,
    error: error instanceof Error ? error : error != null ? new Error(String(error)) : null,
    items: data?.items ?? [],
  };
};
