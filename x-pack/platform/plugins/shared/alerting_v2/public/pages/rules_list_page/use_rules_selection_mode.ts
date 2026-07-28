/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useActiveFilters,
  useContentListItems,
  useContentListSelection,
  useContentListState,
} from '@kbn/content-list-provider';
import type { BulkSelection } from '../../hooks/use_bulk_select';
import { toRulesQueryParams } from './rules_query_params';

export type RulesSelectionMode = 'byIds' | 'allMatching';

export interface UseRulesSelectionModeReturn {
  /** Current selection intent. */
  mode: RulesSelectionMode;
  /** True when mode is `allMatching`. */
  isAllSelected: boolean;
  /**
   * Count shown in the bulk bar. In `allMatching` this is the full match
   * total; otherwise the page-scoped Content List selection count.
   */
  selectedCount: number;
  /** Total rules matching the active query (all pages). */
  totalItemCount: number;
  /** Enter `allMatching` and check every row on the current page. */
  selectAllMatching: () => void;
  /** Clear Content List selection and reset mode to `byIds`. */
  clearSelection: () => void;
  /** Emit the existing {@link BulkSelection} union for bulk mutation hooks. */
  getBulkParams: () => BulkSelection;
}

/**
 * Thin selection-mode layer on top of Content List's page-scoped `selectedIds`.
 *
 * Content List cannot express select-all-by-query, and it clears selection on
 * page/filter/sort changes. This hook owns the `byIds` / `allMatching` intent,
 * resets it when the query or sort changes (but not on pagination), re-checks
 * visible rows while in `allMatching`, and exits to `byIds` when the user
 * unchecks a row or deselects the whole page.
 */
export const useRulesSelectionMode = (): UseRulesSelectionModeReturn => {
  const [mode, setMode] = useState<RulesSelectionMode>('byIds');
  const { state } = useContentListState();
  const { items } = useContentListItems();
  const activeFilters = useActiveFilters();
  const {
    selectedIds,
    selectedCount: pageSelectedCount,
    setSelection,
    clearSelection: clearContentListSelection,
  } = useContentListSelection();

  const queryText = state.queryText;
  const sortField = state.sort.field;
  const sortDirection = state.sort.direction;
  const pageIndex = state.page.index;
  const totalItemCount = state.totalItems;

  const previousQueryRef = useRef({ queryText, sortField, sortDirection });
  const previousPageIndexRef = useRef(pageIndex);

  // Single effect owns mode reset + page sync so a query change that clears
  // selectedIds cannot race with "re-check all rows" while still in allMatching.
  useEffect(() => {
    const previousQuery = previousQueryRef.current;
    const queryOrSortChanged =
      previousQuery.queryText !== queryText ||
      previousQuery.sortField !== sortField ||
      previousQuery.sortDirection !== sortDirection;
    previousQueryRef.current = { queryText, sortField, sortDirection };

    if (queryOrSortChanged) {
      previousPageIndexRef.current = pageIndex;
      if (mode !== 'byIds') {
        setMode('byIds');
      }
      return;
    }

    if (mode !== 'allMatching') {
      previousPageIndexRef.current = pageIndex;
      return;
    }

    if (items.length === 0) {
      return;
    }

    const selectedIdSet = new Set(selectedIds);
    const allChecked = items.every((item) => selectedIdSet.has(item.id));
    if (allChecked) {
      previousPageIndexRef.current = pageIndex;
      return;
    }

    const pageChanged = previousPageIndexRef.current !== pageIndex;
    previousPageIndexRef.current = pageIndex;

    if (selectedIds.length === 0) {
      if (pageChanged) {
        // Pagination wiped selectedIds; restore checked appearance for the new page.
        setSelection(items);
      } else {
        // Deselect-all on the same page — exit allMatching so bulk cannot still
        // target the full filtered set while nothing looks selected.
        setMode('byIds');
      }
      return;
    }

    // Partial selection means the user unchecked at least one row.
    setMode('byIds');
  }, [mode, items, selectedIds, setSelection, queryText, sortField, sortDirection, pageIndex]);

  const selectAllMatching = useCallback(() => {
    setMode('allMatching');
    setSelection(items);
  }, [items, setSelection]);

  const clearSelection = useCallback(() => {
    setMode('byIds');
    clearContentListSelection();
  }, [clearContentListSelection]);

  const getBulkParams = useCallback((): BulkSelection => {
    if (mode === 'allMatching') {
      const { filter, search } = toRulesQueryParams(activeFilters);
      return {
        mode: 'by_query',
        ...(filter ? { filter } : {}),
        ...(search ? { search } : {}),
        ...(!filter && !search ? { match_all: true as const } : {}),
      };
    }
    return { mode: 'by_ids', ids: [...selectedIds] };
  }, [mode, activeFilters, selectedIds]);

  const selectedCount = mode === 'allMatching' ? totalItemCount : pageSelectedCount;

  return useMemo(
    () => ({
      mode,
      isAllSelected: mode === 'allMatching',
      selectedCount,
      totalItemCount,
      selectAllMatching,
      clearSelection,
      getBulkParams,
    }),
    [mode, selectedCount, totalItemCount, selectAllMatching, clearSelection, getBulkParams]
  );
};
