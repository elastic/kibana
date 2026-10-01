/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTIFICATION_REGISTRY } from './notification_registry';

/**
 * Advanced-settings category the Notification Center registers its rows under. Deliberately not
 * core's `notifications` category, which holds toast and banner lifetimes — an unrelated concept.
 *
 * Mirrors the identifier in `kbn-management/settings/utilities/category/const.ts`, a
 * `shared-browser` package not consumable from plugin server code.
 */
export const NOTIFICATION_CENTER_SETTINGS_CATEGORY = 'notificationCenter';

/** Space-scoped master switch for whether the Notification Center UI renders at all. */
export const NOTIFICATION_CENTER_ENABLED_SETTING = 'notificationCenter:enabled';

/**
 * Registry-derived switches live in one tree whose shape mirrors the type's LaunchDarkly key
 * (`notificationCenter.types.<namespace>.<type>`). A namespace key is the parent of its type keys,
 * the way core's `dateFormat` parents `dateFormat:dow`.
 */
const TYPE_SETTING_PREFIX = 'notificationCenter:types';

/** Space-scoped switch covering every notification type in one registry namespace. */
export const namespaceSettingKey = (namespace: string): string =>
  `${TYPE_SETTING_PREFIX}:${namespace}`;

/** Space-scoped switch for a single registry `(namespace, type)`. */
export const typeSettingKey = (namespace: string, type: string): string =>
  `${namespaceSettingKey(namespace)}:${type}`;

/**
 * Every Notification Center setting is off until launch, when the defaults flip to `true`
 * alongside the `notificationCenter.uiEnabled` deployment flag.
 */
export const NOTIFICATION_CENTER_SETTING_DEFAULT = false;

/** Every key the plugin registers, in the order the settings app lists them. */
export const NOTIFICATION_CENTER_SETTING_KEYS: readonly string[] = [
  NOTIFICATION_CENTER_ENABLED_SETTING,
  ...Object.entries(NOTIFICATION_REGISTRY).flatMap(([namespace, { types }]) => [
    namespaceSettingKey(namespace),
    ...Object.keys(types).map((type) => typeSettingKey(namespace, type)),
  ]),
];
