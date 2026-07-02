/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useQuery } from '@kbn/react-query';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { i18n } from '@kbn/i18n';
import type { CeSearchFilters, CeSearchConstraints } from '@kbn/context-engine-plugin/public';
import { CE_SEARCH_DEFAULT_SIZE } from '../../../services/ce/constants';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useKibana } from '../use_kibana';
import { normalizeCeSearchQuery } from './normalize_ce_search_query';

const CE_SEARCH_DEBOUNCE_MS = 250;
const CE_SEARCH_STALE_TIME_MS = 60_000;
const CE_SEARCH_CACHE_TIME_MS = 300_000;

const ceSearchErrorToastTitle = i18n.translate(
  'xpack.agentBuilder.conversationInput.commandMenu.ceSearchErrorTitle',
  { defaultMessage: 'Unable to load semantic knowledge' }
);

export interface UseCeSearchOptions {
  /** Runtime-imposed per-type id-allowlist constraints. */
  readonly constraints?: CeSearchConstraints;
  /** Agent-discoverable filters (`types[]`, `tags[]`). */
  readonly filters?: CeSearchFilters;
}

export const useCeSearch = (query: string, options?: UseCeSearchOptions) => {
  const { services } = useKibana();
  const { ceService } = useAgentBuilderServices();
  const debouncedQuery = useDebouncedValue(query, CE_SEARCH_DEBOUNCE_MS);
  const constraints = options?.constraints;
  const filters = options?.filters;

  const searchQuery = useMemo(() => normalizeCeSearchQuery(debouncedQuery), [debouncedQuery]);

  const { isError, isLoading, error, data } = useQuery({
    queryKey: queryKeys.ce.search(searchQuery, constraints, filters),
    queryFn: () =>
      ceService.search({
        query: searchQuery,
        size: CE_SEARCH_DEFAULT_SIZE,
        constraints,
        filters,
      }),
    staleTime: CE_SEARCH_STALE_TIME_MS,
    cacheTime: CE_SEARCH_CACHE_TIME_MS,
  });

  useEffect(() => {
    if (!isError || isLoading) {
      return;
    }
    const err = error;
    services.notifications.toasts.addError(
      err instanceof Error ? err : new Error(formatAgentBuilderErrorMessage(err)),
      {
        title: ceSearchErrorToastTitle,
      }
    );
  }, [isError, isLoading, error, services.notifications.toasts]);

  return {
    results: data?.results ?? [],
    isLoading,
    isError,
    error,
  };
};
