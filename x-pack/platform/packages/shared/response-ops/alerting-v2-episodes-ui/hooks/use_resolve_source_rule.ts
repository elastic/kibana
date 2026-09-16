/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { useAdditionalEpisodesDataSource } from '../context/episode_data_source_context';
import type { SourceRuleData } from '../types/source_rule_data';
import { queryKeys } from '../query_keys';

export interface UseResolveSourceRuleOptions {
  ruleId: string | undefined;
  http: HttpStart;
}

export interface UseResolveSourceRuleResult {
  rule: SourceRuleData | undefined;
  ruleDetailsHref: string | null;
  isLoading: boolean;
  isError: boolean;
}

export const useResolveSourceRule = ({
  ruleId,
  http,
}: UseResolveSourceRuleOptions): UseResolveSourceRuleResult => {
  const dataSource = useAdditionalEpisodesDataSource();
  const hasResolver = Boolean(dataSource?.resolveRules);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.resolveSourceRule(ruleId ?? ''),
    queryFn: async () => {
      const rules = await dataSource!.resolveRules!({ services: { http }, ids: [ruleId!] });
      return rules.length > 0 ? rules[0] : null;
    },
    enabled: hasResolver && Boolean(ruleId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  });

  const canResolve = hasResolver && Boolean(ruleId);

  const ruleDetailsHref =
    ruleId && dataSource?.getRuleDetailsHref
      ? dataSource.getRuleDetailsHref(ruleId)
      : null;

  const preparedHref = ruleDetailsHref ? http.basePath.prepend(ruleDetailsHref) : null;

  return {
    rule: data ?? undefined,
    ruleDetailsHref: preparedHref,
    isLoading: canResolve && isLoading,
    isError,
  };
};
