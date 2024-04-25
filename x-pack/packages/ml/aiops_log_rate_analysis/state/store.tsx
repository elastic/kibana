/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC, type PropsWithChildren } from 'react';
import type { PayloadAction } from '@reduxjs/toolkit';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import useMount from 'react-use/lib/useMount';

import type { SignificantItem } from '@kbn/ml-agg-utils';
import { logRateAnalysisResultsSlice } from '../api/stream_reducer';
import type { WindowParameters } from '../window_parameters';

import type { GroupTableItem } from './types';

// Log Rate Analysis uses redux-toolkit to manage some of its state to avoid prop drilling.

type InitialAnalysisStart = number | WindowParameters | undefined;
type SignificantItemOrNull = SignificantItem | null;
type GroupOrNull = GroupTableItem | null;

function getDefaultState(): State {
  return {
    autoRunAnalysis: true,
    initialAnalysisStart: undefined,
    pinnedGroup: null,
    pinnedSignificantItem: null,
    selectedGroup: null,
    selectedSignificantItem: null,
    // Default to false for now, until page restructure work to enable smooth sticky histogram is done
    stickyHistogram: false,
  };
}

export interface State {
  autoRunAnalysis: boolean;
  initialAnalysisStart: InitialAnalysisStart;
  pinnedGroup: GroupOrNull;
  pinnedSignificantItem: SignificantItemOrNull;
  selectedGroup: GroupOrNull;
  selectedSignificantItem: SignificantItemOrNull;
  stickyHistogram: boolean;
}

const logRateAnalysisSlice = createSlice({
  name: 'logRateAnalysis',
  initialState: getDefaultState(),
  reducers: {
    clearAllRowState: (state: State) => {
      state.pinnedGroup = null;
      state.pinnedSignificantItem = null;
      state.selectedGroup = null;
      state.selectedSignificantItem = null;
    },
    setAutoRunAnalysis: (state: State, action: PayloadAction<boolean>) => {
      state.autoRunAnalysis = action.payload;
    },
    setInitialAnalysisStart: (state: State, action: PayloadAction<InitialAnalysisStart>) => {
      state.initialAnalysisStart = action.payload;
    },
    setPinnedGroup: (state: State, action: PayloadAction<GroupOrNull>) => {
      state.pinnedGroup = action.payload;
    },
    setPinnedSignificantItem: (state: State, action: PayloadAction<SignificantItemOrNull>) => {
      state.pinnedSignificantItem = action.payload;
    },
    setSelectedGroup: (state: State, action: PayloadAction<GroupOrNull>) => {
      state.selectedGroup = action.payload;
    },
    setSelectedSignificantItem: (state: State, action: PayloadAction<SignificantItemOrNull>) => {
      state.selectedSignificantItem = action.payload;
    },
    setStickyHistogram: (state: State, action: PayloadAction<boolean>) => {
      state.stickyHistogram = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  clearAllRowState,
  setAutoRunAnalysis,
  setInitialAnalysisStart,
  setPinnedGroup,
  setPinnedSignificantItem,
  setSelectedGroup,
  setSelectedSignificantItem,
  setStickyHistogram,
} = logRateAnalysisSlice.actions;

const getReduxStore = () =>
  configureStore({
    reducer: {
      logRateAnalysisResults: logRateAnalysisResultsSlice.reducer,
      logRateAnalysis: logRateAnalysisSlice.reducer,
    },
  });

interface LogRateAnalysisReduxProviderProps {
  initialAnalysisStart?: InitialAnalysisStart;
}

export const LogRateAnalysisReduxProvider: FC<
  PropsWithChildren<LogRateAnalysisReduxProviderProps>
> = ({ children, initialAnalysisStart }) => {
  const store = useMemo(getReduxStore, []);

  useMount(() => {
    if (initialAnalysisStart) {
      store.dispatch(logRateAnalysisSlice.actions.setInitialAnalysisStart(initialAnalysisStart));
    }
  });

  return <Provider store={store}>{children}</Provider>;
};

// Infer the `RootState` and `AppDispatch` types from the store itself
export type AppStore = ReturnType<typeof getReduxStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
