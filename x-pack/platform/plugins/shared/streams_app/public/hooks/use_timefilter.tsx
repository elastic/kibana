/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useMemo, useCallback } from 'react';
import { TimeRange } from '@kbn/es-query';
import { TimefilterContract } from '@kbn/data-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { map, tap } from 'rxjs';

const TimeFilterContext = React.createContext<TimeFilterState | undefined>(undefined);

export interface TimeFilterProviderProps {
  timefilter: TimefilterContract;
  children?: React.ReactNode;
}

export interface AbsoluteTimeRange {
  start: number;
  end: number;
}

export interface TimeFilterState {
  timeRange: TimeRange;
  absoluteTimeRange: AbsoluteTimeRange;
  setTimeRange(value: TimeRange): void;
  refreshAbsoluteTimeRange(): void;
}

export const TimeFilterProvider: React.FC<TimeFilterProviderProps> = ({ timefilter, children }) => {
  const [absoluteTimeRange, setAbsoluteTimeRange] = useState(timefilter.getAbsoluteTime());

  const refreshAbsoluteTimeRange = useCallback(
    () => setAbsoluteTimeRange(timefilter.getAbsoluteTime()),
    [timefilter]
  );

  const timeRange$ = useMemo(() => {
    return timefilter.getTimeUpdate$().pipe(map(timefilter.getTime), tap(refreshAbsoluteTimeRange));
  }, [timefilter, refreshAbsoluteTimeRange]);

  const timeRange = useObservable(timeRange$, timefilter.getTime());

  const state: TimeFilterState = useMemo(() => {
    return {
      timeRange,
      absoluteTimeRange: {
        start: new Date(absoluteTimeRange.from).getTime(),
        end: new Date(absoluteTimeRange.to).getTime(),
      },
      setTimeRange: timefilter.setTime,
      refreshAbsoluteTimeRange,
    };
  }, [timeRange, absoluteTimeRange, timefilter, refreshAbsoluteTimeRange]);

  return <TimeFilterContext.Provider value={state}>{children}</TimeFilterContext.Provider>;
};

export function useTimeFilter(): TimeFilterState {
  const context = useContext(TimeFilterContext);
  if (!context) {
    throw new Error('useTimeFilter must be used within a TimeFilterProvider');
  }
  return context;
}
