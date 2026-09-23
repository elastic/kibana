/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { Observable } from 'rxjs';
import { combineLatest, distinctUntilChanged, map, of } from 'rxjs';
import {
  NOTIFICATION_CENTER_UI_ENABLED_DEFAULT,
  NOTIFICATION_CENTER_UI_ENABLED_FLAG,
  NOTIFICATION_TYPE_ENABLED_DEFAULT,
  NOTIFICATION_TYPE_FLAGS,
} from '../../common/feature_flags';
import {
  NOTIFICATION_CENTER_ENABLED_DEFAULT,
  NOTIFICATION_CENTER_ENABLED_SETTING,
  NOTIFICATION_TYPE_SETTING_DEFAULT,
  NOTIFICATION_TYPE_SETTINGS,
} from '../../common/ui_settings';

export type NotificationCenterVisibilityDeps = Pick<CoreStart, 'featureFlags' | 'uiSettings'>;

/**
 * Emits whether any Notification Center UI may render: the rollout feature flag and the space's
 * opt-in setting must both be on.
 */
export const notificationCenterVisible$ = ({
  featureFlags,
  uiSettings,
}: NotificationCenterVisibilityDeps): Observable<boolean> =>
  combineLatest([
    featureFlags.getBooleanValue$(
      NOTIFICATION_CENTER_UI_ENABLED_FLAG,
      NOTIFICATION_CENTER_UI_ENABLED_DEFAULT
    ),
    uiSettings.get$<boolean>(
      NOTIFICATION_CENTER_ENABLED_SETTING,
      NOTIFICATION_CENTER_ENABLED_DEFAULT
    ),
  ]).pipe(
    map(([flagEnabled, optedIn]) => flagEnabled && optedIn),
    distinctUntilChanged()
  );

/**
 * Emits the `<namespace>.<typeId>` ids the UI may show. A type needs its space opt-in, plus its
 * own feature flag when the registry declares one; an unflagged type only needs the opt-in.
 */
export const visibleNotificationTypes$ = ({
  featureFlags,
  uiSettings,
}: NotificationCenterVisibilityDeps): Observable<string[]> => {
  const types = Object.entries(NOTIFICATION_TYPE_SETTINGS);
  if (types.length === 0) {
    return of([]);
  }

  return combineLatest(
    types.map(([typeId, settingKey]) => {
      const flag = NOTIFICATION_TYPE_FLAGS[typeId];
      const flagEnabled$ =
        flag === undefined
          ? of(true)
          : featureFlags.getBooleanValue$(flag, NOTIFICATION_TYPE_ENABLED_DEFAULT);

      return combineLatest([
        flagEnabled$,
        uiSettings.get$<boolean>(settingKey, NOTIFICATION_TYPE_SETTING_DEFAULT),
      ]).pipe(map(([flagEnabled, optedIn]) => (flagEnabled && optedIn ? typeId : undefined)));
    })
  ).pipe(map((ids) => ids.filter((id): id is string => id !== undefined)));
};
