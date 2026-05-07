/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useCallback } from 'react';
import type { LibraryItem } from './library_panel';

export type SortOrder = 'asc' | 'desc';
export type FilterMode = 'all' | 'active' | 'elastic' | 'custom';

export interface FilterCounts {
  all: number;
  active: number;
  elastic: number;
  custom: number;
}

interface UseLibrarySortFilterOptions<T extends LibraryItem> {
  allItems: T[];
  activeItemIdSet: Set<string>;
  readOnlyItemIdSet?: Set<string>;
  getItemName: (item: T) => string;
  getSearchableText?: (item: T) => string[];
}

interface UseLibrarySortFilterResult<T extends LibraryItem> {
  filteredItems: T[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  filterCounts: FilterCounts;
}

export const useLibrarySortFilter = <T extends LibraryItem>({
  allItems,
  activeItemIdSet,
  readOnlyItemIdSet,
  getItemName,
  getSearchableText,
}: UseLibrarySortFilterOptions<T>): UseLibrarySortFilterResult<T> => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const getSearchFields = useCallback(
    (item: T): string[] =>
      getSearchableText ? getSearchableText(item) : [getItemName(item), item.description],
    [getSearchableText, getItemName]
  );

  const filterCounts = useMemo(
    () => ({
      all: allItems.length,
      active: allItems.filter((item) => activeItemIdSet.has(item.id)).length,
      elastic: allItems.filter((item) => readOnlyItemIdSet?.has(item.id) ?? false).length,
      custom: allItems.filter((item) => !(readOnlyItemIdSet?.has(item.id) ?? false)).length,
    }),
    [allItems, activeItemIdSet, readOnlyItemIdSet]
  );

  const filteredItems = useMemo(() => {
    // Stage 1: filter by mode
    let items = allItems;
    if (filterMode === 'active') {
      items = allItems.filter((item) => activeItemIdSet.has(item.id));
    } else if (filterMode === 'elastic') {
      items = allItems.filter((item) => readOnlyItemIdSet?.has(item.id) ?? false);
    } else if (filterMode === 'custom') {
      items = allItems.filter((item) => !(readOnlyItemIdSet?.has(item.id) ?? false));
    }

    // Stage 2: filter by search query
    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      items = items.filter((item) =>
        getSearchFields(item).some((field) => field.toLowerCase().includes(lower))
      );
    }

    // Stage 3: sort by name
    return [...items].sort((a, b) =>
      sortOrder === 'asc'
        ? getItemName(a).localeCompare(getItemName(b))
        : getItemName(b).localeCompare(getItemName(a))
    );
  }, [
    allItems,
    filterMode,
    searchQuery,
    sortOrder,
    activeItemIdSet,
    readOnlyItemIdSet,
    getSearchFields,
    getItemName,
  ]);

  return {
    filteredItems,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    filterMode,
    setFilterMode,
    filterCounts,
  };
};
