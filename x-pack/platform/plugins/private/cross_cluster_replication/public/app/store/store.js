/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMiddleware, compose, createStore } from 'redux';
import thunk from 'redux-thunk';

import { ccr } from './reducers';

export function createCrossClusterReplicationStore(initialState = {}) {
  const enhancers = [applyMiddleware(thunk)];

  if (window.__REDUX_DEVTOOLS_EXTENSION__) {
    enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());
  }
  return createStore(ccr, initialState, compose(...enhancers));
}

// Singleton for production use
export const ccrStore = createCrossClusterReplicationStore();
