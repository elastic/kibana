/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  createKbnUrlStateStorage,
  Storage,
  type IKbnUrlStateStorage,
} from '@kbn/kibana-utils-plugin/public';
import deepEqual from 'fast-deep-equal';
import {
  readActivityTimeRangeFromStorage,
  readActivityTimeRangeFromUrl,
  resolveActivityTimeRange,
  writeActivityTimeRangeToStorage,
  writeActivityTimeRangeToUrl,
  type AlertTimelineTimeRange,
} from '../activity_time_range_state';
import { DEFAULT_ACTIVITY_TIME_RANGE } from '../time_range';

export type { AlertTimelineTimeRange };

/**
 * Two-way sync for the Alert activity time range. Hydrates from URL, then
 * localStorage, then the given default. User changes write both stores so the
 * range survives rule-to-rule navigation and is shareable via URL.
 *
 * Precedence on load (and on re-sync from browser Back/Forward): URL > localStorage > default.
 */
export const useAlertTimelineUrlState = (
  storage?: Storage
): [AlertTimelineTimeRange, (next: AlertTimelineTimeRange) => void] => {
  const history = useHistory();
  const location = useLocation();

  const resolvedStorage = useMemo(() => storage ?? new Storage(window.localStorage), [storage]);

  const urlStateStorage: IKbnUrlStateStorage = useMemo(
    () => createKbnUrlStateStorage({ useHash: false, useHashQuery: false, history }),
    [history]
  );

  const [timeRange, setTimeRangeInternal] = useState<AlertTimelineTimeRange>(() =>
    resolveActivityTimeRange(
      readActivityTimeRangeFromStorage(resolvedStorage),
      readActivityTimeRangeFromUrl(urlStateStorage),
      DEFAULT_ACTIVITY_TIME_RANGE
    )
  );

  useEffect(() => {
    // useState above only reads the URL on mount; user-driven changes go through setTimeRange.
    // When location.search changes without that (e.g. browser Back/Forward), we must re-apply the
    // state here or the picker will diverge from the address bar. Mirrors useEpisodesTableConfig.
    const next = resolveActivityTimeRange(
      readActivityTimeRangeFromStorage(resolvedStorage),
      readActivityTimeRangeFromUrl(urlStateStorage),
      DEFAULT_ACTIVITY_TIME_RANGE
    );
    setTimeRangeInternal((prev) => (deepEqual(prev, next) ? prev : next));
  }, [location.search, resolvedStorage, urlStateStorage]);

  const persistRange = useCallback(
    (next: AlertTimelineTimeRange) => {
      writeActivityTimeRangeToStorage(resolvedStorage, next);
      void writeActivityTimeRangeToUrl(urlStateStorage, next);
    },
    [resolvedStorage, urlStateStorage]
  );

  const setTimeRange = useCallback(
    (next: AlertTimelineTimeRange) => {
      setTimeRangeInternal(next);
      persistRange(next);
    },
    [persistRange]
  );

  return [timeRange, setTimeRange];
};
