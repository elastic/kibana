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

const CE_AUTOCOMPLETE_DEBOUNCE_MS = 250;
const CE_AUTOCOMPLETE_STALE_TIME_MS = 60_000;
const CE_AUTOCOMPLETE_CACHE_TIME_MS = 300_000;

const ceAutocompleteErrorToastTitle = i18n.translate(
  'xpack.agentBuilder.conversationInput.commandMenu.ceAutocompleteErrorTitle',
  { defaultMessage: 'Unable to load autocomplete suggestions' }
);

export interface UseCeAutocompleteOptions {
  /** Runtime-imposed per-type id-allowlist constraints (e.g. agent-centric connector allow-list). */
  readonly constraints?: CeSearchConstraints;
  /** Caller-supplied type/tag refinements (e.g. connectors-only picker). */
  readonly filters?: CeSearchFilters;
}

/**
 * Typeahead hook for the @ menu. Hits POST `/ce/_autocomplete`, which returns
 * per-row `matched_discovery_labels` (with `kind` for UI badging, and
 * `highlighted` when ES is able to produce a snippet).
 *
 * For full retrieval (LLM tool, content search), see `useCeSearch`.
 */
export const useCeAutocomplete = (query: string, options?: UseCeAutocompleteOptions) => {
  const { services } = useKibana();
  const { ceService } = useAgentBuilderServices();
  const debouncedQuery = useDebouncedValue(query, CE_AUTOCOMPLETE_DEBOUNCE_MS);
  const constraints = options?.constraints;
  const filters = options?.filters;

  const normalized = useMemo(() => normalizeCeSearchQuery(debouncedQuery), [debouncedQuery]);

  const { isError, isLoading, error, data } = useQuery({
    queryKey: queryKeys.ce.autocomplete(normalized, constraints, filters),
    queryFn: () =>
      ceService.autocomplete({
        query: normalized,
        size: CE_SEARCH_DEFAULT_SIZE,
        constraints,
        filters,
      }),
    staleTime: CE_AUTOCOMPLETE_STALE_TIME_MS,
    cacheTime: CE_AUTOCOMPLETE_CACHE_TIME_MS,
  });

  useEffect(() => {
    if (!isError || isLoading) {
      return;
    }
    services.notifications.toasts.addError(
      error instanceof Error ? error : new Error(formatAgentBuilderErrorMessage(error)),
      { title: ceAutocompleteErrorToastTitle }
    );
  }, [isError, isLoading, error, services.notifications.toasts]);

  return {
    results: data?.results ?? [],
    isLoading,
    isError,
    error,
  };
};
