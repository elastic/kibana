/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';

export interface FetchFieldCandidatesParams {
  http: HttpSetup;
  endpoint: string;
  apiVersion?: string;
  abortCtrl: React.MutableRefObject<AbortController>;
  body?: AiopsLogRateAnalysisSchema;
  headers?: HttpFetchOptions['headers'];
}

/**
 * Async thunk to fetch field candidates.
 */
export const fetchFieldCandidates = createAsyncThunk(
  'log_rate_analysis_field_candidates/fetch_field_candidates',
  async (options: FetchFieldCandidatesParams, thunkApi) => {
    const { http, abortCtrl, body, headers } = options;

    // Get field candidates so we're able to populate the field selection dropdown.
    const fieldCandidates = await http.post<FetchFieldCandidatesResponse>(
      AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS_FIELD_CANDIDATES,
      {
        signal: abortCtrl.current.signal,
        version: '1',
        headers,
        ...(body && Object.keys(body).length > 0 ? { body: JSON.stringify(body) } : {}),
      }
    );
    const {
      keywordFieldCandidates,
      textFieldCandidates,
      selectedKeywordFieldCandidates,
      selectedTextFieldCandidates,
    } = fieldCandidates;

    const fieldFilterUniqueItems = [...keywordFieldCandidates, ...textFieldCandidates].sort();
    const fieldFilterUniqueSelectedItems = [
      ...selectedKeywordFieldCandidates,
      ...selectedTextFieldCandidates,
    ];
    const fieldFilterSkippedItems = fieldFilterUniqueItems.filter(
      (d) => !fieldFilterUniqueSelectedItems.includes(d)
    );

    thunkApi.dispatch(
      setAllFieldCandidates({
        fieldFilterUniqueItems,
        fieldFilterSkippedItems,
        keywordFieldCandidates,
        textFieldCandidates,
        selectedKeywordFieldCandidates,
        selectedTextFieldCandidates,
      })
    );
  }
);

export interface FetchFieldCandidatesResponse {
  keywordFieldCandidates: string[];
  selectedKeywordFieldCandidates: string[];
  textFieldCandidates: string[];
  selectedTextFieldCandidates: string[];
}

export interface FieldCandidatesState {
  isLoading: boolean;
  fieldFilterUniqueItems: string[];
  fieldFilterSkippedItems: string[];
  keywordFieldCandidates: string[];
  textFieldCandidates: string[];
  selectedKeywordFieldCandidates: string[];
  selectedTextFieldCandidates: string[];
}

function getDefaultState(): FieldCandidatesState {
  return {
    isLoading: false,
    fieldFilterUniqueItems: [],
    fieldFilterSkippedItems: [],
    keywordFieldCandidates: [],
    textFieldCandidates: [],
    selectedKeywordFieldCandidates: [],
    selectedTextFieldCandidates: [],
  };
}

export const logRateAnalysisFieldCandidatesSlice = createSlice({
  name: 'log_rate_analysis_field_candidates',
  initialState: getDefaultState(),
  reducers: {
    setAllFieldCandidates: (
      state: FieldCandidatesState,
      action: PayloadAction<Omit<FieldCandidatesState, 'isLoading'>>
    ) => {
      return { ...state, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchFieldCandidates.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchFieldCandidates.fulfilled, (state) => {
      state.isLoading = false;
    });
  },
});

// Action creators are generated for each case reducer function
export const { setAllFieldCandidates } = logRateAnalysisFieldCandidatesSlice.actions;
