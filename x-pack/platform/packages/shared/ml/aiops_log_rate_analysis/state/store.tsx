/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC, type PropsWithChildren } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import useMount from 'react-use/lib/useMount';

import { streamSlice } from '@kbn/ml-response-stream/client';

import { logRateAnalysisResultsSlice } from '../api/stream_reducer';

import { logRateAnalysisSlice } from './log_rate_analysis_slice';
import {
  logRateAnalysisTableSlice,
  getPreloadedState,
  localStorageListenerMiddleware,
} from './log_rate_analysis_table_slice';
import { logRateAnalysisFieldCandidatesSlice } from './log_rate_analysis_field_candidates_slice';
import type { InitialAnalysisStart } from './log_rate_analysis_slice';

const getReduxStore = () =>
  configureStore({
    preloadedState: {
      logRateAnalysisTable: getPreloadedState(),
    },
    reducer: {
      // General page state
      logRateAnalysis: logRateAnalysisSlice.reducer,
      // Field candidates
      logRateAnalysisFieldCandidates: logRateAnalysisFieldCandidatesSlice.reducer,
      // Analysis results
      logRateAnalysisResults: logRateAnalysisResultsSlice.reducer,
      // Handles running the analysis, needs to be "stream" for the async thunk to work properly.
      stream: streamSlice.reducer,
      // Handles hovering and pinning table rows and column selection
      logRateAnalysisTable: logRateAnalysisTableSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(localStorageListenerMiddleware.middleware),
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
type AppStore = ReturnType<typeof getReduxStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
