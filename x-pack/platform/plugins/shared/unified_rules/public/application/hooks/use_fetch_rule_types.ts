/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { RuleType } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../common/lib/kibana';

interface RuleTypesResponse {
  data: RuleType[];
}

export interface UseFetchRuleTypesResponse {
  ruleTypes: RuleType[] | undefined;
  isLoading: boolean;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<RuleType[] | undefined, unknown>>;
}

export const useFetchRuleTypes = (): UseFetchRuleTypesResponse => {
  const { http } = useKibana().services;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['unifiedRules.fetchRuleTypes'],
    queryFn: async ({ signal }) => {
      const res = await http.get<RuleTypesResponse>('/internal/alerting/rules/_rule_types', {
        signal,
      });

      return Array.isArray(res) ? (res as RuleType[]) : (res as RuleTypesResponse).data;
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    onError: () => {
      // Silently handle — rule types failure is not fatal for page rendering
    },
  });

  return {
    ruleTypes: data ?? undefined,
    isLoading,
    refetch,
  };
};
