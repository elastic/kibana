/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  runMockDataSourceConnectionCheck,
  type DataSourceConnectionStatus,
} from './data_source_connection_status';

export interface DataSourceConnectionCheck {
  connectionStatuses: ReadonlyMap<string, DataSourceConnectionStatus>;
  checkingDataSourceNames: ReadonlySet<string>;
  startConnectionCheck: (name: string) => Promise<void>;
}

/**
 * Checks whether a saved data source can be reached and stores the result for in-UI status
 * (for example the data sources table). Connection testing in flyouts uses callouts instead of toasts.
 */
export const useDataSourceConnectionCheck = (): DataSourceConnectionCheck => {
  const [connectionStatuses, setConnectionStatuses] = useState<
    ReadonlyMap<string, DataSourceConnectionStatus>
  >(new Map());
  const [checkingDataSourceNames, setCheckingDataSourceNames] = useState<ReadonlySet<string>>(
    new Set()
  );
  /**
   * Identifies the check a result belongs to, so a re-save that restarts a check discards
   * the result of the check it replaced, and so nothing lands after unmount.
   */
  const latestConnectionCheckIdRef = useRef(new Map<string, number>());
  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const startConnectionCheck = useCallback(async (name: string) => {
    const checkId = (latestConnectionCheckIdRef.current.get(name) ?? 0) + 1;
    latestConnectionCheckIdRef.current.set(name, checkId);

    setCheckingDataSourceNames((current) => new Set(current).add(name));

    const status = await runMockDataSourceConnectionCheck();

    // A newer check for this data source, or an unmount, makes this result stale.
    if (!isMountedRef.current || latestConnectionCheckIdRef.current.get(name) !== checkId) {
      return;
    }

    setConnectionStatuses((current) => new Map(current).set(name, status));
    setCheckingDataSourceNames((current) => {
      const next = new Set(current);
      next.delete(name);
      return next;
    });
  }, []);

  return { connectionStatuses, checkingDataSourceNames, startConnectionCheck };
};
