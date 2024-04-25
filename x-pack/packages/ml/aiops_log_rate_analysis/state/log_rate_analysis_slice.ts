/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { WindowParameters } from '../window_parameters';

export type InitialAnalysisStart = number | WindowParameters | undefined;

interface LogRateAnalysisState {
  autoRunAnalysis: boolean;
  initialAnalysisStart: InitialAnalysisStart;
  stickyHistogram: boolean;
}

function getDefaultState(): LogRateAnalysisState {
  return {
    autoRunAnalysis: true,
    initialAnalysisStart: undefined,
    // Default to false for now, until page restructure work to enable smooth sticky histogram is done
    stickyHistogram: false,
  };
}

export const logRateAnalysisSlice = createSlice({
  name: 'logRateAnalysis',
  initialState: getDefaultState(),
  reducers: {
    setAutoRunAnalysis: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => {
      state.autoRunAnalysis = action.payload;
    },
    setInitialAnalysisStart: (
      state: LogRateAnalysisState,
      action: PayloadAction<InitialAnalysisStart>
    ) => {
      state.initialAnalysisStart = action.payload;
    },
    setStickyHistogram: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => {
      state.stickyHistogram = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setAutoRunAnalysis, setInitialAnalysisStart, setStickyHistogram } =
  logRateAnalysisSlice.actions;
