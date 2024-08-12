/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { SignificantItem } from '@kbn/ml-agg-utils';

import type { GroupTableItem } from './types';

type SignificantItemOrNull = SignificantItem | null;
type GroupOrNull = GroupTableItem | null;

export interface LogRateAnalysisTableRowState {
  pinnedGroup: GroupOrNull;
  pinnedSignificantItem: SignificantItemOrNull;
  selectedGroup: GroupOrNull;
  selectedSignificantItem: SignificantItemOrNull;
}

function getDefaultState(): LogRateAnalysisTableRowState {
  return {
    pinnedGroup: null,
    pinnedSignificantItem: null,
    selectedGroup: null,
    selectedSignificantItem: null,
  };
}

export const logRateAnalysisTableRowSlice = createSlice({
  name: 'logRateAnalysisTableRow',
  initialState: getDefaultState(),
  reducers: {
    clearAllRowState: (state: LogRateAnalysisTableRowState) => {
      state.pinnedGroup = null;
      state.pinnedSignificantItem = null;
      state.selectedGroup = null;
      state.selectedSignificantItem = null;
    },
    setPinnedGroup: (state: LogRateAnalysisTableRowState, action: PayloadAction<GroupOrNull>) => {
      state.pinnedGroup = action.payload;
    },
    setPinnedSignificantItem: (
      state: LogRateAnalysisTableRowState,
      action: PayloadAction<SignificantItemOrNull>
    ) => {
      state.pinnedSignificantItem = action.payload;
    },
    setSelectedGroup: (state: LogRateAnalysisTableRowState, action: PayloadAction<GroupOrNull>) => {
      state.selectedGroup = action.payload;
    },
    setSelectedSignificantItem: (
      state: LogRateAnalysisTableRowState,
      action: PayloadAction<SignificantItemOrNull>
    ) => {
      state.selectedSignificantItem = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  clearAllRowState,
  setPinnedGroup,
  setPinnedSignificantItem,
  setSelectedGroup,
  setSelectedSignificantItem,
} = logRateAnalysisTableRowSlice.actions;
