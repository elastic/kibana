/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useAdditionalEpisodesDataSource } from '../context/episode_data_source_context';
import { queryKeys } from '../query_keys';

export interface UseFetchSourceRuleOptions {
  ruleId: string | undefined;
  http: HttpStart;
  /** Cached rule from the episodes table, shown while the source fetch refreshes. */
  initialRule?: RuleResponse;
}

export interface UseFetchSourceRuleResult {
  rule: RuleResponse | undefined;
  ruleDetailsHref: string | null;
  isLoading: boolean;
  isError: boolean;
}

export const useFetchSourceRule = ({
  ruleId,
  http,
  initialRule,
}: UseFetchSourceRuleOptions): UseFetchSourceRuleResult => {
  const dataSource = useAdditionalEpisodesDataSource();
  const hasResolver = Boolean(dataSource?.resolveRules);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.fetchSourceRule(dataSource?.id ?? '', ruleId ?? ''),
    queryFn: async () => {
      const rules = await dataSource!.resolveRules!({ services: { http }, ids: [ruleId!] });
      return rules.length > 0 ? rules[0] : null;
    },
    enabled: hasResolver && Boolean(ruleId),
    initialData: initialRule,
    // Treat the table cache as immediately stale so the flyout can refresh from the source.
    initialDataUpdatedAt: initialRule ? 0 : undefined,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  });

  const canResolve = hasResolver && Boolean(ruleId);

  const ruleDetailsHref =
    ruleId && dataSource?.getRuleDetailsHref ? dataSource.getRuleDetailsHref(ruleId) : null;

  const preparedHref = ruleDetailsHref ? http.basePath.prepend(ruleDetailsHref) : null;

  return {
    rule: data ?? undefined,
    ruleDetailsHref: preparedHref,
    isLoading: canResolve && isLoading,
    isError,
  };
};
