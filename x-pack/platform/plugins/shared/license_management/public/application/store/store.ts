/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createStore,
  applyMiddleware,
  compose,
  type CombinedState,
  type PreloadedState,
  type StoreEnhancer,
} from 'redux';
import thunk from 'redux-thunk';

import { licenseManagement } from './reducers';
import type { LicenseManagementState, ThunkServices } from './types';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => StoreEnhancer;
  }
}

export const licenseManagementStore = (
  initialState: PreloadedState<CombinedState<LicenseManagementState>>,
  services: ThunkServices
) => {
  const thunkEnhancer = applyMiddleware(thunk.withExtraArgument(services));
  const enhancer = window.__REDUX_DEVTOOLS_EXTENSION__
    ? compose(thunkEnhancer, window.__REDUX_DEVTOOLS_EXTENSION__())
    : thunkEnhancer;

  return createStore(licenseManagement, initialState, enhancer);
};

export type AppStore = ReturnType<typeof licenseManagementStore>;
