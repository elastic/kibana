/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createListenerMiddleware } from '@reduxjs/toolkit';

import { i18n } from '@kbn/i18n';
import type { SignificantItem } from '@kbn/ml-agg-utils';

import type { GroupTableItem } from './types';

export const AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS = 'aiops.logRateAnalysisResultColumns';

export const commonColumns = {
  ['Log rate']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.logRateColumnTitle', {
    defaultMessage: 'Log rate',
  }),
  ['Doc count']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.docCountColumnTitle', {
    defaultMessage: 'Doc count',
  }),
  ['p-value']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.pValueColumnTitle', {
    defaultMessage: 'p-value',
  }),
  ['Impact']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.impactColumnTitle', {
    defaultMessage: 'Impact',
  }),
  ['Baseline rate']: i18n.translate(
    'xpack.aiops.logRateAnalysis.resultsTable.baselineRateColumnTitle',
    {
      defaultMessage: 'Baseline rate',
    }
  ),
  ['Deviation rate']: i18n.translate(
    'xpack.aiops.logRateAnalysis.resultsTable.deviationRateColumnTitle',
    {
      defaultMessage: 'Deviation rate',
    }
  ),
  ['Log rate change']: i18n.translate(
    'xpack.aiops.logRateAnalysis.resultsTable.logRateChangeColumnTitle',
    {
      defaultMessage: 'Log rate change',
    }
  ),
  ['Actions']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.actionsColumnTitle', {
    defaultMessage: 'Actions',
  }),
};

export const significantItemColumns = {
  ['Field name']: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldNameColumnTitle', {
    defaultMessage: 'Field name',
  }),
  ['Field value']: i18n.translate(
    'xpack.aiops.logRateAnalysis.resultsTable.fieldValueColumnTitle',
    {
      defaultMessage: 'Field value',
    }
  ),
  ...commonColumns,
} as const;

export type LogRateAnalysisResultsTableColumnName = keyof typeof significantItemColumns | 'unique';

type SignificantItemOrNull = SignificantItem | null;
type GroupOrNull = GroupTableItem | null;

export interface LogRateAnalysisTableState {
  skippedColumns: LogRateAnalysisResultsTableColumnName[];
  pinnedGroup: GroupOrNull;
  pinnedSignificantItem: SignificantItemOrNull;
  selectedGroup: GroupOrNull;
  selectedSignificantItem: SignificantItemOrNull;
}

function getDefaultState(): LogRateAnalysisTableState {
  return {
    skippedColumns: ['p-value', 'Baseline rate', 'Deviation rate'],
    pinnedGroup: null,
    pinnedSignificantItem: null,
    selectedGroup: null,
    selectedSignificantItem: null,
  };
}

export function getPreloadedState(): LogRateAnalysisTableState {
  const defaultState = getDefaultState();

  const localStorageSkippedColumns = localStorage.getItem(AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS);

  if (localStorageSkippedColumns === null) {
    return defaultState;
  }

  try {
    defaultState.skippedColumns = JSON.parse(localStorageSkippedColumns);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to parse skipped columns from local storage:', err);
  }

  return defaultState;
}

export const logRateAnalysisTableSlice = createSlice({
  name: 'logRateAnalysisTable',
  initialState: getDefaultState(),
  reducers: {
    clearAllRowState: (state: LogRateAnalysisTableState) => {
      state.pinnedGroup = null;
      state.pinnedSignificantItem = null;
      state.selectedGroup = null;
      state.selectedSignificantItem = null;
    },
    setPinnedGroup: (state: LogRateAnalysisTableState, action: PayloadAction<GroupOrNull>) => {
      state.pinnedGroup = action.payload;
    },
    setPinnedSignificantItem: (
      state: LogRateAnalysisTableState,
      action: PayloadAction<SignificantItemOrNull>
    ) => {
      state.pinnedSignificantItem = action.payload;
    },
    setSelectedGroup: (state: LogRateAnalysisTableState, action: PayloadAction<GroupOrNull>) => {
      state.selectedGroup = action.payload;
    },
    setSelectedSignificantItem: (
      state: LogRateAnalysisTableState,
      action: PayloadAction<SignificantItemOrNull>
    ) => {
      state.selectedSignificantItem = action.payload;
    },
    setSkippedColumns: (
      state: LogRateAnalysisTableState,
      action: PayloadAction<LogRateAnalysisResultsTableColumnName[]>
    ) => {
      state.skippedColumns = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  clearAllRowState,
  setPinnedGroup,
  setPinnedSignificantItem,
  setSelectedGroup,
  setSelectedSignificantItem,
  setSkippedColumns,
} = logRateAnalysisTableSlice.actions;

// Create listener middleware
export const localStorageListenerMiddleware = createListenerMiddleware();

// Add a listener to save skippedColumns to localStorage whenever it changes
localStorageListenerMiddleware.startListening({
  actionCreator: setSkippedColumns,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState() as { logRateAnalysisTable: LogRateAnalysisTableState };
    try {
      const serializedState = JSON.stringify(state.logRateAnalysisTable.skippedColumns);
      localStorage.setItem(AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS, serializedState);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save state to localStorage:', err);
    }
  },
});
