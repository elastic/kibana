/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import type { TimeRange } from '@kbn/es-query';
import { useTimeRange } from './use_time_range';
import { useKibana } from './use_kibana';

/**
 * Hook that provides time range sync functionality:
 * - Syncs URL time params to the global timefilter (for hooks that depend on it)
 * - Provides a memoized handleTimeChange function to update URL time params
 *
 * Use this in components that have a time picker or need to sync time state.
 */
export function useTimeRangeSync() {
  const history = useHistory();
  const { rangeFrom, rangeTo, start, end, startMs, endMs } = useTimeRange();

  const {
    dependencies: {
      start: {
        data: { query: queryService },
      },
    },
  } = useKibana();

  // Sync URL time params to global timefilter
  useEffect(() => {
    if (rangeFrom && rangeTo) {
      queryService.timefilter.timefilter.setTime({
        from: rangeFrom,
        to: rangeTo,
      });
    }
  }, [rangeFrom, rangeTo, queryService]);

  const handleTimeChange = useCallback(
    (nextRange: TimeRange) => {
      const searchParams = new URLSearchParams(history.location.search);
      searchParams.set('rangeFrom', nextRange.from);
      searchParams.set('rangeTo', nextRange.to);
      history.push({
        ...history.location,
        search: searchParams.toString(),
      });
    },
    [history]
  );

  return {
    rangeFrom,
    rangeTo,
    start,
    end,
    startMs,
    endMs,
    handleTimeChange,
  };
}
