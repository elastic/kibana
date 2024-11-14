/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureStore } from '@reduxjs/toolkit';
import {
  logRateAnalysisTableSlice,
  localStorageListenerMiddleware,
  setSkippedColumns,
  getPreloadedState,
  AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS,
  type LogRateAnalysisResultsTableColumnName,
} from './log_rate_analysis_table_slice';

describe('getPreloadedState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default state when localStorage is empty', () => {
    const state = getPreloadedState();
    expect(state).toEqual({
      skippedColumns: ['p-value', 'Baseline rate', 'Deviation rate'],
      pinnedGroup: null,
      pinnedSignificantItem: null,
      selectedGroup: null,
      selectedSignificantItem: null,
    });
  });

  it('should return state with skippedColumns from localStorage', () => {
    const skippedColumns = ['Log rate', 'Doc count'];
    localStorage.setItem(AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS, JSON.stringify(skippedColumns));

    const state = getPreloadedState();
    expect(state.skippedColumns).toEqual(skippedColumns);
  });

  it('should return default state when localStorage contains invalid JSON', () => {
    localStorage.setItem(AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS, 'invalid-json');

    const state = getPreloadedState();
    expect(state).toEqual({
      skippedColumns: ['p-value', 'Baseline rate', 'Deviation rate'],
      pinnedGroup: null,
      pinnedSignificantItem: null,
      selectedGroup: null,
      selectedSignificantItem: null,
    });
  });

  it('should return default state when localStorage does not contain skippedColumns', () => {
    localStorage.setItem('someOtherKey', JSON.stringify(['someValue']));

    const state = getPreloadedState();
    expect(state).toEqual({
      skippedColumns: ['p-value', 'Baseline rate', 'Deviation rate'],
      pinnedGroup: null,
      pinnedSignificantItem: null,
      selectedGroup: null,
      selectedSignificantItem: null,
    });
  });
});

type Store = ReturnType<typeof configureStore>;

describe('localStorageListenerMiddleware', () => {
  let store: Store;

  beforeEach(() => {
    localStorage.clear();
    store = configureStore({
      reducer: {
        logRateAnalysisTable: logRateAnalysisTableSlice.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(localStorageListenerMiddleware.middleware),
    }) as Store;
  });

  it('should save skippedColumns to localStorage when setSkippedColumns is dispatched', () => {
    const skippedColumns: LogRateAnalysisResultsTableColumnName[] = ['Log rate', 'Doc count'];
    store.dispatch(setSkippedColumns(skippedColumns));

    const storedSkippedColumns = localStorage.getItem(AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS);
    expect(storedSkippedColumns).toEqual(JSON.stringify(skippedColumns));
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorage.setItem(AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS, 'invalid-json');
    const skippedColumns: LogRateAnalysisResultsTableColumnName[] = ['Log rate', 'Doc count'];
    store.dispatch(setSkippedColumns(skippedColumns));

    const storedSkippedColumns = localStorage.getItem(AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS);
    expect(storedSkippedColumns).toEqual(JSON.stringify(skippedColumns));
  });

  it('should not overwrite other localStorage keys', () => {
    const otherKey = 'someOtherKey';
    const otherValue = ['someValue'];
    localStorage.setItem(otherKey, JSON.stringify(otherValue));

    const skippedColumns: LogRateAnalysisResultsTableColumnName[] = ['Log rate', 'Doc count'];
    store.dispatch(setSkippedColumns(skippedColumns));

    const storedOtherValue = localStorage.getItem(otherKey);
    expect(storedOtherValue).toEqual(JSON.stringify(otherValue));
  });

  it('should update localStorage when skippedColumns are updated multiple times', () => {
    const initialSkippedColumns: LogRateAnalysisResultsTableColumnName[] = ['Log rate'];
    store.dispatch(setSkippedColumns(initialSkippedColumns));

    let storedSkippedColumns = localStorage.getItem(AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS);
    expect(storedSkippedColumns).toEqual(JSON.stringify(initialSkippedColumns));

    const updatedSkippedColumns: LogRateAnalysisResultsTableColumnName[] = [
      'Log rate',
      'Doc count',
    ];
    store.dispatch(setSkippedColumns(updatedSkippedColumns));

    storedSkippedColumns = localStorage.getItem(AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS);
    expect(storedSkippedColumns).toEqual(JSON.stringify(updatedSkippedColumns));
  });
});
