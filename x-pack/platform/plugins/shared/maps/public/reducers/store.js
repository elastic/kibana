/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers, applyMiddleware, createStore, compose } from 'redux';
import thunk from 'redux-thunk';
import { ui, DEFAULT_MAP_UI_STATE } from './ui';
import { map, DEFAULT_MAP_STATE } from './map'; // eslint-disable-line import/named
import { nonSerializableInstances } from './non_serializable_instances';

export const DEFAULT_MAP_STORE_STATE = {
  ui: { ...DEFAULT_MAP_UI_STATE },
  map: { ...DEFAULT_MAP_STATE },
  nonSerializableInstances: {},
};

export function createMapStore() {
  const enhancers = [applyMiddleware(thunk)];
  const combinedReducers = combineReducers({
    map,
    ui,
    nonSerializableInstances,
  });

  const storeConfig = {};
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  return createStore(combinedReducers, storeConfig, composeEnhancers(...enhancers));
}
