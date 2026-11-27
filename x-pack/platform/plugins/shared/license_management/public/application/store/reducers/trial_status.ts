/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { TrialStatusState } from '../types';

const initialState: TrialStatusState = {};

const trialStatusSlice = createSlice({
  name: 'trialStatus',
  initialState,
  reducers: {
    trialStatusLoaded: (_state, { payload }: PayloadAction<boolean>) => ({
      canStartTrial: payload,
    }),
  },
});

export const { trialStatusLoaded } = trialStatusSlice.actions;
export const trialStatus = trialStatusSlice.reducer;
