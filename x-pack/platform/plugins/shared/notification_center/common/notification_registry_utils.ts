/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTIFICATION_REGISTRY } from './notification_registry';
import type { NotificationNamespaceDefinition } from './notification_registry_types';

/** A registered namespace id, e.g. `inference`. */
export type NotificationNamespace = keyof typeof NOTIFICATION_REGISTRY;

/**
 * A valid `(namespace, type)` pair. The mapped type binds each namespace to only
 * its own types, so `{ namespace: 'inference', type: 'modelStatus' }` is assignable
 * but a type from another namespace is not.
 */
export type NotificationTypeRef = {
  [N in NotificationNamespace]: {
    namespace: N;
    type: keyof (typeof NOTIFICATION_REGISTRY)[N]['types'] & string;
  };
}[NotificationNamespace];

/**
 * Serialized string representation of a notification type, `<namespace>.<typeId>`.
 * The string form of a {@link NotificationTypeRef}.
 */
export type NotificationTypeId = {
  [N in NotificationNamespace]: `${N & string}.${keyof (typeof NOTIFICATION_REGISTRY)[N]['types'] &
    string}`;
}[NotificationNamespace];

/** All registered namespace ids, as a non-empty tuple for `z.enum`. */
export const NOTIFICATION_NAMESPACES = Object.keys(NOTIFICATION_REGISTRY) as [
  NotificationNamespace,
  ...NotificationNamespace[]
];

/**
 * Flatten a namespace/type pair to its serialized string `<namespace>.<typeId>`.
 * Callers must pass a pair that's been added to the {@link NOTIFICATION_REGISTRY}.
 */
export const notificationTypeId = (namespace: string, type: string): NotificationTypeId =>
  `${namespace}.${type}` as NotificationTypeId;

/** True when `type` is registered under `namespace`.*/
export const isRegisteredNotificationRef = (namespace: string, type: string): boolean => {
  if (!Object.hasOwn(NOTIFICATION_REGISTRY, namespace)) {
    return false;
  }
  const { types } = (NOTIFICATION_REGISTRY as Record<string, NotificationNamespaceDefinition>)[
    namespace
  ];
  return Object.hasOwn(types, type);
};
