/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions } from 'redux-actions';
import type { TableState } from '../types';
import {
  filterChanged,
  pageChanged,
  pageSizeChanged,
  sortChanged,
  toggleChanged,
} from '../actions';

type TableStatePayload =
  | { filter: TableState['filter'] }
  | { toggleName: string; toggleValue: boolean }
  | { sortField: string; isSortAscending: boolean }
  | { pageNumber: number }
  | { pageSize: number };

export const defaultTableState: TableState = {
  filter: '',
  pageSize: 10,
  currentPage: 0,
  sortField: 'index.name',
  isSortAscending: true,
  toggleNameToVisibleMap: {},
};

export const tableState = handleActions<TableState, TableStatePayload>(
  {
    [String(filterChanged)](state, action) {
      if (!('filter' in action.payload)) {
        return state;
      }
      const { filter } = action.payload;
      return {
        ...state,
        filter,
        currentPage: 0,
      };
    },
    [String(toggleChanged)](state, action) {
      if (!('toggleName' in action.payload)) {
        return state;
      }
      const { toggleName, toggleValue } = action.payload;
      const toggleNameToVisibleMap = { ...state.toggleNameToVisibleMap };
      toggleNameToVisibleMap[toggleName] = toggleValue;
      return {
        ...state,
        toggleNameToVisibleMap,
      };
    },
    [String(sortChanged)](state, action) {
      if (!('sortField' in action.payload)) {
        return state;
      }
      const { sortField, isSortAscending } = action.payload;

      return {
        ...state,
        sortField,
        isSortAscending,
      };
    },
    [String(pageChanged)](state, action) {
      if (!('pageNumber' in action.payload)) {
        return state;
      }
      const { pageNumber } = action.payload;
      return {
        ...state,
        currentPage: pageNumber,
      };
    },
    [String(pageSizeChanged)](state, action) {
      if (!('pageSize' in action.payload)) {
        return state;
      }
      const { pageSize } = action.payload;
      return {
        ...state,
        pageSize,
      };
    },
  },
  defaultTableState
);
