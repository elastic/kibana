/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureStore } from '@reduxjs/toolkit';

import { licenseManagement } from './reducers';
import type { LicenseManagementState, ThunkServices } from './types';

export const licenseManagementStore = (
  initialState: Partial<LicenseManagementState>,
  services: ThunkServices
) => {
  return configureStore({
    reducer: licenseManagement,
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: services } }),
  });
};

export type AppStore = ReturnType<typeof licenseManagementStore>;
export type AppDispatch = AppStore['dispatch'];
