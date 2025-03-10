/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useReducer, useMemo, useCallback } from 'react';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';
import { mapFiltersToKueryNode } from '../lib/rule_api/map_filters_to_kuery_node';
import { RuleTableItem, RulesListFilters } from '../../types';

interface BulkEditSelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
}

enum ActionTypes {
  TOGGLE_SELECT_ALL = 'TOGGLE_SELECT_ALL',
  TOGGLE_ROW = 'TOGGLE_ROW',
  SET_SELECTION = 'SET_SELECTION',
  CLEAR_SELECTION = 'CLEAR_SELECTION',
}

interface Action {
  type: ActionTypes;
  payload?: string | string[] | boolean;
}

const initialState: BulkEditSelectionState = {
  selectedIds: new Set<string>(),
  isAllSelected: false,
};

const reducer = (state: BulkEditSelectionState, action: Action) => {
  const { type, payload } = action;
  switch (type) {
    case ActionTypes.TOGGLE_SELECT_ALL:
      return {
        ...state,
        isAllSelected: !state.isAllSelected,
        selectedIds: new Set<string>(),
      };
    case ActionTypes.TOGGLE_ROW: {
      const id = payload as string;
      if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
      } else {
        state.selectedIds.add(id);
      }
      return {
        ...state,
        selectedIds: new Set<string>(state.selectedIds),
      };
    }
    case ActionTypes.SET_SELECTION: {
      const selectedIds = payload as string[];
      return {
        ...state,
        selectedIds: new Set<string>(selectedIds),
      };
    }
    case ActionTypes.CLEAR_SELECTION: {
      return {
        ...initialState,
        selectedIds: new Set<string>(),
      };
    }
    default:
      return state;
  }
};

interface UseBulkEditSelectProps {
  totalItemCount: number;
  items: RuleTableItem[];
  filters?: RulesListFilters;
}

export function useBulkEditSelect(props: UseBulkEditSelectProps) {
  const { totalItemCount = 0, items = [], filters } = props;

  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    selectedIds: new Set<string>(),
  });

  const itemIds = useMemo(() => {
    return items.map((item) => item.id);
  }, [items]);

  const numberOfSelectedItems = useMemo(() => {
    const { selectedIds, isAllSelected } = state;
    if (!totalItemCount) {
      return 0;
    }
    if (isAllSelected) {
      return totalItemCount - selectedIds.size;
    }
    return itemIds.filter((id) => selectedIds.has(id)).length;
  }, [state, itemIds, totalItemCount]);

  const isPageSelected = useMemo(() => {
    const { selectedIds, isAllSelected } = state;
    if (!items.length) {
      return false;
    }
    return items.every((item) => {
      if (!item.isEditable) {
        return true;
      }
      if (isAllSelected) {
        return !selectedIds.has(item.id);
      }
      return selectedIds.has(item.id);
    });
  }, [state, items]);

  const isRowSelected = useCallback(
    (rule: RuleTableItem) => {
      const { selectedIds, isAllSelected } = state;
      if (!rule.isEditable) {
        return false;
      }
      if (isAllSelected) {
        return !selectedIds.has(rule.id);
      }
      return selectedIds.has(rule.id);
    },
    [state]
  );

  const onSelectRow = useCallback((rule: RuleTableItem) => {
    dispatch({ type: ActionTypes.TOGGLE_ROW, payload: rule.id });
  }, []);

  const onSelectAll = useCallback(() => {
    dispatch({ type: ActionTypes.TOGGLE_SELECT_ALL, payload: !state.isAllSelected });
  }, [state]);

  const onSelectPage = useCallback(() => {
    const { selectedIds, isAllSelected } = state;

    // Select current page in non-select all mode. Ignore rules that cannot be edited
    if (!isPageSelected && !isAllSelected) {
      const idsToSelect = items.filter((item) => item.isEditable).map((item) => item.id);
      dispatch({ type: ActionTypes.SET_SELECTION, payload: [...selectedIds, ...idsToSelect] });
    }
    // Unselect current page in non-select all mode.
    if (isPageSelected && !isAllSelected) {
      items.forEach((item) => selectedIds.delete(item.id));
      dispatch({ type: ActionTypes.SET_SELECTION, payload: [...selectedIds] });
    }
    // Select current page in select all mode. Ignore rules that cannot be edited
    if (!isPageSelected && isAllSelected) {
      items.forEach((item) => {
        if (item.isEditable) {
          selectedIds.delete(item.id);
        }
      });
      dispatch({ type: ActionTypes.SET_SELECTION, payload: [...selectedIds] });
    }
    // Unselect current page in select all mode.
    if (isPageSelected && isAllSelected) {
      dispatch({ type: ActionTypes.SET_SELECTION, payload: [...selectedIds, ...itemIds] });
    }
  }, [state, isPageSelected, items, itemIds]);

  const onClearSelection = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_SELECTION });
  }, []);

  const getFilterKueryNode = useCallback(
    (idsToExclude?: string[]) => {
      const ruleFilterKueryNode = mapFiltersToKueryNode(
        filters
          ? {
              typesFilter: filters.types,
              actionTypesFilter: filters.actionTypes,
              tagsFilter: filters.tags,
              ruleExecutionStatusesFilter: filters.ruleExecutionStatuses,
              ruleLastRunOutcomesFilter: filters.ruleLastRunOutcomes,
              ruleParamsFilter: filters.ruleParams,
              ruleStatusesFilter: filters.ruleStatuses,
              searchText: filters.searchText,
            }
          : {}
      );

      if (idsToExclude && idsToExclude.length) {
        const excludeFilter = fromKueryExpression(
          `NOT (${idsToExclude.map((id) => `alert.id: "alert:${id}"`).join(' or ')})`
        );
        if (ruleFilterKueryNode) {
          return nodeBuilder.and([ruleFilterKueryNode, excludeFilter]);
        }
        return excludeFilter;
      }

      return ruleFilterKueryNode;
    },
    [filters]
  );

  const getFilter = useCallback(() => {
    const { selectedIds, isAllSelected } = state;
    const idsArray = [...selectedIds];

    if (isAllSelected) {
      // Select all but nothing is selected to exclude
      if (idsArray.length === 0) {
        return getFilterKueryNode();
      }
      // Select all, exclude certain alerts
      return getFilterKueryNode(idsArray);
    }

    return getFilterKueryNode();
  }, [state, getFilterKueryNode]);

  return useMemo(() => {
    return {
      selectedIds: [...state.selectedIds],
      isAllSelected: state.isAllSelected,
      isPageSelected,
      numberOfSelectedItems,
      isRowSelected,
      getFilter,
      onSelectRow,
      onSelectAll,
      onSelectPage,
      onClearSelection,
    };
  }, [
    state,
    isPageSelected,
    numberOfSelectedItems,
    isRowSelected,
    getFilter,
    onSelectRow,
    onSelectAll,
    onSelectPage,
    onClearSelection,
  ]);
}
