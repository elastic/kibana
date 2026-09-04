/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Toast } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { createDataSourceFlyoutStrings } from './create_data_source_flyout/create_data_source_flyout_i18n';
import {
  runMockDataSourceConnectionCheck,
  type DataSourceConnectionStatus,
} from './data_source_connection_status';
import { mainTranslations } from './main_i18n';
import type { DataFederationKibanaServices } from './types';

/** Outlasts the check, so that a result we never hear about does not strand the toast. */
const PROGRESS_TOAST_LIFETIME_MS = 30_000;

export interface UseDataSourceConnectionCheckOptions {
  /** Announces the running check in a toast, for callers with nowhere to put a spinner. */
  showProgressToast?: boolean;
}

export interface DataSourceConnectionCheck {
  connectionStatuses: ReadonlyMap<string, DataSourceConnectionStatus>;
  checkingDataSourceNames: ReadonlySet<string>;
  startConnectionCheck: (name: string) => Promise<void>;
}

/**
 * Checks whether a saved data source can be reached, and reports the outcome in a toast.
 * Callers that can show the check in place, such as the table, keep the progress toast off
 * and read {@link DataSourceConnectionCheck.checkingDataSourceNames} instead.
 */
export const useDataSourceConnectionCheck = ({
  showProgressToast = false,
}: UseDataSourceConnectionCheckOptions = {}): DataSourceConnectionCheck => {
  const {
    services: { toasts },
  } = useKibana<DataFederationKibanaServices>();
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
  const progressToastsRef = useRef(new Map<string, Toast>());
  const isMountedRef = useRef(true);
  const toastsRef = useRef(toasts);

  useEffect(() => {
    toastsRef.current = toasts;
  });

  useEffect(
    () => () => {
      isMountedRef.current = false;

      // Nothing is left to replace them, so they would sit there claiming a check is running.
      for (const toast of progressToastsRef.current.values()) {
        toastsRef.current.remove(toast);
      }
      progressToastsRef.current.clear();
    },
    []
  );

  const dismissProgressToast = useCallback(
    (name: string) => {
      const toast = progressToastsRef.current.get(name);
      if (!toast) {
        return;
      }

      progressToastsRef.current.delete(name);
      toasts.remove(toast);
    },
    [toasts]
  );

  const startConnectionCheck = useCallback(
    async (name: string) => {
      const checkId = (latestConnectionCheckIdRef.current.get(name) ?? 0) + 1;
      latestConnectionCheckIdRef.current.set(name, checkId);

      setCheckingDataSourceNames((current) => new Set(current).add(name));

      if (showProgressToast) {
        // A restarted check speaks for the one it supersedes.
        dismissProgressToast(name);
        progressToastsRef.current.set(
          name,
          toasts.add({
            title: mainTranslations.columns.dataSources.connectionStatusChecking,
            text: mainTranslations.connectionCheck.progressText(name),
            toastLifeTimeMs: PROGRESS_TOAST_LIFETIME_MS,
          })
        );
      }

      const status = await runMockDataSourceConnectionCheck();

      // A newer check for this data source, or an unmount, makes this result stale.
      if (!isMountedRef.current || latestConnectionCheckIdRef.current.get(name) !== checkId) {
        return;
      }

      dismissProgressToast(name);

      setConnectionStatuses((current) => new Map(current).set(name, status));
      setCheckingDataSourceNames((current) => {
        const next = new Set(current);
        next.delete(name);
        return next;
      });

      if (status === 'connected') {
        toasts.addSuccess({
          title: createDataSourceFlyoutStrings.testConnectionSuccessTitle(),
          text: mainTranslations.connectionCheck.successText(name),
        });
        return;
      }

      toasts.addDanger({
        title: createDataSourceFlyoutStrings.testConnectionErrorTitle(),
        text: mainTranslations.connectionCheck.errorText(name),
      });
    },
    [dismissProgressToast, showProgressToast, toasts]
  );

  return { connectionStatuses, checkingDataSourceNames, startConnectionCheck };
};
