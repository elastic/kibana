/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import createContainer from 'constate';
import { TimeKey } from '../../../../common/time';

type TimeKeyOrNull = TimeKey | null;

interface VisiblePositions {
  startKey: TimeKeyOrNull;
  endKey: TimeKeyOrNull;
  entriesBeforeStart: number;
  entriesAfterEnd: number;
}

export interface LogPositionStateParams {
  targetPosition: TimeKeyOrNull;
  isAutoReloading: boolean;
  firstVisiblePosition: TimeKeyOrNull;
  entriesBeforeStart: number;
  entriesAfterEnd: number;
  visibleMidpoint: TimeKeyOrNull;
  visibleMidpointTime: number | null;
  visibleTimeInterval: { start: number; end: number } | null;
}

export interface LogPositionCallbacks {
  jumpToTargetPosition: (pos: TimeKeyOrNull) => void;
  jumpToTargetPositionTime: (time: number) => void;
  reportVisiblePositions: (visPos: VisiblePositions) => void;
  startLiveStreaming: () => void;
  stopLiveStreaming: () => void;
}

const useVisibleMidpoint = (endKey: TimeKeyOrNull, targetPosition: TimeKeyOrNull) => {
  // Of the two dependencies `endKey` and `targetPosition`, return
  // whichever one was the most recently updated. This allows the UI controls
  // to display a newly-selected `targetPosition` before loading new data;
  // otherwise the previous `endKey` would linger in the UI for the entirety
  // of the loading operation, which the user could perceive as unresponsiveness
  const [store, update] = useState({
    endKey,
    targetPosition,
    currentValue: endKey || targetPosition,
  });
  useEffect(() => {
    if (endKey !== store.endKey) {
      update({ targetPosition, endKey, currentValue: endKey });
    } else if (targetPosition !== store.targetPosition) {
      update({ targetPosition, endKey, currentValue: targetPosition });
    }
  }, [endKey, targetPosition]); // eslint-disable-line react-hooks/exhaustive-deps

  return store.currentValue;
};

export const useLogPositionState: () => LogPositionStateParams & LogPositionCallbacks = () => {
  const [targetPosition, jumpToTargetPosition] = useState<TimeKey | null>(null);
  const [isAutoReloading, setIsAutoReloading] = useState(false);
  const [visiblePositions, reportVisiblePositions] = useState<VisiblePositions>({
    endKey: null,
    startKey: null,
    entriesBeforeStart: Infinity,
    entriesAfterEnd: Infinity,
  });

  const { startKey, endKey, entriesBeforeStart, entriesAfterEnd } = visiblePositions;

  const visibleMidpoint = useVisibleMidpoint(endKey, targetPosition);

  const visibleTimeInterval = useMemo(
    () => (startKey && endKey ? { start: startKey.time, end: endKey.time } : null),
    [startKey, endKey]
  );

  const state = {
    targetPosition,
    isAutoReloading,
    firstVisiblePosition: startKey,
    entriesBeforeStart,
    entriesAfterEnd,
    visibleMidpoint,
    visibleMidpointTime: visibleMidpoint ? visibleMidpoint.time : null,
    visibleTimeInterval,
  };

  const callbacks = {
    jumpToTargetPosition,
    jumpToTargetPositionTime: useCallback(
      (time: number) => jumpToTargetPosition({ tiebreaker: 0, time }),
      [jumpToTargetPosition]
    ),
    reportVisiblePositions,
    startLiveStreaming: useCallback(() => setIsAutoReloading(true), [setIsAutoReloading]),
    stopLiveStreaming: useCallback(() => setIsAutoReloading(false), [setIsAutoReloading]),
  };

  return { ...state, ...callbacks };
};

export const LogPositionState = createContainer(useLogPositionState);
