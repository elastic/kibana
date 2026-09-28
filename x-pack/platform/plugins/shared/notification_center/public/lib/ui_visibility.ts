/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { combineLatest, map, of, type Observable } from 'rxjs';
import {
  NOTIFICATION_CENTER_UI_ENABLED_DEFAULT,
  NOTIFICATION_CENTER_UI_ENABLED_FLAG,
} from '../../common/feature_flags';
import type { NotificationTypeRef } from '../../common/notification_registry_utils';
import { NOTIFICATION_TYPE_REFS } from '../../common/notification_registry_utils';
import {
  NOTIFICATION_CENTER_ENABLED_SETTING,
  NOTIFICATION_CENTER_SETTING_DEFAULT,
  namespaceSettingKey,
  typeSettingKey,
} from '../../common/ui_settings';

/** What the Notification Center UI is allowed to render in the active space. */
export interface NotificationCenterVisibility {
  /** False when the UI must render nothing: the deployment flag or the space's master switch is off. */
  isEnabled: boolean;
  /**
   * Types the space has opted in to. Pass these as list-route filters rather than filtering the
   * response, so hidden types don't consume the route's result cap.
   */
  visibleTypes: NotificationTypeRef[];
}

const groupRefsByNamespace = (): Map<string, NotificationTypeRef[]> => {
  const groups = new Map<string, NotificationTypeRef[]>();
  for (const ref of NOTIFICATION_TYPE_REFS) {
    const group = groups.get(ref.namespace);
    if (group) {
      group.push(ref);
    } else {
      groups.set(ref.namespace, [ref]);
    }
  }
  return groups;
};

/**
 * The only place the Notification Center advanced settings are read. Keeping them out of `submit`,
 * the routes and the cleanup task is what stops per-space data behaviour from being keyed on a
 * user-editable saved object.
 *
 * Observable rather than one-shot: `chrome.navControls.registerRight` fires once, so the bell has
 * to register unconditionally and subscribe, or a user toggling the setting off leaves it stranded.
 */
export const getNotificationCenterVisibility$ = ({
  featureFlags,
  uiSettings,
}: Pick<CoreStart, 'featureFlags' | 'uiSettings'>): Observable<NotificationCenterVisibility> => {
  const isEnabled$ = combineLatest([
    featureFlags.getBooleanValue$(
      NOTIFICATION_CENTER_UI_ENABLED_FLAG,
      NOTIFICATION_CENTER_UI_ENABLED_DEFAULT
    ),
    uiSettings.get$<boolean>(
      NOTIFICATION_CENTER_ENABLED_SETTING,
      NOTIFICATION_CENTER_SETTING_DEFAULT
    ),
  ]).pipe(map(([flagEnabled, spaceEnabled]) => flagEnabled && spaceEnabled));

  const perNamespace$ = [...groupRefsByNamespace()].map(([namespace, refs]) =>
    combineLatest([
      uiSettings.get$<boolean>(namespaceSettingKey(namespace), NOTIFICATION_CENTER_SETTING_DEFAULT),
      ...refs.map((ref) =>
        uiSettings.get$<boolean>(
          typeSettingKey(ref.namespace, ref.type),
          NOTIFICATION_CENTER_SETTING_DEFAULT
        )
      ),
    ]).pipe(
      map(([namespaceEnabled, ...typesEnabled]) =>
        namespaceEnabled ? refs.filter((_, index) => typesEnabled[index]) : []
      )
    )
  );

  // combineLatest([]) never emits, so an empty registry has to short-circuit to a constant.
  const visibleTypes$ = perNamespace$.length
    ? combineLatest(perNamespace$).pipe(map((groups) => groups.flat()))
    : of<NotificationTypeRef[]>([]);

  return combineLatest([isEnabled$, visibleTypes$]).pipe(
    map(([isEnabled, visibleTypes]) => ({
      isEnabled,
      visibleTypes: isEnabled ? visibleTypes : [],
    }))
  );
};
