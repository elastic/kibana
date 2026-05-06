/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Store, StoreEnhancer } from 'redux';
import { applyMiddleware, compose, createStore } from 'redux';
import thunk from 'redux-thunk';

import { ccr, type CcrState } from './reducers';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => StoreEnhancer;
  }
}

export function createCrossClusterReplicationStore(
  initialState: Partial<CcrState> = {}
): Store<CcrState> {
  const middleware = applyMiddleware(thunk);
  const devtools =
    typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__
      ? window.__REDUX_DEVTOOLS_EXTENSION__()
      : undefined;
  const enhancer = devtools ? compose(middleware, devtools) : middleware;

  return createStore(ccr, initialState, enhancer);
}

// Singleton for production use
export const ccrStore = createCrossClusterReplicationStore();
