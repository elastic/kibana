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
import { logRateAnalysisTableRowSlice } from './log_rate_analysis_table_row_slice';
import type { InitialAnalysisStart } from './log_rate_analysis_slice';

const getReduxStore = () =>
  configureStore({
    reducer: {
      // General page state
      logRateAnalysis: logRateAnalysisSlice.reducer,
      // Analysis results
      logRateAnalysisResults: logRateAnalysisResultsSlice.reducer,
      // Handles running the analysis
      logRateAnalysisStream: streamSlice.reducer,
      // Handles hovering and pinning table rows
      logRateAnalysisTableRow: logRateAnalysisTableRowSlice.reducer,
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
