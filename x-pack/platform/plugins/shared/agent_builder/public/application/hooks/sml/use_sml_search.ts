/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useQuery } from '@kbn/react-query';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

const SML_SEARCH_DEBOUNCE_MS = 250;

export const useSmlSearch = (query: string) => {
  const { smlService } = useAgentBuilderServices();
  const debouncedQuery = useDebouncedValue(query, SML_SEARCH_DEBOUNCE_MS);

  const searchQuery = useMemo(() => {
    const trimmed = debouncedQuery.trim();
    return trimmed.length > 0 ? trimmed : '*';
  }, [debouncedQuery]);

  const queryResult = useQuery({
    queryKey: queryKeys.sml.search(searchQuery),
    queryFn: () => smlService.search({ query: searchQuery, size: 20 }),
  });

  return {
    results: queryResult.data?.results ?? [],
    total: queryResult.data?.total ?? 0,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
  };
};
