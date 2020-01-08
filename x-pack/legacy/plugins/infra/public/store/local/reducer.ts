/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { initialLogPositionState, logPositionReducer, LogPositionState } from './log_position';
import { initialWaffleFilterState, waffleFilterReducer, WaffleFilterState } from './waffle_filter';
import {
  initialWaffleOptionsState,
  waffleOptionsReducer,
  WaffleOptionsState,
} from './waffle_options';
import { initialWaffleTimeState, waffleTimeReducer, WaffleTimeState } from './waffle_time';

export interface LocalState {
  logPosition: LogPositionState;
  waffleFilter: WaffleFilterState;
  waffleTime: WaffleTimeState;
  waffleMetrics: WaffleOptionsState;
}

export const initialLocalState: LocalState = {
  logPosition: initialLogPositionState,
  waffleFilter: initialWaffleFilterState,
  waffleTime: initialWaffleTimeState,
  waffleMetrics: initialWaffleOptionsState,
};

export const localReducer = combineReducers<LocalState>({
  logPosition: logPositionReducer,
  waffleFilter: waffleFilterReducer,
  waffleTime: waffleTimeReducer,
  waffleMetrics: waffleOptionsReducer,
});
