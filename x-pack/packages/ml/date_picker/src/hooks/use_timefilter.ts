/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { merge, type Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { isEqual } from 'lodash';

import type { TimeRange } from '@kbn/es-query';
import type { TimefilterContract } from '@kbn/data-plugin/public';

import { useDatePickerContext } from './use_date_picker_context';
import type { Refresh } from '../services/timefilter_refresh_service';
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';

/**
 * Options interface for the `useTimefilter` custom hook.
 */
interface UseTimefilterOptions {
  /**
   * Boolean flag to enable/disable the time range selector
   */
  timeRangeSelector?: boolean;
  /**
   * Boolean flag to enable/disable the auto refresh selector
   */
  autoRefreshSelector?: boolean;
}

/**
 * Custom hook to get the timefilter from runtime dependencies.
 *
 * @param {UseTimefilterOptions} options - time filter options
 * @returns {TimefilterContract} timefilter
 */
export const useTimefilter = (options: UseTimefilterOptions = {}): TimefilterContract => {
  const { timeRangeSelector, autoRefreshSelector } = options;
  const {
    data: {
      query: {
        timefilter: { timefilter },
      },
    },
  } = useDatePickerContext();

  useEffect(() => {
    if (timeRangeSelector === true && !timefilter.isTimeRangeSelectorEnabled()) {
      timefilter.enableTimeRangeSelector();
    } else if (timeRangeSelector === false && timefilter.isTimeRangeSelectorEnabled()) {
      timefilter.disableTimeRangeSelector();
    }

    if (autoRefreshSelector === true && !timefilter.isAutoRefreshSelectorEnabled()) {
      timefilter.enableAutoRefreshSelector();
    } else if (autoRefreshSelector === false && timefilter.isAutoRefreshSelectorEnabled()) {
      timefilter.disableAutoRefreshSelector();
    }
  }, [timeRangeSelector, autoRefreshSelector, timefilter]);

  return timefilter;
};

/**
 * Custom hook to return refresh interval updates from the `refreshIntervalObservable$` observable.
 *
 * @returns refresh interval update
 */
export const useRefreshIntervalUpdates = () => {
  const timefilter = useTimefilter();

  const refreshIntervalObservable$ = useMemo(
    () => timefilter.getRefreshIntervalUpdate$().pipe(map(timefilter.getRefreshInterval)),
    [timefilter]
  );

  return useObservable(refreshIntervalObservable$, timefilter.getRefreshInterval());
};

/**
 * Custom hook to return time range updates from the `timeChangeObservable$` observable.
 *
 * @param absolute - flag to enforce absolute times
 * @returns time range update
 */
export const useTimeRangeUpdates = (absolute = false): TimeRange => {
  const timefilter = useTimefilter();

  const getTimeCallback = useMemo(() => {
    return absolute
      ? timefilter.getAbsoluteTime.bind(timefilter)
      : timefilter.getTime.bind(timefilter);
  }, [absolute, timefilter]);

  const timeChangeObservable$ = useMemo(
    () => timefilter.getTimeUpdate$().pipe(map(getTimeCallback), distinctUntilChanged(isEqual)),
    [timefilter, getTimeCallback]
  );

  return useObservable(timeChangeObservable$, getTimeCallback());
};

/**
 * Provides the latest refresh, both manual or auto.
 */
export const useRefresh = () => {
  const timefilter = useTimefilter();

  const getTimeRange = () => {
    const { from, to } = timefilter.getTime();
    return { start: from, end: to };
  };

  const refresh$ = useMemo(() => {
    return merge(
      mlTimefilterRefresh$,
      timefilter.getTimeUpdate$().pipe(
        map(() => {
          return { lastRefresh: Date.now(), timeRange: getTimeRange() };
        })
      )
    ) as Observable<Refresh>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useObservable<Refresh>(refresh$);
};
