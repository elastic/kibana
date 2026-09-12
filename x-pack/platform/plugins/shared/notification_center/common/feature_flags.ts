/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTIFICATION_REGISTRY } from './notification_registry';
import { joinNotificationTypeId } from './notification_registry_utils';

/**
 * Master gate for everything user-visible in the Notification Center UI. Off
 * by default. Individual notification types are gated separately.
 */
export const NOTIFICATION_CENTER_UI_ENABLED_FLAG = 'notificationCenter.uiEnabled';
export const NOTIFICATION_CENTER_UI_ENABLED_DEFAULT = false;

/**
 * Registry types keyed by `<namespace>.<typeId>`, mapped to their LaunchDarkly flag key. Only
 * types that declare a `feature_flag` are gated; a type with no entry always passes.
 *
 * Gating a new type takes two edits: add `feature_flag` to its registry entry, and add the
 * matching flag definition to the external `elastic/kibana-feature-flags` repository.
 */
const buildNotificationTypeFlags = (): Record<string, string> => {
  const entries: Array<[string, string]> = [];
  for (const [namespace, definition] of Object.entries(NOTIFICATION_REGISTRY)) {
    for (const [typeId, { feature_flag: featureFlag }] of Object.entries(definition.types)) {
      if (featureFlag !== undefined) {
        entries.push([joinNotificationTypeId(namespace, typeId), featureFlag]);
      }
    }
  }
  return Object.fromEntries(entries);
};

export const NOTIFICATION_TYPE_FLAGS: Partial<Record<string, string>> =
  buildNotificationTypeFlags();

/**
 * Per-type flags are off by default if no value is found in LaunchDarkly
 */
export const NOTIFICATION_TYPE_ENABLED_DEFAULT = false;
