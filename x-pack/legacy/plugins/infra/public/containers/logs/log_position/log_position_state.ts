/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import createContainer from 'constate';
import { TimeKey } from '../../../../common/time';

type TimeKeyOrNull = TimeKey | null;

interface DateRange {
  startDate: string;
  endDate: string;
}

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
  startDate: string;
  endDate: string;
}

export interface LogPositionCallbacks {
  jumpToTargetPosition: (pos: TimeKeyOrNull) => void;
  jumpToTargetPositionTime: (time: number) => void;
  reportVisiblePositions: (visPos: VisiblePositions) => void;
  startLiveStreaming: () => void;
  stopLiveStreaming: () => void;
  updateDateRange: (newDateRage: Partial<DateRange>) => void;
}

const DEFAULT_DATE_RANGE: DateRange = { startDate: 'now-1d', endDate: 'now' };

const useVisibleMidpoint = (middleKey: TimeKeyOrNull, targetPosition: TimeKeyOrNull) => {
  // Of the two dependencies `middleKey` and `targetPosition`, return
  // whichever one was the most recently updated. This allows the UI controls
  // to display a newly-selected `targetPosition` before loading new data;
  // otherwise the previous `middleKey` would linger in the UI for the entirety
  // of the loading operation, which the user could perceive as unresponsiveness
  const [store, update] = useState({
    middleKey,
    targetPosition,
    currentValue: middleKey || targetPosition,
  });
  useEffect(() => {
    if (middleKey !== store.middleKey) {
      update({ targetPosition, middleKey, currentValue: middleKey });
    } else if (targetPosition !== store.targetPosition) {
      update({ targetPosition, middleKey, currentValue: targetPosition });
    }
  }, [middleKey, targetPosition]); // eslint-disable-line react-hooks/exhaustive-deps

  return store.currentValue;
};

export const useLogPositionState: () => LogPositionStateParams & LogPositionCallbacks = () => {
  const [targetPosition, jumpToTargetPosition] = useState<TimeKey | null>(null);
  const [isAutoReloading, setIsAutoReloading] = useState(false);
  const [visiblePositions, reportVisiblePositions] = useState<VisiblePositions>({
    endKey: null,
    middleKey: null,
    startKey: null,
    pagesBeforeStart: Infinity,
    pagesAfterEnd: Infinity,
  });

  // We group the `startDate` and `endDate` values in the same object to be able
  // to set both at the same time, saving a re-render
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);

  const { startKey, middleKey, endKey, pagesBeforeStart, pagesAfterEnd } = visiblePositions;

  const visibleMidpoint = useVisibleMidpoint(middleKey, targetPosition);

  const visibleTimeInterval = useMemo(
    () => (startKey && endKey ? { start: startKey.time, end: endKey.time } : null),
    [startKey, endKey]
  );

  // Allow setting `startDate` and `endDate` separately, or together
  const updateDateRange = useCallback(
    (newDateRange: Partial<DateRange>) => {
      // Prevent unnecessary re-renders
      if (!('startDate' in newDateRange) && !('endDate' in newDateRange)) {
        return;
      }
      if (
        newDateRange.startDate === dateRange.startDate &&
        newDateRange.endDate === dateRange.endDate
      ) {
        return;
      }

      setDateRange(previousDateRange => {
        return {
          startDate: newDateRange.startDate || previousDateRange.startDate,
          endDate: newDateRange.endDate || previousDateRange.endDate,
        };
      });
    },
    [dateRange]
  );

  const state = {
    targetPosition,
    isAutoReloading,
    firstVisiblePosition: startKey,
    pagesBeforeStart,
    pagesAfterEnd,
    visibleMidpoint,
    visibleMidpointTime: visibleMidpoint ? visibleMidpoint.time : null,
    visibleTimeInterval,
    ...dateRange,
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
    updateDateRange,
  };

  return { ...state, ...callbacks };
};

export const LogPositionState = createContainer(useLogPositionState);
