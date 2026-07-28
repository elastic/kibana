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

const hasSameMembers = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  const aSet = new Set(a);
  return b.every((id) => aSet.has(id));
};

/**
 * Thin selection-mode layer on top of Content List's page-scoped `selectedIds`.
 *
 * Content List cannot express select-all-by-query, so this hook owns the
 * `byIds` / `allMatching` intent alongside it and follows the same shape as the
 * detection rules table in Security Solution: `allMatching` survives pagination
 * but is never written back into Content List's selection, so rows on later
 * pages render unchecked while the bulk bar keeps reporting the full match
 * total. Only the query, sort, or page size — the inputs that redefine which
 * rules match — drop it back to `byIds`.
 *
 * Detecting a user un-check takes a baseline rather than an event: Content List
 * wires EUI's `onSelectionChange` straight into its reducer with no
 * consumer-visible callback, so the only way to tell a deliberate checkbox
 * click apart from the reducer's own clearing is to compare `selectedIds`
 * against what we last expected it to hold.
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
  const pageSize = state.page.size;
  const totalItemCount = state.totalItems;

  const previousScopeRef = useRef({ queryText, sortField, sortDirection, pageSize });
  const previousPageIndexRef = useRef(pageIndex);
  const expectedSelectionRef = useRef<readonly string[]>([]);

  useEffect(() => {
    const previousScope = previousScopeRef.current;
    const scopeChanged =
      previousScope.queryText !== queryText ||
      previousScope.sortField !== sortField ||
      previousScope.sortDirection !== sortDirection ||
      previousScope.pageSize !== pageSize;
    previousScopeRef.current = { queryText, sortField, sortDirection, pageSize };

    const pageChanged = previousPageIndexRef.current !== pageIndex;
    previousPageIndexRef.current = pageIndex;

    // The reducer empties `selectedIds` on all of these. Re-baseline first so
    // the divergence check below cannot read that as a user un-check.
    if (scopeChanged || pageChanged) {
      expectedSelectionRef.current = [];
      if (scopeChanged) {
        setMode('byIds');
      }
      return;
    }

    if (mode !== 'allMatching') {
      return;
    }

    if (!hasSameMembers(expectedSelectionRef.current, selectedIds)) {
      // The user touched a checkbox, so their explicit choice replaces the
      // broader select-all rather than silently widening it.
      expectedSelectionRef.current = selectedIds;
      setMode('byIds');
    }
  }, [mode, selectedIds, queryText, sortField, sortDirection, pageSize, pageIndex]);

  const selectAllMatching = useCallback(() => {
    setMode('allMatching');
    setSelection(items);
    expectedSelectionRef.current = items.map((item) => item.id);
  }, [items, setSelection]);

  const clearSelection = useCallback(() => {
    setMode('byIds');
    clearContentListSelection();
    expectedSelectionRef.current = [];
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
