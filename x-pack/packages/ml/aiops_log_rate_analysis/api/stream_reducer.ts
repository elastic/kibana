/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type {
  SignificantItem,
  SignificantItemGroup,
  SignificantItemHistogram,
  SignificantItemGroupHistogram,
} from '@kbn/ml-agg-utils';

import type { WindowParameters } from '../window_parameters';
import type { LogRateAnalysisType } from '../log_rate_analysis_type';

export interface StreamState {
  ccsWarning: boolean;
  currentAnalysisType?: LogRateAnalysisType;
  currentAnalysisWindowParameters?: WindowParameters;
  significantItems: SignificantItem[];
  significantItemsGroups: SignificantItemGroup[];
  errors: string[];
  loaded: number;
  loadingState: string;
  remainingFieldCandidates?: string[];
  groupsMissing?: boolean;
  zeroDocsFallback: boolean;
}

export const getDefaultState = (): StreamState => ({
  ccsWarning: false,
  significantItems: [],
  significantItemsGroups: [],
  errors: [],
  loaded: 0,
  loadingState: '',
  zeroDocsFallback: false,
});

export const logRateAnalysisResultsSlice = createSlice({
  name: 'logRateAnalysisResults',
  initialState: getDefaultState(),
  reducers: {
    addSignificantItems: (state, action: PayloadAction<SignificantItem[]>) => {
      state.significantItems.push(...action.payload);
    },
    addSignificantItemsHistogram: (state, action: PayloadAction<SignificantItemHistogram[]>) => {
      state.significantItems = state.significantItems.map((cp) => {
        const cpHistogram = action.payload.find(
          (h) => h.fieldName === cp.fieldName && h.fieldValue === cp.fieldValue
        );
        return {
          ...cp,
          ...(cpHistogram ? { histogram: cpHistogram.histogram } : {}),
        };
      });
    },
    addSignificantItemsGroup: (state, action: PayloadAction<SignificantItemGroup[]>) => {
      state.significantItemsGroups = action.payload;
    },
    addSignificantItemsGroupHistogram: (
      state,
      action: PayloadAction<SignificantItemGroupHistogram[]>
    ) => {
      state.significantItemsGroups = state.significantItemsGroups.map((cpg) => {
        const cpHistogram = action.payload.find((h) => h.id === cpg.id);
        if (cpHistogram) {
          cpg.histogram = cpHistogram.histogram;
        }
        return cpg;
      });
    },
    addError: (state, action: PayloadAction<string>) => {
      state.errors.push(action.payload);
    },
    ping: () => {},
    resetErrors: (state) => {
      state.errors = [];
    },
    resetGroups: (state) => {
      state.significantItemsGroups = [];
    },
    // Reset the results but keep the current analysis type and window parameters.
    resetResults: (state) => ({
      ...getDefaultState(),
      currentAnalysisType: state.currentAnalysisType,
      currentAnalysisWindowParameters: state.currentAnalysisWindowParameters,
    }),
    updateLoadingState: (
      state,
      action: PayloadAction<{
        ccsWarning: boolean;
        loaded: number;
        loadingState: string;
        remainingFieldCandidates?: string[];
        groupsMissing?: boolean;
      }>
    ) => {
      return { ...state, ...action.payload };
    },
    setZeroDocsFallback: (state, action: PayloadAction<boolean>) => {
      state.zeroDocsFallback = action.payload;
    },
    setCurrentAnalysisType: (state, action: PayloadAction<LogRateAnalysisType | undefined>) => {
      state.currentAnalysisType = action.payload;
    },
    setCurrentAnalysisWindowParameters: (
      state,
      action: PayloadAction<WindowParameters | undefined>
    ) => {
      state.currentAnalysisWindowParameters = action.payload;
    },
  },
});

export const streamReducer = logRateAnalysisResultsSlice.reducer;
export const streamReducerActions = logRateAnalysisResultsSlice.actions;

type StreamReducerActions = typeof streamReducerActions;
export type ApiActionName = keyof StreamReducerActions;
export type AiopsLogRateAnalysisApiAction = ReturnType<StreamReducerActions[ApiActionName]>;

export const {
  addError,
  addSignificantItems,
  addSignificantItemsGroup,
  addSignificantItemsGroupHistogram,
  addSignificantItemsHistogram,
  ping,
  resetResults,
  resetErrors,
  resetGroups,
  setCurrentAnalysisType,
  setCurrentAnalysisWindowParameters,
  setZeroDocsFallback,
  updateLoadingState,
} = logRateAnalysisResultsSlice.actions;
