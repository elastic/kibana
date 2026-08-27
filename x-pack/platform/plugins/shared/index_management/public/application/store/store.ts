/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStore, applyMiddleware, compose } from 'redux-v4';
import type { Store, StoreEnhancer } from 'redux-v4';
import thunk from 'redux-thunk-v2';
import type { AppDependencies } from '../app_context';
import { defaultTableState } from './reducers/table_state';

import { getReducer, type IndexManagementAction } from './reducers';
import type { IndexManagementState } from './types';

type ReduxDevToolsExtension = () => StoreEnhancer;

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevToolsExtension;
  }
}

export function indexManagementStore(
  services: AppDependencies['services']
): Store<IndexManagementState, IndexManagementAction> {
  const toggleNameToVisibleMap: Record<string, boolean> = {};
  services.extensionsService.toggles.forEach((toggleExtension) => {
    toggleNameToVisibleMap[toggleExtension.name] = false;
  });
  const initialTableState = { ...defaultTableState, toggleNameToVisibleMap };
  const middleware: StoreEnhancer = applyMiddleware(thunk.withExtraArgument(services));
  const devtools = window.__REDUX_DEVTOOLS_EXTENSION__
    ? window.__REDUX_DEVTOOLS_EXTENSION__()
    : undefined;
  const enhancer: StoreEnhancer = devtools ? compose(middleware, devtools) : middleware;

  return createStore(getReducer(initialTableState), undefined, enhancer);
}
