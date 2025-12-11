/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash';
import { useKibana } from './use_kibana';

/**
 * Type of visualization for display and filtering
 */
export type VisualizationType = 'lens' | 'visualization' | 'map';

/**
 * Represents a saved visualization that can be referenced via @mention
 */
export interface VisualizationSuggestion {
  /** Saved object ID */
  id: string;
  /** Display title of the visualization */
  title: string;
  /** Type of visualization (lens, visualization, map) */
  type: VisualizationType;
  /** Optional description/notes */
  description?: string;
}

/**
 * Result of the useVisualizationSearch hook
 */
export interface UseVisualizationSearchResult {
  /** Array of matching visualization suggestions */
  suggestions: VisualizationSuggestion[];
  /** Whether a search is currently in progress */
  isLoading: boolean;
  /** Error that occurred during search, if any */
  error: Error | null;
  /** Function to trigger a search with the given term */
  search: (term: string) => void;
  /** Function to clear the current suggestions */
  clear: () => void;
}

/** Content types to search for visualizations */
const VISUALIZATION_CONTENT_TYPES = ['lens', 'visualization', 'map'] as const;

/** Maximum number of results to return */
const MAX_RESULTS = 10;

/** Debounce delay in milliseconds */
const DEBOUNCE_MS = 300;

/**
 * Hook to search for saved visualizations using the ContentManagement API.
 * Supports debounced searching across lens, visualization, and map saved objects.
 *
 * @returns {UseVisualizationSearchResult} Search state and controls
 *
 * @example
 * ```tsx
 * const { suggestions, isLoading, error, search, clear } = useVisualizationSearch();
 *
 * // Trigger search when user types after @
 * useEffect(() => {
 *   if (mentionContext.isActive) {
 *     search(mentionContext.searchTerm);
 *   } else {
 *     clear();
 *   }
 * }, [mentionContext.isActive, mentionContext.searchTerm]);
 * ```
 */
export function useVisualizationSearch(): UseVisualizationSearchResult {
  const { services } = useKibana();
  const contentManagement = services.plugins.contentManagement;

  const [suggestions, setSuggestions] = useState<VisualizationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track the current search term for deduplication
  const currentSearchTermRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(
    async (searchTerm: string) => {
      // eslint-disable-next-line no-console
      console.debug('[useVisualizationSearch] performSearch called with:', searchTerm);

      // Cancel any previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        // Build query - if empty search term, fetch recent/all visualizations
        const query = searchTerm.trim()
          ? { text: searchTerm, limit: MAX_RESULTS }
          : { text: '*', limit: MAX_RESULTS };

        // eslint-disable-next-line no-console
        console.debug('[useVisualizationSearch] Searching with query:', query);

        const result = await contentManagement.client.mSearch<{
          id: string;
          attributes: {
            title: string;
            description?: string;
          };
          type: string;
        }>({
          contentTypes: VISUALIZATION_CONTENT_TYPES.map((contentTypeId) => ({
            contentTypeId,
          })),
          query,
        });

        // eslint-disable-next-line no-console
        console.debug('[useVisualizationSearch] Search result:', result);

        // Only update if this is still the current search
        if (currentSearchTermRef.current === searchTerm) {
          const mappedSuggestions: VisualizationSuggestion[] = result.hits.map((hit) => ({
            id: hit.id,
            title: hit.attributes?.title || 'Untitled',
            type: hit.type as VisualizationType,
            description: hit.attributes?.description,
          }));

          // eslint-disable-next-line no-console
          console.debug('[useVisualizationSearch] Setting suggestions:', mappedSuggestions);

          setSuggestions(mappedSuggestions);
          setIsLoading(false);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        // Log error for debugging
        // eslint-disable-next-line no-console
        console.warn('[useVisualizationSearch] Search failed:', err);

        // Only update error if this is still the current search
        if (currentSearchTermRef.current === searchTerm) {
          setError(err instanceof Error ? err : new Error('Failed to search visualizations'));
          setSuggestions([]);
          setIsLoading(false);
        }
      }
    },
    [contentManagement.client]
  );

  // Create debounced search function
  const debouncedSearch = useRef(
    debounce((term: string) => {
      performSearch(term);
    }, DEBOUNCE_MS)
  ).current;

  const search = useCallback(
    (term: string) => {
      currentSearchTermRef.current = term;
      setIsLoading(true);

      // For empty terms, search immediately (show all visualizations)
      // For non-empty terms, use debounce
      if (!term.trim()) {
        debouncedSearch.cancel();
        performSearch(term);
      } else {
        debouncedSearch(term);
      }
    },
    [debouncedSearch, performSearch]
  );

  const clear = useCallback(() => {
    currentSearchTermRef.current = '';
    debouncedSearch.cancel();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSuggestions([]);
    setIsLoading(false);
    setError(null);
  }, [debouncedSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearch]);

  return {
    suggestions,
    isLoading,
    error,
    search,
    clear,
  };
}
