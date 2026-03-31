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
import { SML_SEARCH_DEFAULT_SIZE } from '../../../services/sml/constants';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useKibana } from '../use_kibana';
import { normalizeSmlSearchQuery } from './normalize_sml_search_query';

const SML_SEARCH_DEBOUNCE_MS = 250;
const SML_SEARCH_STALE_TIME_MS = 60_000;
const SML_SEARCH_CACHE_TIME_MS = 300_000;

const smlSearchErrorToastTitle = i18n.translate(
  'xpack.agentBuilder.conversationInput.commandMenu.smlSearchErrorTitle',
  { defaultMessage: 'Unable to load semantic knowledge' }
);

export interface UseSmlSearchOptions {
  /** When true, the server omits indexed `content` on each hit (smaller payload; e.g. command-menu autocomplete). */
  readonly skipContent?: boolean;
}

export const useSmlSearch = (query: string, options?: UseSmlSearchOptions) => {
  const { services } = useKibana();
  const { smlService } = useAgentBuilderServices();
  const debouncedQuery = useDebouncedValue(query, SML_SEARCH_DEBOUNCE_MS);
  const skipContent = options?.skipContent ?? false;

  const searchQuery = useMemo(() => normalizeSmlSearchQuery(debouncedQuery), [debouncedQuery]);

  const { isError, isLoading, error, data } = useQuery({
    queryKey: queryKeys.sml.search(searchQuery, skipContent),
    queryFn: () =>
      smlService.search({
        query: searchQuery,
        size: SML_SEARCH_DEFAULT_SIZE,
        skipContent,
      }),
    staleTime: SML_SEARCH_STALE_TIME_MS,
    cacheTime: SML_SEARCH_CACHE_TIME_MS,
  });

  useEffect(() => {
    if (!isError || isLoading) {
      return;
    }
    const err = error;
    services.notifications.toasts.addError(
      err instanceof Error ? err : new Error(formatAgentBuilderErrorMessage(err)),
      {
        title: smlSearchErrorToastTitle,
      }
    );
  }, [isError, isLoading, error, services.notifications.toasts]);

  return {
    results: data?.results ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
  };
};
