/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTIFICATION_REGISTRY } from './notification_registry';
import { joinNotificationTypeId } from './notification_registry_utils';

/**
 * Space-scoped opt-in for everything the Notification Center renders. Off by default; a
 * deployment turns it on per space during the soft launch, and the default flips at launch.
 */
export const NOTIFICATION_CENTER_ENABLED_SETTING = 'notificationCenter:enabled';
export const NOTIFICATION_CENTER_ENABLED_DEFAULT = false;

const NOTIFICATION_TYPE_SETTING_PREFIX = 'notificationCenter:types:';

/**
 * Registry types keyed by `<namespace>.<typeId>`, mapped to their space-scoped opt-in setting.
 * Every registered type gets one, whether or not it also declares a `feature_flag`.
 */
export const NOTIFICATION_TYPE_SETTINGS: Record<string, string> = Object.fromEntries(
  Object.entries(NOTIFICATION_REGISTRY).flatMap(([namespace, definition]) =>
    Object.keys(definition.types).map((typeId) => {
      const id = joinNotificationTypeId(namespace, typeId);
      return [id, `${NOTIFICATION_TYPE_SETTING_PREFIX}${id}`];
    })
  )
);

export const NOTIFICATION_TYPE_SETTING_DEFAULT = false;
