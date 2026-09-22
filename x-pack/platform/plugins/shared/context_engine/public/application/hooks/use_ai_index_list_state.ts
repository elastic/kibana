/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { AiIndexHttpItem, AiIndexType } from '../../../common/http_api/ai_indices';
import type { AiIndexOwner } from '../utils/ai_index_owner';
import { getAiIndexOwner } from '../utils/ai_index_owner';

/** Fills four rows of the three-column card grid. */
export const AI_INDICES_PER_PAGE = 12;

interface AiIndexListFilters {
  query: string;
  types: AiIndexType[];
  owners: AiIndexOwner[];
}

const EMPTY_FILTERS: AiIndexListFilters = { query: '', types: [], owners: [] };

const matchesQuery = (aiIndex: AiIndexHttpItem, query: string): boolean => {
  const haystack = [aiIndex.id, aiIndex.description, aiIndex.dest.value];
  return haystack.some((field) => field?.toLowerCase().includes(query));
};

/** An empty selection means the group is unconstrained, not that nothing matches. */
const matchesFilters = (aiIndex: AiIndexHttpItem, { types, owners }: AiIndexListFilters): boolean =>
  (types.length === 0 || types.includes(aiIndex.dest.type)) &&
  (owners.length === 0 || owners.includes(getAiIndexOwner(aiIndex)));

export interface UseAiIndexListStateResult {
  filters: AiIndexListFilters;
  setQuery: (query: string) => void;
  setTypes: (types: AiIndexType[]) => void;
  setOwners: (owners: AiIndexOwner[]) => void;
  clearFilters: () => void;
  /** AI indexes matching the current search and filters, across all pages. */
  matchCount: number;
  /** The slice of matches to render for the active page. */
  visibleAiIndices: AiIndexHttpItem[];
  pageCount: number;
  activePage: number;
  setActivePage: (page: number) => void;
}

/**
 * Search, filter and paginate the AI indexes already in memory. The list API
 * returns every entry in one unpaginated response, so this never refetches.
 */
export const useAiIndexListState = (aiIndices: AiIndexHttpItem[]): UseAiIndexListStateResult => {
  const [filters, setFilters] = useState<AiIndexListFilters>(EMPTY_FILTERS);
  const [requestedPage, setRequestedPage] = useState(0);

  const updateFilters = useCallback((update: Partial<AiIndexListFilters>) => {
    setFilters((current) => ({ ...current, ...update }));
    setRequestedPage(0);
  }, []);

  const setQuery = useCallback((query: string) => updateFilters({ query }), [updateFilters]);
  const setTypes = useCallback((types: AiIndexType[]) => updateFilters({ types }), [updateFilters]);
  const setOwners = useCallback(
    (owners: AiIndexOwner[]) => updateFilters({ owners }),
    [updateFilters]
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setRequestedPage(0);
  }, []);

  const matches = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase();

    return aiIndices.filter(
      (aiIndex) =>
        matchesFilters(aiIndex, filters) &&
        (normalizedQuery === '' || matchesQuery(aiIndex, normalizedQuery))
    );
  }, [aiIndices, filters]);

  const pageCount = Math.max(1, Math.ceil(matches.length / AI_INDICES_PER_PAGE));
  // Clamped rather than reset so a refetch that shrinks the list keeps showing
  // results instead of an out-of-range blank page.
  const activePage = Math.min(requestedPage, pageCount - 1);

  const visibleAiIndices = useMemo(() => {
    const start = activePage * AI_INDICES_PER_PAGE;
    return matches.slice(start, start + AI_INDICES_PER_PAGE);
  }, [matches, activePage]);

  return {
    filters,
    setQuery,
    setTypes,
    setOwners,
    clearFilters,
    matchCount: matches.length,
    visibleAiIndices,
    pageCount,
    activePage,
    setActivePage: setRequestedPage,
  };
};
