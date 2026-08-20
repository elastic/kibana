/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStore, applyMiddleware } from 'redux-v4';
import type { Store } from 'redux-v4';
import thunk from 'redux-thunk-v2';

import { remoteClusters } from './reducers';
import { detailPanel } from './middleware';
import type { RemoteClustersAction, RemoteClustersState } from './types';

export function createRemoteClustersStore(): Store<RemoteClustersState, RemoteClustersAction> {
  const enhancer = applyMiddleware(thunk, detailPanel);
  return createStore(remoteClusters, undefined, enhancer);
}

export const remoteClustersStore = createRemoteClustersStore();
