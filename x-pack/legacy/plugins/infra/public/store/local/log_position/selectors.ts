/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { LogPositionState } from './reducer';

export const selectTargetPosition = (state: LogPositionState) => state.targetPosition;

export const selectIsAutoReloading = (state: LogPositionState) =>
  state.updatePolicy.policy === 'interval';

export const selectAutoReloadScrollLock = (state: LogPositionState) => state.autoReloadScrollLock;

export const selectFirstVisiblePosition = (state: LogPositionState) =>
  state.visiblePositions.startKey ? state.visiblePositions.startKey : null;

export const selectMiddleVisiblePosition = (state: LogPositionState) =>
  state.visiblePositions.middleKey ? state.visiblePositions.middleKey : null;

export const selectLastVisiblePosition = (state: LogPositionState) =>
  state.visiblePositions.endKey ? state.visiblePositions.endKey : null;

export const selectPagesBeforeAndAfter = (state: LogPositionState) =>
  state.visiblePositions
    ? {
        pagesBeforeStart: state.visiblePositions.pagesBeforeStart,
        pagesAfterEnd: state.visiblePositions.pagesAfterEnd,
      }
    : { pagesBeforeStart: null, pagesAfterEnd: null };
export const selectControlsShouldDisplayTargetPosition = (state: LogPositionState) =>
  state.controlsShouldDisplayTargetPosition;

export const selectVisibleMidpointOrTarget = createSelector(
  selectMiddleVisiblePosition,
  selectTargetPosition,
  selectControlsShouldDisplayTargetPosition,
  (middleVisiblePosition, targetPosition, displayTargetPosition) => {
    if (displayTargetPosition) {
      return targetPosition;
    } else if (middleVisiblePosition) {
      return middleVisiblePosition;
    } else if (targetPosition) {
      return targetPosition;
    } else {
      return null;
    }
  }
);

export const selectVisibleMidpointOrTargetTime = createSelector(
  selectVisibleMidpointOrTarget,
  visibleMidpointOrTarget => (visibleMidpointOrTarget ? visibleMidpointOrTarget.time : null)
);

export const selectVisibleTimeInterval = createSelector(
  selectFirstVisiblePosition,
  selectLastVisiblePosition,
  (firstVisiblePosition, lastVisiblePosition) =>
    firstVisiblePosition && lastVisiblePosition
      ? {
          start: firstVisiblePosition.time,
          end: lastVisiblePosition.time,
        }
      : null
);
