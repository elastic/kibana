/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QUERY_TYPE_STATS } from '@kbn/streams-schema';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { useFetchDiscoveryQueries } from './use_fetch_discovery_queries';
import { useOnboardingApi } from '../use_onboarding_api';
import { HIGH_SEVERITY_THRESHOLD } from './use_unbacked_queries_count';

/**
 * Returns the count and IDs of promotable (draft/not-yet-promoted) queries for a specific stream.
 *
 * perPage is set high (1000) to ensure we always capture all draft queries in a single request.
 * The decision to set 1_000 can be found here - https://github.com/elastic/streams-program/blob/e7a11a8a3414a9f581d504b0840ff5d93f6e8564/docs/significant-events/design-decisions/2026-03-31-promote-query-default-count.md
 * The API returns `total` regardless of page size, so the count is always accurate.
 * IDs are used by the promote action — a hard cap would silently leave queries un-promoted.
 * In practice a stream will never have anywhere near 1000 simultaneous draft queries.
 */
export function usePromotableQueries(streamName: string) {
  const discoveryQueriesResult = useFetchDiscoveryQueries({
    name: streamName,
    status: ['draft'],
    page: 1,
    perPage: 1_000,
  });

  const { getOnboardingExecution } = useOnboardingApi();

  const onboardingExecutionResult = useQuery({
    queryKey: ['onboardingExecution', streamName, 'promotableQueries'],
    queryFn: () => getOnboardingExecution(streamName),
  });

  const execution = onboardingExecutionResult.data;
  const filteredQueries = useMemo(() => {
    if (execution?.status !== 'completed') {
      return [];
    }

    const outputs = (execution.output as Record<string, unknown> | undefined)?.outputs as
      | { persistedQueries?: Array<{ esql: { query: string } }> }
      | undefined;

    const persistedQueries = outputs?.persistedQueries ?? [];
    const persistedQueriesEsqlSet = new Set(
      persistedQueries.map((query) => query.esql.query.trim()).filter((esql) => esql.length > 0)
    );

    if (persistedQueriesEsqlSet.size === 0) {
      return [];
    }

    return (discoveryQueriesResult.data?.queries ?? [])
      .filter(
        (queryRow) =>
          queryRow.query.type !== QUERY_TYPE_STATS &&
          persistedQueriesEsqlSet.has(queryRow.query.esql.query.trim())
      )
      .filter((queryRow) => (queryRow.query.severity_score ?? 0) >= HIGH_SEVERITY_THRESHOLD);
  }, [discoveryQueriesResult.data?.queries, execution]);

  return {
    queries: filteredQueries,
    isLoading: discoveryQueriesResult.isLoading || onboardingExecutionResult.isLoading,
    refetch: async () => {
      await Promise.all([discoveryQueriesResult.refetch(), onboardingExecutionResult.refetch()]);
    },
  };
}
