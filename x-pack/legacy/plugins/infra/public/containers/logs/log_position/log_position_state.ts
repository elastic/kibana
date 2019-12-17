/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useMemo } from 'react';
import createContainer from 'constate';
import { TimeKey } from '../../../../common/time';

type TimeKeyOrNull = TimeKey | null;

interface VisiblePositions {
  startKey: TimeKeyOrNull;
  middleKey: TimeKeyOrNull;
  endKey: TimeKeyOrNull;
  pagesAfterEnd: number;
  pagesBeforeStart: number;
}

export interface LogPositionStateParams {
  targetPosition: TimeKeyOrNull;
  isAutoReloading: boolean;
  firstVisiblePosition: TimeKeyOrNull;
  pagesBeforeStart: number;
  pagesAfterEnd: number;
  visibleMidpoint: TimeKeyOrNull;
  visibleMidpointTime: number | null;
  visibleTimeInterval: { start: number; end: number } | null;
}

export interface LogPositionCallbacks {
  jumpToTargetPosition: (pos: TimeKeyOrNull) => void;
  jumpToTargetPositionTime: (time: number, fromAutoReload?: boolean) => void;
  reportVisiblePositions: (visPos: VisiblePositions) => void;
  startLiveStreaming: () => void;
  stopLiveStreaming: () => void;
}

export const useLogPositionState: () => [LogPositionStateParams, LogPositionCallbacks] = () => {
  const [targetPosition, jumpToTargetPosition] = useState<TimeKey | null>(null);
  const [isAutoReloading, setIsAutoReloading] = useState<boolean>(false);
  // const [autoReloadScrollLock, setAutoReloadScrollLock] = useState(false);
  const [visiblePositions, reportVisiblePositions] = useState<VisiblePositions>({
    endKey: null,
    middleKey: null,
    startKey: null,
    pagesBeforeStart: Infinity,
    pagesAfterEnd: Infinity,
  });
  const [controlsShouldDisplayTargetPosition, setControlsShouldDisplayTargetPosition] = useState(
    false
  );

  const { startKey, middleKey, endKey, pagesBeforeStart, pagesAfterEnd } = visiblePositions;

  const visibleMidpoint = useMemo(() => {
    if (controlsShouldDisplayTargetPosition) {
      return targetPosition;
    } else if (middleKey) {
      return middleKey;
    } else if (targetPosition) {
      return targetPosition;
    } else {
      return null;
    }
  }, [middleKey, targetPosition, controlsShouldDisplayTargetPosition]);

  const visibleTimeInterval = useMemo(
    () => (startKey && endKey ? { start: startKey.time, end: endKey.time } : null),
    [startKey, endKey]
  );

  const state = {
    targetPosition,
    isAutoReloading,
    firstVisiblePosition: startKey,
    pagesBeforeStart,
    pagesAfterEnd,
    // autoReloadScrollLock,
    visibleMidpoint,
    visibleMidpointTime: visibleMidpoint ? visibleMidpoint.time : null,
    visibleTimeInterval,
  };

  const callbacks = {
    jumpToTargetPosition,
    jumpToTargetPositionTime: (time: number, fromAutoReload: boolean = false) =>
      jumpToTargetPosition({ tiebreaker: 0, time, fromAutoReload }),
    reportVisiblePositions,
    startLiveStreaming: () => {
      setIsAutoReloading(true);
      // setAutoReloadScrollLock(false);
    },
    stopLiveStreaming: () => {
      setIsAutoReloading(false);
      // setAutoReloadScrollLock(false);
    },
    // scrollLockLiveStreaming: () => setAutoReloadScrollLock(true),
    // scrollUnlockLiveStreaming: () => setAutoReloadScrollLock(false),
  };

  return [state, callbacks];
};

export const LogPositionState = createContainer(useLogPositionState);
