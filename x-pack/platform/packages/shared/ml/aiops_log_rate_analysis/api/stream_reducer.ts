/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice } from '@reduxjs/toolkit';

import type { SignificantItem, SignificantItemGroup } from '@kbn/ml-agg-utils';
import type { WindowParameters } from '../window_parameters';
import type { LogRateAnalysisType } from '../log_rate_analysis_type';

import {
  STREAM_SLICE_NAME,
  addError,
  addSignificantItems,
  addSignificantItemsGroup,
  addSignificantItemsGroupHistogram,
  addSignificantItemsHistogram,
  ping,
  resetErrors,
  resetGroups,
  resetResults,
  setCurrentAnalysisType,
  setCurrentAnalysisWindowParameters,
  setZeroDocsFallback,
  updateLoadingState,
} from './stream_actions';

export interface StreamState {
  ccsWarning: boolean;
  currentAnalysisType?: LogRateAnalysisType;
  currentAnalysisWindowParameters?: WindowParameters;
  significantItems: SignificantItem[];
  significantItemsGroups: SignificantItemGroup[];
  errors: string[];
  loaded: number;
  loadingState: string;
  remainingKeywordFieldCandidates?: string[];
  remainingTextFieldCandidates?: string[];
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
  name: STREAM_SLICE_NAME,
  initialState: getDefaultState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(addSignificantItems, (state, action) => {
        state.significantItems.push(...action.payload);
      })
      .addCase(addSignificantItemsHistogram, (state, action) => {
        state.significantItems = state.significantItems.map((cp) => {
          const cpHistogram = action.payload.find(
            (h) => h.fieldName === cp.fieldName && h.fieldValue === cp.fieldValue
          );
          return {
            ...cp,
            ...(cpHistogram ? { histogram: cpHistogram.histogram } : {}),
          };
        });
      })
      .addCase(addSignificantItemsGroup, (state, action) => {
        state.significantItemsGroups = action.payload;
      })
      .addCase(addSignificantItemsGroupHistogram, (state, action) => {
        state.significantItemsGroups = state.significantItemsGroups.map((cpg) => {
          const cpHistogram = action.payload.find((h) => h.id === cpg.id);
          if (cpHistogram) {
            cpg.histogram = cpHistogram.histogram;
          }
          return cpg;
        });
      })
      .addCase(addError, (state, action) => {
        state.errors.push(action.payload);
      })
      .addCase(ping, () => {})
      .addCase(resetErrors, (state) => {
        state.errors = [];
      })
      .addCase(resetGroups, (state) => {
        state.significantItemsGroups = [];
      })
      // Reset the results but keep the current analysis type and window parameters.
      .addCase(resetResults, (state) => ({
        ...getDefaultState(),
        currentAnalysisType: state.currentAnalysisType,
        currentAnalysisWindowParameters: state.currentAnalysisWindowParameters,
      }))
      .addCase(updateLoadingState, (state, action) => ({ ...state, ...action.payload }))
      .addCase(setZeroDocsFallback, (state, action) => {
        state.zeroDocsFallback = action.payload;
      })
      .addCase(setCurrentAnalysisType, (state, action) => {
        state.currentAnalysisType = action.payload;
      })
      .addCase(setCurrentAnalysisWindowParameters, (state, action) => {
        state.currentAnalysisWindowParameters = action.payload;
      });
  },
});

export const streamReducer = logRateAnalysisResultsSlice.reducer;

export {
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
  streamReducerActions,
  type ApiActionName,
  type AiopsLogRateAnalysisApiAction,
} from './stream_actions';
