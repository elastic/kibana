/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  createKbnUrlStateStorage,
  Storage,
  type IKbnUrlStateStorage,
} from '@kbn/kibana-utils-plugin/public';
import {
  isSameActivityTimeRange,
  readActivityTimeRangeFromStorage,
  readActivityTimeRangeFromUrl,
  resolveActivityTimeRange,
  writeActivityTimeRangeToStorage,
  writeActivityTimeRangeToUrl,
  type AlertTimelineTimeRange,
} from '../activity_time_range_state';
import { DEFAULT_ACTIVITY_TIME_RANGE } from '../time_range';

export type { AlertTimelineTimeRange };

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

  const isFirstUrlSync = useRef(true);
  useEffect(() => {
    if (isFirstUrlSync.current) {
      isFirstUrlSync.current = false;
      if (!readActivityTimeRangeFromUrl(urlStateStorage)) {
        const stored = readActivityTimeRangeFromStorage(resolvedStorage);
        if (stored) {
          void writeActivityTimeRangeToUrl(urlStateStorage, stored, { replace: true }).catch(() => {
            // URL persistence is best-effort; state is already seeded from storage.
          });
        }
      }
      return;
    }
    /* Navigation is not an explicit choice, so it updates the view but never localStorage;
     * only the date picker writes there. Mirrors useEpisodesTableConfig. */
    const next = readActivityTimeRangeFromUrl(urlStateStorage) ?? DEFAULT_ACTIVITY_TIME_RANGE;
    setTimeRangeInternal((prev) => (isSameActivityTimeRange(prev, next) ? prev : next));
  }, [location.search, resolvedStorage, urlStateStorage]);

  const persistRange = useCallback(
    (next: AlertTimelineTimeRange) => {
      writeActivityTimeRangeToStorage(resolvedStorage, next);
      void writeActivityTimeRangeToUrl(urlStateStorage, next).catch(() => {
        // URL persistence is best-effort; localStorage already has the range.
      });
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
