/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { batch } from 'react-redux';

import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
import { fetchStream } from '@kbn/ml-response-stream/client';

import type { WindowParameters } from '../window_parameters';

import type { LogRateAnalysisType } from '../log_rate_analysis_type';
import { LOG_RATE_ANALYSIS_TYPE } from '../log_rate_analysis_type';

export const start = createAsyncThunk(
  'readStream',
  async (
    options: {
      http: HttpSetup;
      endpoint: string;
      apiVersion?: string;
      body?: any;
      headers?: HttpFetchOptions['headers'];
    },
    { dispatch, getState, signal }
  ) => {
    const { http, endpoint, apiVersion, body, headers } = options;
    const state = getState() as LogRateAnalysisState;

    if (state.isRunning) {
      dispatch(addError('Instant restart while running not supported yet.'));
      return;
    }

    batch(() => {
      dispatch(resetErrors());
      dispatch(setIsRunning(true));
      dispatch(setIsCancelled(false));
    });

    for await (const [fetchStreamError, actions] of fetchStream(
      http,
      endpoint,
      apiVersion,
      { current: { signal } },
      body,
      true,
      headers
    )) {
      if (fetchStreamError !== null) {
        dispatch(addError(fetchStreamError));
      } else if (Array.isArray(actions) && actions.length > 0) {
        batch(() => {
          for (const action of actions) {
            dispatch(action);
          }
        });
      }
    }

    dispatch(setIsRunning(false));
  }
);

export type InitialAnalysisStart = number | WindowParameters | undefined;
export interface BrushSelectionUpdatePayload {
  windowParameters: WindowParameters;
  force: boolean;
  analysisType: LogRateAnalysisType;
}

interface LogRateAnalysisState {
  analysisType: LogRateAnalysisType;
  autoRunAnalysis: boolean;
  errors: string[];
  initialAnalysisStart: InitialAnalysisStart;
  isBrushCleared: boolean;
  isCancelled: boolean;
  isRunning: boolean;
  stickyHistogram: boolean;
  windowParameters?: WindowParameters;
}

function getDefaultState(): LogRateAnalysisState {
  return {
    analysisType: LOG_RATE_ANALYSIS_TYPE.SPIKE,
    autoRunAnalysis: true,
    errors: [],
    initialAnalysisStart: undefined,
    isBrushCleared: true,
    isCancelled: false,
    isRunning: false,
    // Default to false for now, until page restructure work to enable smooth sticky histogram is done
    stickyHistogram: false,
  };
}

export const logRateAnalysisSlice = createSlice({
  name: 'logRateAnalysis',
  initialState: getDefaultState(),
  reducers: {
    addError: (state: LogRateAnalysisState, action: PayloadAction<string>) => {
      state.errors.push(action.payload);
    },
    cancel: (state: LogRateAnalysisState) => {
      state.isCancelled = true;
      state.isRunning = false;
    },
    resetErrors: (state: LogRateAnalysisState) => {
      state.errors = [];
    },
    brushSelectionUpdate: (
      state: LogRateAnalysisState,
      action: PayloadAction<BrushSelectionUpdatePayload>
    ) => {
      if (!state.isBrushCleared || action.payload.force) {
        state.windowParameters = action.payload.windowParameters;
      }
      if (action.payload.force) {
        state.isBrushCleared = false;
      }
      state.analysisType = action.payload.analysisType;
    },
    clearSelection: (state: LogRateAnalysisState) => {
      state.windowParameters = undefined;
      state.isBrushCleared = true;
      state.initialAnalysisStart = undefined;
    },
    setAnalysisType: (state: LogRateAnalysisState, action: PayloadAction<LogRateAnalysisType>) => {
      state.analysisType = action.payload;
    },
    setAutoRunAnalysis: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => {
      state.autoRunAnalysis = action.payload;
    },
    setInitialAnalysisStart: (
      state: LogRateAnalysisState,
      action: PayloadAction<InitialAnalysisStart>
    ) => {
      state.initialAnalysisStart = action.payload;
    },
    setIsBrushCleared: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => {
      state.isBrushCleared = action.payload;
    },
    setIsCancelled: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => {
      state.isCancelled = action.payload;
    },
    setIsRunning: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload;
    },
    setStickyHistogram: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => {
      state.stickyHistogram = action.payload;
    },
    setWindowParameters: (
      state: LogRateAnalysisState,
      action: PayloadAction<WindowParameters | undefined>
    ) => {
      state.windowParameters = action.payload;
      state.isBrushCleared = action.payload === undefined;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  addError,
  cancel,
  resetErrors,
  brushSelectionUpdate,
  clearSelection,
  setAnalysisType,
  setAutoRunAnalysis,
  setInitialAnalysisStart,
  setIsBrushCleared,
  setIsCancelled,
  setIsRunning,
  setStickyHistogram,
  setWindowParameters,
} = logRateAnalysisSlice.actions;
