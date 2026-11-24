/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const getInitialState = (): string => '';

const uploadErrorMessageSlice = createSlice({
  name: 'uploadErrorMessage',
  initialState: getInitialState,
  reducers: {
    addUploadErrorMessage: (_state, { payload }: PayloadAction<string>) => payload,
  },
});

export const { addUploadErrorMessage } = uploadErrorMessageSlice.actions;
export const uploadErrorMessage = uploadErrorMessageSlice.reducer;
