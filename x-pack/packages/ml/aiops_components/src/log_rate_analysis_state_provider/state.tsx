/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC, type PropsWithChildren } from 'react';
import type { PayloadAction } from '@reduxjs/toolkit';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { useDispatch, useSelector, Provider } from 'react-redux';
import { bindActionCreators } from 'redux';
import useMount from 'react-use/lib/useMount';

import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';

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
  name: 'editTransformFlyout',
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

const getReduxStore = () =>
  configureStore({
    reducer: logRateAnalysisSlice.reducer,
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

export const useLogRateAnalysisReduxActions = () => {
  const dispatch = useDispatch();
  return useMemo(() => bindActionCreators(logRateAnalysisSlice.actions, dispatch), [dispatch]);
};

export const useAutoRunAnalysis = () => useSelector((s: State) => s.autoRunAnalysis);
export const useInitialAnalysisStart = () => useSelector((s: State) => s.initialAnalysisStart);
export const usePinnedGroup = () => useSelector((s: State) => s.pinnedGroup);
export const useSelectedGroup = () => useSelector((s: State) => s.selectedGroup);
export const usePinnedSignificantItem = () => useSelector((s: State) => s.pinnedSignificantItem);
export const useSelectedSignificantItem = () =>
  useSelector((s: State) => s.selectedSignificantItem);
export const useStickyHistogram = () => useSelector((s: State) => s.stickyHistogram);
