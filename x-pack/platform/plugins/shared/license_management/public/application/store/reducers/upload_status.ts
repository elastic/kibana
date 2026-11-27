/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { UploadStatusState } from '../types';

const initialState: UploadStatusState = {};

const uploadStatusSlice = createSlice({
  name: 'uploadStatus',
  initialState,
  reducers: {
    uploadLicenseStatus: (_state, { payload }: PayloadAction<UploadStatusState>) => payload,
  },
});

export const { uploadLicenseStatus } = uploadStatusSlice.actions;
export const uploadStatus = uploadStatusSlice.reducer;
