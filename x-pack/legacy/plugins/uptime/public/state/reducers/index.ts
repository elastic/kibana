/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { uiReducer } from './ui';
import { monitorReducer } from './monitor';

export const rootReducer = combineReducers({
  ui: uiReducer,
  monitor: monitorReducer,
});
