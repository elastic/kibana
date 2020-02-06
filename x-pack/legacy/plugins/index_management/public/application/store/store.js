/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { indexManagementExtensions } from '../../services/index_management_extensions';
import { defaultTableState } from './reducers/table_state';

import { getReducer } from './reducers/';

export function indexManagementStore({ uiMetricService }) {
  const toggleNameToVisibleMap = {};
  indexManagementExtensions.toggles.forEach(toggleExtension => {
    toggleNameToVisibleMap[toggleExtension.name] = false;
  });
  const initialState = { tableState: { ...defaultTableState, toggleNameToVisibleMap } };
  const enhancers = [applyMiddleware(thunk)];

  window.__REDUX_DEVTOOLS_EXTENSION__ && enhancers.push(window.__REDUX_DEVTOOLS_EXTENSION__());
  return createStore(getReducer({ uiMetricService }), initialState, compose(...enhancers));
}
