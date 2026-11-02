/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError, type HttpStart, type ResponseErrorBody } from '@kbn/core-http-browser';
import { useQuery } from '@kbn/react-query';
import type { MatchActionPoliciesResponse, MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_INTERNAL_ACTION_POLICY_MATCH_API_PATH } from '@kbn/alerting-v2-constants';

interface UseMatchedActionPoliciesParams {
  http: HttpStart;
  routingTags?: string[];
}

/** Prefix for every matched-policy query. Invalidate this after a policy mutation. */
export const matchedActionPoliciesQueryKey = ['matchedActionPolicies'] as const;

const MAX_RETRIES = 3;

const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (isHttpFetchError(error)) {
    const responseBody = error.body as ResponseErrorBody | undefined;
    const statusCode = error.response?.status ?? responseBody?.statusCode;

    if (statusCode === 403) {
      return false;
    }
  }

  return failureCount < MAX_RETRIES;
};

export interface UseMatchedActionPoliciesResult {
  isLoading: boolean;
  /** True while `keepPreviousData` is still showing matches for the previous routing tags. */
  isPreviousData: boolean;
  error: Error | null;
  items: MatchedActionPolicy[];
  evaluatedCount: number;
  isTruncated: boolean;
}

export const useMatchedActionPolicies = ({
  http,
  routingTags,
}: UseMatchedActionPoliciesParams): UseMatchedActionPoliciesResult => {
  const body = { rule: routingTags?.length ? { routing_tags: routingTags } : {} };

  const { isLoading, isPreviousData, error, data } = useQuery({
    queryKey: [...matchedActionPoliciesQueryKey, routingTags],
    queryFn: () =>
      http.fetch<MatchActionPoliciesResponse>(ALERTING_V2_INTERNAL_ACTION_POLICY_MATCH_API_PATH, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    retry: shouldRetry,
  });

  return {
    isLoading,
    isPreviousData,
    error: error instanceof Error ? error : error != null ? new Error(String(error)) : null,
    items: data?.items ?? [],
    evaluatedCount: data?.evaluated_count ?? 0,
    isTruncated: data?.is_truncated ?? false,
  };
};
