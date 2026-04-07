/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  filterChanged,
  pageChanged,
  pageSizeChanged,
  sortChanged,
  toggleChanged,
} from '../actions';
import { defaultTableState, tableState } from './table_state';

describe('table_state reducer', () => {
  test('returns the default state', () => {
    expect(tableState(undefined, { type: '@@INIT', payload: { filter: '' } })).toEqual(
      defaultTableState
    );
  });

  test('updates filter and resets currentPage', () => {
    const state = {
      ...defaultTableState,
      currentPage: 3,
    };

    expect(tableState(state, filterChanged({ filter: 'abc' }))).toEqual({
      ...state,
      filter: 'abc',
      currentPage: 0,
    });
  });

  test('updates toggle visibility', () => {
    const state = {
      ...defaultTableState,
      currentPage: 2,
      toggleNameToVisibleMap: { closed: false },
    };

    expect(tableState(state, toggleChanged({ toggleName: 'closed', toggleValue: true }))).toEqual({
      ...state,
      toggleNameToVisibleMap: { closed: true },
    });
  });

  test('updates sorting', () => {
    const state = {
      ...defaultTableState,
      currentPage: 1,
    };

    expect(tableState(state, sortChanged({ sortField: 'name', isSortAscending: false }))).toEqual({
      ...state,
      sortField: 'name',
      isSortAscending: false,
    });
  });

  test('updates current page', () => {
    const state = {
      ...defaultTableState,
      currentPage: 0,
    };

    expect(tableState(state, pageChanged({ pageNumber: 4 }))).toEqual({
      ...state,
      currentPage: 4,
    });
  });

  test('updates page size', () => {
    const state = {
      ...defaultTableState,
      currentPage: 5,
      pageSize: 10,
    };

    expect(tableState(state, pageSizeChanged({ pageSize: 50 }))).toEqual({
      ...state,
      pageSize: 50,
    });
  });
});
