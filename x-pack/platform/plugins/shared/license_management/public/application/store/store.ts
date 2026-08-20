/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStore, applyMiddleware, compose } from 'redux-v4';
import type { Action as ReduxAction, StoreEnhancer } from 'redux-v4';
import thunk from 'redux-thunk-v2';

import { getLicenseManagementReducer } from './reducers';
import type { AppDispatch, AppStore, LicenseManagementState, ThunkServices } from './types';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => StoreEnhancer;
  }
}

export const licenseManagementStore = (
  initialState: Partial<LicenseManagementState>,
  services: ThunkServices
): AppStore => {
  const thunkEnhancer = applyMiddleware(
    thunk.withExtraArgument<ThunkServices, LicenseManagementState, ReduxAction>(services)
  );
  const enhancer: StoreEnhancer<{ dispatch: AppDispatch }> = window.__REDUX_DEVTOOLS_EXTENSION__
    ? compose(thunkEnhancer, window.__REDUX_DEVTOOLS_EXTENSION__())
    : thunkEnhancer;

  return createStore(getLicenseManagementReducer(initialState), undefined, enhancer);
};
