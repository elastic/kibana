/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useContext, useState, useEffect } from 'react';
import { combineLatest, timer } from 'rxjs';
import { switchMap, map, tap, retry } from 'rxjs';
import moment from 'moment';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { useStorage } from '@kbn/ml-local-storage';
import { useMlKibana } from '../kibana';
import {
  ML_NOTIFICATIONS_LAST_CHECKED_AT,
  type MlStorageKey,
  type TMlStorageMapped,
} from '../../../../common/types/storage';
import { useAsObservable } from '../../hooks';
import type { NotificationsCountResponse } from '../../../../common/types/notifications';

const NOTIFICATIONS_CHECK_INTERVAL = 60000;

const defaultCounts = { info: 0, error: 0, warning: 0 };

export const MlNotificationsContext = React.createContext<{
  notificationsCounts: NotificationsCountResponse;
  /** Timestamp of the latest notification checked by the user */
  lastCheckedAt: number | null;
  /** Holds the value used for the actual request */
  latestRequestedAt: number | null;
  setLastCheckedAt: (v: number) => void;
}>({
  notificationsCounts: defaultCounts,
  lastCheckedAt: null,
  latestRequestedAt: null,
  setLastCheckedAt: () => {},
});

export const MlNotificationsContextProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const {
    services: {
      mlServices: { mlApi },
      application: { capabilities },
    },
  } = useMlKibana();
  const canGetJobs = capabilities.ml.canGetJobs as boolean;
  const canGetDataFrameAnalytics = capabilities.ml.canGetDataFrameAnalytics as boolean;
  const canGetTrainedModels = capabilities.ml.canGetTrainedModels as boolean;

  const canGetNotifications = canGetJobs && canGetDataFrameAnalytics && canGetTrainedModels;

  const [lastCheckedAt, setLastCheckedAt] = useStorage<
    MlStorageKey,
    TMlStorageMapped<typeof ML_NOTIFICATIONS_LAST_CHECKED_AT>
  >(ML_NOTIFICATIONS_LAST_CHECKED_AT);
  const lastCheckedAt$ = useAsObservable(lastCheckedAt);

  /** Holds the value used for the actual request */
  const [latestRequestedAt, setLatestRequestedAt] = useState<number | null>(null);
  const [notificationsCounts, setNotificationsCounts] =
    useState<NotificationsCountResponse>(defaultCounts);

  useEffect(
    function startPollingNotifications() {
      if (!canGetNotifications) return;

      const subscription = combineLatest([lastCheckedAt$, timer(0, NOTIFICATIONS_CHECK_INTERVAL)])
        .pipe(
          // Use the latest check time or 7 days ago by default.
          map(([lastChecked]) => lastChecked ?? moment().subtract(7, 'd').valueOf()),
          tap((lastCheckedAtQuery) => {
            setLatestRequestedAt(lastCheckedAtQuery);
          }),
          switchMap((lastCheckedAtQuery) =>
            mlApi.notifications.countMessages$({
              lastCheckedAt: lastCheckedAtQuery,
            })
          ),
          retry({ delay: NOTIFICATIONS_CHECK_INTERVAL })
        )
        .subscribe((response) => {
          setNotificationsCounts(isPopulatedObject(response) ? response : defaultCounts);
        });

      return () => {
        subscription.unsubscribe();
      };
    },
    [canGetNotifications, lastCheckedAt$, mlApi.notifications]
  );

  return (
    <MlNotificationsContext.Provider
      value={{ notificationsCounts, lastCheckedAt, setLastCheckedAt, latestRequestedAt }}
    >
      {children}
    </MlNotificationsContext.Provider>
  );
};

export function useMlNotifications() {
  return useContext(MlNotificationsContext);
}
