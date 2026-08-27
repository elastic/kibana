/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMiddleware, compose, createStore } from 'redux-v4';
import type { Store, StoreEnhancer } from 'redux-v4';
import thunk from 'redux-thunk-v2';

import { ccr, type CcrState, type CcrAction } from './reducers';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => StoreEnhancer;
  }
}

export type CcrStore = Store<CcrState, CcrAction>;

export function createCrossClusterReplicationStore(): CcrStore {
  const middleware: StoreEnhancer = applyMiddleware(thunk);
  const devtools =
    typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__
      ? window.__REDUX_DEVTOOLS_EXTENSION__()
      : undefined;
  const enhancer: StoreEnhancer = devtools ? compose(middleware, devtools) : middleware;

  return createStore(ccr, undefined, enhancer);
}

// Singleton for production use
export const ccrStore = createCrossClusterReplicationStore();
