/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@kbn/react-query';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

const SML_SEARCH_DEBOUNCE_MS = 250;

export const useSmlSearch = (query: string) => {
  const { smlService } = useAgentBuilderServices();
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), SML_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const keywords = useMemo(() => {
    const trimmed = debouncedQuery.trim();
    return trimmed.length > 0 ? [trimmed] : ['*'];
  }, [debouncedQuery]);

  const queryResult = useQuery({
    queryKey: queryKeys.sml.search(keywords),
    queryFn: () => smlService.search({ keywords, size: 20 }),
  });

  return {
    results: queryResult.data?.results ?? [],
    total: queryResult.data?.total ?? 0,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
  };
};
