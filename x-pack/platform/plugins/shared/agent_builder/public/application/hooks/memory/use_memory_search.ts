/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { RetrievalStage } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../use_agent_builder_service';

export const useMemorySearch = () => {
  const { memoryService } = useAgentBuilderServices();

  const { mutate, mutateAsync, data, isLoading, error } = useMutation({
    mutationFn: ({
      query,
      stage,
      limit,
    }: {
      query: string;
      stage?: RetrievalStage;
      limit?: number;
    }) => memoryService.search({ query, stage, limit }),
  });

  return {
    search: mutate,
    searchAsync: mutateAsync,
    results: data?.results ?? [],
    total: data?.total ?? 0,
    lastQuery: data?.query,
    lastStage: data?.stage,
    isLoading,
    error,
  };
};
