/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreloadedState } from 'redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import { remoteClusters } from './reducers';
import { detailPanel } from './middleware';
import type { RemoteClustersState } from './types';

export function createRemoteClustersStore(initialState?: PreloadedState<RemoteClustersState>) {
  const enhancer = applyMiddleware(thunk, detailPanel);
  return createStore(remoteClusters, initialState, enhancer);
}

export const remoteClustersStore = createRemoteClustersStore();
