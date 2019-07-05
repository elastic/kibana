/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import reduceReducers from 'reduce-reducers';
import { Reducer } from 'redux';

import { loadEntriesReducer } from './operations/load';
import { loadMoreEntriesReducer } from './operations/load_more';
import { LogEntriesState } from './state';

export const logEntriesReducer = reduceReducers(
  loadEntriesReducer,
  loadMoreEntriesReducer
) as Reducer<LogEntriesState>;
