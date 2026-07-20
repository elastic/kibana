/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOTIFICATION_REGISTRY } from './notification_registry';
import type {
  NotificationKind,
  NotificationNamespaceDefinition,
} from './notification_registry_types';

/** A registered namespace id, e.g. `inference`. */
export type NotificationNamespace = keyof typeof NOTIFICATION_REGISTRY;

/** A registered type id within namespace `N`, e.g. `modelStatus` under `inference`. */
export type NotificationTypeName<N extends NotificationNamespace> =
  keyof (typeof NOTIFICATION_REGISTRY)[N]['types'] & string;

/** The declared {@link NotificationKind} for a `(namespace, type)`, defaulting to `state`. */
export type NotificationKindOf<
  N extends NotificationNamespace,
  T extends NotificationTypeName<N>
> = (typeof NOTIFICATION_REGISTRY)[N]['types'][T] extends {
  kind: infer K extends NotificationKind;
}
  ? K
  : 'state';

/**
 * A valid `(namespace, type)` pair. Adds compile-time type safety to ensure
 * namespaces and types use the NOTIFICATION_REGISTRY as the source of truth.
 */
export type NotificationTypeRef = {
  [N in NotificationNamespace]: {
    namespace: N;
    type: keyof (typeof NOTIFICATION_REGISTRY)[N]['types'] & string;
  };
}[NotificationNamespace];

/** All registered namespace ids, as a non-empty tuple for `z.enum`. */
export const NOTIFICATION_NAMESPACES = Object.keys(NOTIFICATION_REGISTRY) as [
  NotificationNamespace,
  ...NotificationNamespace[]
];

/**
 * Syntactic sugar for plugins to submit specific notification types without worrying about the
 * literal strings already set in the registry.
 * i.e. `NOTIFICATION_TYPES.<namespace>.<type>`, passed to `forType`.
 */
export const NOTIFICATION_TYPES = Object.fromEntries(
  Object.entries(NOTIFICATION_REGISTRY).map(([namespace, definition]) => [
    namespace,
    Object.fromEntries(Object.keys(definition.types).map((type) => [type, { namespace, type }])),
  ])
) as {
  readonly [N in NotificationNamespace]: {
    readonly [T in NotificationTypeName<N>]: { readonly namespace: N; readonly type: T };
  };
};

/**
 * Simple helper to create the id string for a notification type to avoid duplicated logic in other functions.
 */
export const joinNotificationTypeId = (namespace: string, type: string): string =>
  `${namespace}.${type}`;

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

/**
 * Runtime companion to {@link NotificationKindOf}: the declared `kind` for a `(namespace, type)`,
 * defaulting to `state`.
 * This lets us keep the registry as the source of truth to determine how the notification id is built.
 */
export const resolveNotificationKind = (namespace: string, type: string): NotificationKind => {
  const definition = (NOTIFICATION_REGISTRY as Record<string, NotificationNamespaceDefinition>)[
    namespace
  ];
  return definition?.types[type]?.kind ?? 'state';
};
