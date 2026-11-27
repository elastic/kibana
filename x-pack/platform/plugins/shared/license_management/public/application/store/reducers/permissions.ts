/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { PermissionsError, PermissionsState } from '../types';

const initialState: PermissionsState = {};

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    permissionsLoading: (_state, { payload }: PayloadAction<boolean>) => ({
      loading: payload,
    }),
    permissionsSuccess: (_state, { payload }: PayloadAction<boolean>) => ({
      hasPermission: payload,
    }),
    permissionsError: (_state, { payload }: PayloadAction<PermissionsError>) => ({
      error: payload,
    }),
  },
});

export const { permissionsLoading, permissionsSuccess, permissionsError } =
  permissionsSlice.actions;
export const permissions = permissionsSlice.reducer;
