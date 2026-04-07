/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import type { Store } from 'redux';
import type { AppDependencies } from '../app_context';
import { defaultTableState } from './reducers/table_state';

import { getReducer } from './reducers';
import type { IndexManagementState } from './types';

type ReduxDevToolsExtension = () => ReturnType<typeof applyMiddleware>;

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevToolsExtension;
  }
}

export function indexManagementStore(
  services: AppDependencies['services']
): Store<IndexManagementState> {
  const toggleNameToVisibleMap: Record<string, boolean> = {};
  services.extensionsService.toggles.forEach((toggleExtension) => {
    toggleNameToVisibleMap[toggleExtension.name] = false;
  });
  const initialState = { tableState: { ...defaultTableState, toggleNameToVisibleMap } };
  const enhancers = [applyMiddleware(thunk)];

  if (window.__REDUX_DEVTOOLS_EXTENSION__) {
    enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());
  }
  return createStore(getReducer(), initialState, compose(...enhancers));
}
