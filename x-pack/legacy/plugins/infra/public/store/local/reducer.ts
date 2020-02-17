/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { initialWaffleFilterState, waffleFilterReducer, WaffleFilterState } from './waffle_filter';
import {
  initialWaffleOptionsState,
  waffleOptionsReducer,
  WaffleOptionsState,
} from './waffle_options';
import { initialWaffleTimeState, waffleTimeReducer, WaffleTimeState } from './waffle_time';

export interface LocalState {
  waffleFilter: WaffleFilterState;
  waffleTime: WaffleTimeState;
  waffleMetrics: WaffleOptionsState;
}

export const initialLocalState: LocalState = {
  waffleFilter: initialWaffleFilterState,
  waffleTime: initialWaffleTimeState,
  waffleMetrics: initialWaffleOptionsState,
};

export const localReducer = combineReducers<LocalState>({
  waffleFilter: waffleFilterReducer,
  waffleTime: waffleTimeReducer,
  waffleMetrics: waffleOptionsReducer,
});
