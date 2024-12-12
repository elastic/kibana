/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { i18n } from '@kbn/i18n';
import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';
import type { FetchFieldCandidatesResponse } from '../queries/fetch_field_candidates';

const ecsIdentifiedMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.fieldCandidates.ecsIdentifiedMessage',
  {
    defaultMessage: 'The source documents were identified as ECS compliant.',
  }
);

const fieldsDropdownHintMessage = i18n.translate(
  'xpack.aiops.logRateAnalysis.fieldCandidates.fieldsDropdownHintMessage',
  {
    defaultMessage: 'Use the "Fields" dropdown to adjust the selection.',
  }
);

const getFieldSelectionMessage = (
  isECS: boolean,
  allItemsCount: number,
  selectedItemsCount: number
): string | undefined => {
  if (allItemsCount <= selectedItemsCount || selectedItemsCount < 2) return;

  const ecsMessage = isECS ? `${ecsIdentifiedMessage} ` : '';

  const fieldsSelectedMessage = i18n.translate(
    'xpack.aiops.logRateAnalysis.fieldCandidates.fieldsSelectedMessage',
    {
      defaultMessage:
        '{selectedItemsCount} out of {allItemsCount} fields were preselected for the analysis.',
      values: { selectedItemsCount, allItemsCount },
    }
  );

  return `${ecsMessage}${fieldsSelectedMessage} ${fieldsDropdownHintMessage}`;
};

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
    const fieldCandidatesResp = await http.post<FetchFieldCandidatesResponse>(
      AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS_FIELD_CANDIDATES,
      {
        signal: abortCtrl.current.signal,
        version: '1',
        headers,
        ...(body && Object.keys(body).length > 0 ? { body: JSON.stringify(body) } : {}),
      }
    );
    const {
      isECS,
      keywordFieldCandidates,
      textFieldCandidates,
      selectedKeywordFieldCandidates,
      selectedTextFieldCandidates,
    } = fieldCandidatesResp;

    const fieldFilterUniqueItems = [...keywordFieldCandidates, ...textFieldCandidates].sort();
    const fieldFilterUniqueSelectedItems = [
      ...selectedKeywordFieldCandidates,
      ...selectedTextFieldCandidates,
    ];
    const initialFieldFilterSkippedItems = fieldFilterUniqueItems.filter(
      (d) => !fieldFilterUniqueSelectedItems.includes(d)
    );

    const currentFieldFilterSkippedItems = (
      thunkApi.getState() as { logRateAnalysisFieldCandidates: FieldCandidatesState }
    ).logRateAnalysisFieldCandidates.currentFieldFilterSkippedItems;

    thunkApi.dispatch(
      setAllFieldCandidates({
        fieldSelectionMessage: getFieldSelectionMessage(
          isECS,
          fieldFilterUniqueItems.length,
          fieldFilterUniqueSelectedItems.length
        ),
        fieldFilterUniqueItems,
        initialFieldFilterSkippedItems,
        // If the currentFieldFilterSkippedItems is null, we're on the first load,
        // only then we set the current skipped fields to the initial skipped fields.
        currentFieldFilterSkippedItems:
          currentFieldFilterSkippedItems === null
            ? initialFieldFilterSkippedItems
            : currentFieldFilterSkippedItems,
        keywordFieldCandidates,
        textFieldCandidates,
        selectedKeywordFieldCandidates,
        selectedTextFieldCandidates,
      })
    );
  }
);

export interface FieldCandidatesState {
  isLoading: boolean;
  fieldSelectionMessage?: string;
  fieldFilterUniqueItems: string[];
  initialFieldFilterSkippedItems: string[];
  currentFieldFilterSkippedItems: string[] | null;
  keywordFieldCandidates: string[];
  textFieldCandidates: string[];
  selectedKeywordFieldCandidates: string[];
  selectedTextFieldCandidates: string[];
}

export function getDefaultState(): FieldCandidatesState {
  return {
    isLoading: false,
    fieldFilterUniqueItems: [],
    initialFieldFilterSkippedItems: [],
    currentFieldFilterSkippedItems: null,
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
    setCurrentFieldFilterSkippedItems: (
      state: FieldCandidatesState,
      action: PayloadAction<string[]>
    ) => {
      return { ...state, currentFieldFilterSkippedItems: action.payload };
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
export const { setAllFieldCandidates, setCurrentFieldFilterSkippedItems } =
  logRateAnalysisFieldCandidatesSlice.actions;
