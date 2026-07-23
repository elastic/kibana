/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useMemo, useCallback } from 'react';
import { escapeQuotes } from '@kbn/es-query';
import type { BulkByIdsParams, BulkByQueryParams } from '../services/rules_api';

/**
 * Discriminated union returned by {@link useBulkSelect}'s `getBulkParams`.
 * `mode: 'by_ids'` targets the by-ID endpoints; `mode: 'by_query'` targets
 * the by-query endpoints (which the caller must invoke with `force: true`
 * when executing rather than previewing).
 */
export type BulkSelection =
  | ({ mode: 'by_ids' } & BulkByIdsParams)
  | ({ mode: 'by_query' } & Omit<BulkByQueryParams, 'force'>);

interface BulkSelectState {
  /**
   * When `isAllSelected` is false, this is the **inclusion** set (selected IDs).
   * When `isAllSelected` is true, this is the **exclusion** set (deselected IDs).
   */
  selectedIds: Set<string>;
  isAllSelected: boolean;
}

enum ActionType {
  TOGGLE_ROW = 'TOGGLE_ROW',
  SELECT_ALL = 'SELECT_ALL',
  SET_PAGE_SELECTION = 'SET_PAGE_SELECTION',
  CLEAR_SELECTION = 'CLEAR_SELECTION',
}

type Action =
  | { type: ActionType.TOGGLE_ROW; payload: string }
  | { type: ActionType.SELECT_ALL }
  | { type: ActionType.SET_PAGE_SELECTION; payload: string[] }
  | { type: ActionType.CLEAR_SELECTION };

const initialState: BulkSelectState = {
  selectedIds: new Set<string>(),
  isAllSelected: false,
};

const reducer = (state: BulkSelectState, action: Action): BulkSelectState => {
  switch (action.type) {
    case ActionType.SELECT_ALL:
      return {
        isAllSelected: true,
        selectedIds: new Set<string>(),
      };

    case ActionType.TOGGLE_ROW: {
      const nextIds = new Set(state.selectedIds);
      if (nextIds.has(action.payload)) {
        nextIds.delete(action.payload);
      } else {
        nextIds.add(action.payload);
      }
      return { ...state, selectedIds: nextIds };
    }

    case ActionType.SET_PAGE_SELECTION:
      return {
        ...state,
        selectedIds: new Set(action.payload),
      };

    case ActionType.CLEAR_SELECTION:
      return { ...initialState, selectedIds: new Set<string>() };

    default:
      return state;
  }
};

interface UseBulkSelectProps {
  /** Total number of rules across all pages. */
  totalItemCount: number;
  /** The visible page of items. */
  items: Array<{ id: string }>;
  /** Facet filter KQL, same as list-rules `filter` query param. */
  filter?: string;
  /** Debounced search string, same as list-rules `search` query param. */
  search?: string;
}

export const useBulkSelect = ({ totalItemCount, items, filter, search }: UseBulkSelectProps) => {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    selectedIds: new Set<string>(),
  });

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const selectedCount = useMemo(() => {
    if (!totalItemCount) {
      return 0;
    }
    if (state.isAllSelected) {
      return totalItemCount - state.selectedIds.size;
    }
    // Only IDs that are actually on the current page count
    return itemIds.filter((id) => state.selectedIds.has(id)).length;
  }, [state, itemIds, totalItemCount]);

  const isPageSelected = useMemo(() => {
    if (!items.length) {
      return false;
    }
    return items.every((item) => {
      if (state.isAllSelected) {
        // In select-all mode, the row is selected unless it is in the exclusion set
        return !state.selectedIds.has(item.id);
      }
      return state.selectedIds.has(item.id);
    });
  }, [state, items]);

  const isRowSelected = useCallback(
    (ruleId: string): boolean => {
      if (state.isAllSelected) {
        return !state.selectedIds.has(ruleId);
      }
      return state.selectedIds.has(ruleId);
    },
    [state]
  );

  const onSelectRow = useCallback((ruleId: string) => {
    dispatch({ type: ActionType.TOGGLE_ROW, payload: ruleId });
  }, []);

  const onSelectAll = useCallback(() => {
    dispatch({ type: ActionType.SELECT_ALL });
  }, []);

  const onSelectPage = useCallback(() => {
    if (state.isAllSelected) {
      // In select-all mode: clicking the header checkbox should exclude/include the whole page
      if (isPageSelected) {
        // Page is fully selected → exclude all page items
        dispatch({
          type: ActionType.SET_PAGE_SELECTION,
          payload: [...state.selectedIds, ...itemIds],
        });
      } else {
        // Some deselected → remove page items from exclusion set
        const nextIds = new Set(state.selectedIds);
        for (const id of itemIds) {
          nextIds.delete(id);
        }
        dispatch({ type: ActionType.SET_PAGE_SELECTION, payload: [...nextIds] });
      }
    } else {
      // Normal mode
      if (isPageSelected) {
        // Deselect the page
        const pageIdSet = new Set(itemIds);
        const nextIds = [...state.selectedIds].filter((id) => !pageIdSet.has(id));
        dispatch({ type: ActionType.SET_PAGE_SELECTION, payload: nextIds });
      } else {
        // Select the page
        dispatch({
          type: ActionType.SET_PAGE_SELECTION,
          payload: [...state.selectedIds, ...itemIds],
        });
      }
    }
  }, [state, isPageSelected, itemIds]);

  const onClearSelection = useCallback(() => {
    dispatch({ type: ActionType.CLEAR_SELECTION });
  }, []);

  /**
   * Returns a {@link BulkSelection} describing the current selection.
   *
   * - `mode: 'by_ids'` — explicit selection; caller invokes the by-ID endpoint.
   * - `mode: 'by_query'` — select-all mode; caller invokes the by-query
   *   endpoint (must set `force: true` to execute rather than preview).
   *
   * In select-all mode with excluded IDs, the exclusion set is folded into
   * the KQL filter as a `NOT (id: ...)` clause so the server does not need
   * to know about exclusion lists.
   */
  const getBulkParams = useCallback((): BulkSelection => {
    if (!state.isAllSelected) {
      return { mode: 'by_ids', ids: [...state.selectedIds] };
    }

    const excludedIds = [...state.selectedIds];
    const exclusionClauses =
      excludedIds.length > 0
        ? excludedIds.map((id) => `id: "${escapeQuotes(id)}"`).join(' or ')
        : undefined;

    const wrappedFilter = filter ? `(${filter})` : undefined;
    const combinedFilter = [
      wrappedFilter,
      exclusionClauses ? `NOT (${exclusionClauses})` : undefined,
    ]
      .filter(Boolean)
      .join(' AND ');

    return {
      mode: 'by_query',
      ...(combinedFilter ? { filter: combinedFilter } : {}),
      ...(search ? { search } : {}),
      ...(!combinedFilter && !search ? { match_all: true as const } : {}),
    };
  }, [state, filter, search]);

  return useMemo(
    () => ({
      isAllSelected: state.isAllSelected,
      selectedCount,
      isPageSelected,
      isRowSelected,
      onSelectRow,
      onSelectAll,
      onSelectPage,
      onClearSelection,
      getBulkParams,
    }),
    [
      state.isAllSelected,
      selectedCount,
      isPageSelected,
      isRowSelected,
      onSelectRow,
      onSelectAll,
      onSelectPage,
      onClearSelection,
      getBulkParams,
    ]
  );
};
