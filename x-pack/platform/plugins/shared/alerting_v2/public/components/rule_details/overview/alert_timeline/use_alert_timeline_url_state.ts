/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  createKbnUrlStateStorage,
  type IKbnUrlStateStorage,
} from '@kbn/kibana-utils-plugin/public';

const APP_STATE_STORAGE_KEY = '_a';

export interface AlertTimelineTimeRange {
  from: string;
  to: string;
}

interface PersistedAppState {
  activityTimeRange?: AlertTimelineTimeRange;
}

/**
 * Two-way URL state sync for the Alert Timeline time range. Hydrates
 * from `_a.activityTimeRange` on mount and writes back on every change so the
 * page URL is shareable and refresh-stable.
 */
export const useAlertTimelineUrlState = (
  defaultTimeRange: AlertTimelineTimeRange
): [AlertTimelineTimeRange, (next: AlertTimelineTimeRange) => void] => {
  const history = useHistory();

  const stateStorage: IKbnUrlStateStorage = useMemo(
    () => createKbnUrlStateStorage({ useHash: false, useHashQuery: false, history }),
    [history]
  );

  const [timeRange, setTimeRange] = useState<AlertTimelineTimeRange>(() => {
    const persisted = stateStorage.get<PersistedAppState>(APP_STATE_STORAGE_KEY);
    return persisted?.activityTimeRange ?? defaultTimeRange;
  });

  const isFirstWrite = useRef(true);
  useEffect(() => {
    if (isFirstWrite.current) {
      isFirstWrite.current = false;
      return;
    }
    const current = stateStorage.get<PersistedAppState>(APP_STATE_STORAGE_KEY) ?? {};
    stateStorage.set<PersistedAppState>(
      APP_STATE_STORAGE_KEY,
      { ...current, activityTimeRange: timeRange },
      { replace: true }
    );
  }, [stateStorage, timeRange]);

  return [timeRange, setTimeRange];
};
