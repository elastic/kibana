/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Feature flag definitions used by the Notification Center plugin.
 */

/**
 * Master gate for everything user-visible in the Notification Center UI. Off
 * by default. Individual notification types are gated separately (see the
 * per-type flag strategy below) — this flag turns the surface itself on/off.
 */
export const NOTIFICATION_CENTER_UI_ENABLED_FLAG = 'notificationCenter.uiEnabled';
export const NOTIFICATION_CENTER_UI_ENABLED_DEFAULT = false;

/**
 * Per-notification-type flag strategy.
 *
 * Each notification type is gated by its own boolean feature flag rather than a
 * single list, so the Feature Flags service can roll a type out independently
 * (percentage rollout, per-customer targeting, …).
 *
 * Flag keys are **static string literals declared in {@link NOTIFICATION_TYPE_FLAGS}**,
 * never derived at runtime. The complete set must be knowable from static
 * analysis so the keys can be defined up front via GitOps in the external
 * `elastic/kibana-feature-flags` repo and picked up by the flag code-references
 * scanner.
 */

/**
 * Static registry mapping each notification type id to its literal feature-flag
 * key. Registering a type is two edits: add its `<typeId>: '<literal key>'`
 * entry here, and add the matching flag definition as a YAML file in the
 * external `elastic/kibana-feature-flags` repository (GitOps).
 *
 * By convention a key is `notificationCenter.types.<typeId>`
 */
export const NOTIFICATION_TYPE_FLAGS = {
  modelStatus: 'notificationCenter.types.modelStatus',
} as const;

/**
 * Union of registered notification type ids, derived from the registry so it
 * stays in lock-step with the declared keys. `never` until the first type is
 * added to {@link NOTIFICATION_TYPE_FLAGS}.
 */
export type NotificationTypeId = keyof typeof NOTIFICATION_TYPE_FLAGS;

/**
 * Per-type flags are off by default: a notification type is dark until its flag
 * is explicitly turned on for a deployment.
 */
export const NOTIFICATION_TYPE_ENABLED_DEFAULT = false;
