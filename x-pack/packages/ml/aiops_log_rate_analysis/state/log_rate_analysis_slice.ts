/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { WindowParameters } from '../window_parameters';

import type { LogRateAnalysisType } from '../log_rate_analysis_type';
import { LOG_RATE_ANALYSIS_TYPE } from '../log_rate_analysis_type';

import type { DocumentStats } from '../types';

export type InitialAnalysisStart = number | WindowParameters | undefined;

/**
 * Payload for brushSelectionUpdate action
 */
export interface BrushSelectionUpdatePayload {
  /** The window parameters to update the analysis with */
  windowParameters: WindowParameters;
  /** Flag to force the update */
  force: boolean;

  analysisType: LogRateAnalysisType;
}

export interface LogRateAnalysisState {
  analysisType: LogRateAnalysisType;
  autoRunAnalysis: boolean;
  initialAnalysisStart: InitialAnalysisStart;
  isBrushCleared: boolean;
  stickyHistogram: boolean;
  chartWindowParameters?: WindowParameters;
  earliest?: number;
  latest?: number;
  intervalMs?: number;
  documentStats: DocumentStats;
}

function getDefaultState(): LogRateAnalysisState {
  return {
    analysisType: LOG_RATE_ANALYSIS_TYPE.SPIKE,
    autoRunAnalysis: true,
    initialAnalysisStart: undefined,
    isBrushCleared: true,
    documentStats: {
      sampleProbability: 1,
      totalCount: 0,
    },
    // Default to false for now, until page restructure work to enable smooth sticky histogram is done
    stickyHistogram: false,
  };
}

export const logRateAnalysisSlice = createSlice({
  name: 'logRateAnalysis',
  initialState: getDefaultState(),
  reducers: {
    brushSelectionUpdate: (
      state: LogRateAnalysisState,
      action: PayloadAction<BrushSelectionUpdatePayload>
    ) => {
      if (!state.isBrushCleared || action.payload.force) {
        state.chartWindowParameters = action.payload.windowParameters;
      }
      if (action.payload.force) {
        state.isBrushCleared = false;
      }
      state.analysisType = action.payload.analysisType;
    },
    clearSelection: (state: LogRateAnalysisState) => {
      state.chartWindowParameters = undefined;
      state.isBrushCleared = true;
      state.initialAnalysisStart = undefined;
    },
    setAnalysisType: (state: LogRateAnalysisState, action: PayloadAction<LogRateAnalysisType>) => {
      state.analysisType = action.payload;
    },
    setAutoRunAnalysis: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => {
      state.autoRunAnalysis = action.payload;
    },
    setDocumentCountChartData: (
      state: LogRateAnalysisState,
      action: PayloadAction<{
        earliest?: number;
        latest?: number;
        intervalMs?: number;
        documentStats: DocumentStats;
      }>
    ) => {
      state.earliest = action.payload.earliest;
      state.latest = action.payload.latest;
      state.intervalMs = action.payload.intervalMs;
      state.documentStats = action.payload.documentStats;
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
    setStickyHistogram: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => {
      state.stickyHistogram = action.payload;
    },
    setChartWindowParameters: (
      state: LogRateAnalysisState,
      action: PayloadAction<WindowParameters | undefined>
    ) => {
      state.chartWindowParameters = action.payload;
      state.isBrushCleared = action.payload === undefined;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  brushSelectionUpdate,
  clearSelection,
  setAnalysisType,
  setAutoRunAnalysis,
  setDocumentCountChartData,
  setInitialAnalysisStart,
  setIsBrushCleared,
  setStickyHistogram,
  setChartWindowParameters,
} = logRateAnalysisSlice.actions;
