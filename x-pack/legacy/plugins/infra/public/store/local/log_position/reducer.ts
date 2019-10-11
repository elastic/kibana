/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { TimeKey } from '../../../../common/time';
import {
  jumpToTargetPosition,
  reportVisiblePositions,
  startAutoReload,
  stopAutoReload,
  lockAutoReloadScroll,
  unlockAutoReloadScroll,
} from './actions';

import { loadEntriesActionCreators } from '../../remote/log_entries/operations/load';

interface ManualTargetPositionUpdatePolicy {
  policy: 'manual';
}

interface IntervalTargetPositionUpdatePolicy {
  policy: 'interval';
}

type TargetPositionUpdatePolicy =
  | ManualTargetPositionUpdatePolicy
  | IntervalTargetPositionUpdatePolicy;

export interface LogPositionState {
  targetPosition: TimeKey | null;
  updatePolicy: TargetPositionUpdatePolicy;
  visiblePositions: {
    startKey: TimeKey | null;
    middleKey: TimeKey | null;
    endKey: TimeKey | null;
  };
  controlsShouldDisplayTargetPosition: boolean;
  autoReloadJustAborted: boolean;
  autoReloadScrollLock: boolean;
}

export const initialLogPositionState: LogPositionState = {
  targetPosition: null,
  updatePolicy: {
    policy: 'manual',
  },
  visiblePositions: {
    endKey: null,
    middleKey: null,
    startKey: null,
  },
  controlsShouldDisplayTargetPosition: false,
  autoReloadJustAborted: false,
  autoReloadScrollLock: false,
};

const targetPositionReducer = reducerWithInitialState(initialLogPositionState.targetPosition).case(
  jumpToTargetPosition,
  (state, target) => target
);

const targetPositionUpdatePolicyReducer = reducerWithInitialState(
  initialLogPositionState.updatePolicy
)
  .case(startAutoReload, () => ({
    policy: 'interval',
  }))
  .case(stopAutoReload, () => ({
    policy: 'manual',
  }));

const visiblePositionReducer = reducerWithInitialState(
  initialLogPositionState.visiblePositions
).case(reportVisiblePositions, (state, { startKey, middleKey, endKey }) => ({
  endKey,
  middleKey,
  startKey,
}));

// Determines whether to use the target position or the visible midpoint when
// displaying a timestamp or time range in the toolbar and log minimap. When the
// user jumps to a new target, the final visible midpoint is indeterminate until
// all the new data has finished loading, so using this flag reduces the perception
// that the UI is jumping around inaccurately
const controlsShouldDisplayTargetPositionReducer = reducerWithInitialState(
  initialLogPositionState.controlsShouldDisplayTargetPosition
)
  .case(jumpToTargetPosition, () => true)
  .case(stopAutoReload, () => false)
  .case(startAutoReload, () => true)
  .case(reportVisiblePositions, (state, { fromScroll }) => {
    if (fromScroll) return false;
    return state;
  });

// If auto reload is aborted before a pending request finishes, this flag will
// prevent the UI from displaying the Loading Entries screen
const autoReloadJustAbortedReducer = reducerWithInitialState(
  initialLogPositionState.autoReloadJustAborted
)
  .case(stopAutoReload, () => true)
  .case(startAutoReload, () => false)
  .case(loadEntriesActionCreators.resolveDone, () => false)
  .case(loadEntriesActionCreators.resolveFailed, () => false)
  .case(loadEntriesActionCreators.resolve, () => false);

const autoReloadScrollLockReducer = reducerWithInitialState(
  initialLogPositionState.autoReloadScrollLock
)
  .case(startAutoReload, () => false)
  .case(stopAutoReload, () => false)
  .case(lockAutoReloadScroll, () => true)
  .case(unlockAutoReloadScroll, () => false);

export const logPositionReducer = combineReducers<LogPositionState>({
  targetPosition: targetPositionReducer,
  updatePolicy: targetPositionUpdatePolicyReducer,
  visiblePositions: visiblePositionReducer,
  controlsShouldDisplayTargetPosition: controlsShouldDisplayTargetPositionReducer,
  autoReloadJustAborted: autoReloadJustAbortedReducer,
  autoReloadScrollLock: autoReloadScrollLockReducer,
});
