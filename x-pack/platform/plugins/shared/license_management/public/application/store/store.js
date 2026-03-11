/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';

import { licenseManagement } from './reducers';

/** @typedef {import('redux').AnyAction} AnyAction */
/** @typedef {import('redux').Store<any, AnyAction> & { dispatch: import('redux-thunk').ThunkDispatch<any, any, AnyAction> }} LicenseManagementStore */

/**
 * @param {object} [initialState={}]
 * @param {object} [services={}]
 * @returns {LicenseManagementStore}
 */
export const licenseManagementStore = (initialState = {}, services = {}) => {
  const enhancers = [applyMiddleware(thunk.withExtraArgument(services))];

  window.__REDUX_DEVTOOLS_EXTENSION__ && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());
  return createStore(licenseManagement, initialState, compose(...enhancers));
};
