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
import type { SmlSearchFilters, SmlSearchConstraints } from '@kbn/agent-builder-sml-plugin/public';
import { SML_SEARCH_DEFAULT_SIZE } from '../../../services/sml/constants';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useKibana } from '../use_kibana';
import { normalizeSmlSearchQuery } from './normalize_sml_search_query';

const SML_AUTOCOMPLETE_DEBOUNCE_MS = 250;
const SML_AUTOCOMPLETE_STALE_TIME_MS = 60_000;
const SML_AUTOCOMPLETE_CACHE_TIME_MS = 300_000;

const smlAutocompleteErrorToastTitle = i18n.translate(
  'xpack.agentBuilder.conversationInput.commandMenu.smlAutocompleteErrorTitle',
  { defaultMessage: 'Unable to load autocomplete suggestions' }
);

export interface UseSmlAutocompleteOptions {
  /** Runtime-imposed per-type id-allowlist constraints (e.g. agent-centric connector allow-list). */
  readonly constraints?: SmlSearchConstraints;
  /** Caller-supplied type/tag refinements (e.g. connectors-only picker). */
  readonly filters?: SmlSearchFilters;
}

/**
 * Typeahead hook for the @ menu. Hits POST `/sml/_autocomplete`, which returns
 * per-row `matched_discovery_labels` (with `kind` for UI badging, and
 * `highlighted` when ES is able to produce a snippet).
 *
 * For full retrieval (LLM tool, content search), see `useSmlSearch`.
 */
export const useSmlAutocomplete = (query: string, options?: UseSmlAutocompleteOptions) => {
  const { services } = useKibana();
  const { smlService } = useAgentBuilderServices();
  const debouncedQuery = useDebouncedValue(query, SML_AUTOCOMPLETE_DEBOUNCE_MS);
  const constraints = options?.constraints;
  const filters = options?.filters;

  const normalized = useMemo(() => normalizeSmlSearchQuery(debouncedQuery), [debouncedQuery]);

  const { isError, isLoading, error, data } = useQuery({
    queryKey: queryKeys.sml.autocomplete(normalized, constraints, filters),
    queryFn: () =>
      smlService.autocomplete({
        query: normalized,
        size: SML_SEARCH_DEFAULT_SIZE,
        constraints,
        filters,
      }),
    staleTime: SML_AUTOCOMPLETE_STALE_TIME_MS,
    cacheTime: SML_AUTOCOMPLETE_CACHE_TIME_MS,
    // Avoids `results` flashing empty on every debounce tick mid-keystroke.
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!isError || isLoading) {
      return;
    }
    services.notifications.toasts.addError(
      error instanceof Error ? error : new Error(formatAgentBuilderErrorMessage(error)),
      { title: smlAutocompleteErrorToastTitle }
    );
  }, [isError, isLoading, error, services.notifications.toasts]);

  return {
    results: data?.results ?? [],
    isLoading,
    isError,
    error,
  };
};
