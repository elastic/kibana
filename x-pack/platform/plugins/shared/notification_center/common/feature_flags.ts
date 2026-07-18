/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Feature flag definitions used by the Notification Center plugin.
 */

import { NOTIFICATION_REGISTRY } from './notification_registry';
import { notificationTypeId, type NotificationTypeId } from './notification_registry_utils';

/**
 * Master gate for everything user-visible in the Notification Center UI. Off
 * by default. Individual notification types are gated separately.
 */
export const NOTIFICATION_CENTER_UI_ENABLED_FLAG = 'notificationCenter.uiEnabled';
export const NOTIFICATION_CENTER_UI_ENABLED_DEFAULT = false;

/**
 * This object stores a map of notification types and their feature flag value.
 *
 * Each notification type is gated by its own boolean feature flag rather than a
 * single list, so the Feature Flags service can control which notifications are
 * sent out.
 *
 * Notifications are each identified by the `<namespace>.<typeId>` from the registry.
 * Only types that declare a `feature_flag` appear here
 * Gating a new notification type requires two edits:
 *  1. add it to the registry with a `feature_flag`, and
 *  2. add the matching flag definition as a YAML file in the external
 *    `elastic/kibana-feature-flags` repository
 */
export const NOTIFICATION_TYPE_FLAGS = Object.fromEntries(
  Object.entries(NOTIFICATION_REGISTRY).flatMap(([namespace, definition]) =>
    Object.entries(definition.types)
      .filter(([, type]) => type.feature_flag !== undefined)
      .map(([typeId, type]) => [notificationTypeId(namespace, typeId), type.feature_flag])
  )
) as Partial<Record<NotificationTypeId, string>>;

/**
 * Per-type flags are off by default if no value is found in LaunchDarkly
 */
export const NOTIFICATION_TYPE_ENABLED_DEFAULT = false;
