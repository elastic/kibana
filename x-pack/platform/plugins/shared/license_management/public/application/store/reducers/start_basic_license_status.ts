/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { StartBasicStatusState } from '../types';

const initialState: StartBasicStatusState = {};

const startBasicStatusSlice = createSlice({
  name: 'startBasicStatus',
  initialState,
  reducers: {
    startBasicLicenseStatus: (_state, { payload }: PayloadAction<StartBasicStatusState>) => payload,
    cancelStartBasicLicense: () => initialState,
  },
});

export const { startBasicLicenseStatus, cancelStartBasicLicense } = startBasicStatusSlice.actions;
export const startBasicStatus = startBasicStatusSlice.reducer;
