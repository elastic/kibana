/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { useMemo } from 'react';
import { useKibana } from '../use_kibana';
import { useFetchErrorToast } from '../use_fetch_error_toast';

export const CODE_KNOWLEDGE_INDICATORS_QUERY_KEY = ['code-intelligence-knowledge-indicators'];

/**
 * Fetches code-derived Knowledge Indicators (features + queries) across all
 * KI-bearing streams — including the service-name pseudo-streams that code
 * features are keyed by, which the real-stream-scoped features fetch omits.
 * Maps the raw features/queries into the shared `KnowledgeIndicator` shape.
 */
export function useFetchCodeKnowledgeIndicators({ enabled = true }: { enabled?: boolean } = {}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  const { data, isLoading, refetch } = useQuery({
    queryKey: CODE_KNOWLEDGE_INDICATORS_QUERY_KEY,
    queryFn: ({ signal }: QueryFunctionContext) =>
      streamsRepositoryClient.fetch(
        'GET /internal/streams/code_intelligence/_knowledge_indicators',
        { signal: signal ?? null }
      ),
    onError: showFetchErrorToast,
    enabled,
  });

  const knowledgeIndicators = useMemo<KnowledgeIndicator[]>(() => {
    const featureKnowledgeIndicators = (data?.features ?? []).map((feature) => ({
      kind: 'feature' as const,
      feature,
    }));

    const queryKnowledgeIndicators = (data?.queries ?? []).map((link) => ({
      kind: 'query' as const,
      query: link.query,
      rule: { backed: link.rule_backed, id: link.query.id },
      stream_name: link.stream_name,
    }));

    return [...featureKnowledgeIndicators, ...queryKnowledgeIndicators];
  }, [data?.features, data?.queries]);

  return { knowledgeIndicators, isLoading, refetch };
}
