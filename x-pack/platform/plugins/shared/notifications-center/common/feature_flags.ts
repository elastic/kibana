/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Feature flag keys for the Notifications Center.
 *
 * The authoritative flag definitions (variations, segmentation rules, and the
 * default variation served per environment) live in the external
 * `elastic/kibana-feature-flags` repository. The in-repo declarations in
 * `server/index.ts` mirror these keys so the flags show up in tooling, and the
 * `*_DEFAULT` constants below are the fallback values every evaluation call
 * passes — they keep the plugin fully dark wherever no provider is attached
 * (self-managed deployments, network-restricted Cloud, tests, etc.).
 */

/**
 * Master gate for everything user-visible in the Notifications Center UI. Off
 * by default. Individual notification types are gated separately (see the
 * per-type flag strategy below) — this flag turns the surface itself on/off.
 */
export const NOTIFICATIONS_CENTER_UI_ENABLED_FLAG = 'notificationsCenter.uiEnabled';
export const NOTIFICATIONS_CENTER_UI_ENABLED_DEFAULT = false;

/**
 * Per-notification-type flag strategy.
 *
 * Each notification type is gated by its own boolean feature flag rather than a
 * single list, so the Feature Flags service can roll a type out independently
 * (percentage rollout, per-customer targeting, …).
 *
 * Flag keys are **static string literals declared in {@link NOTIFICATION_TYPE_FLAGS}**,
 * never derived at runtime. The complete set must be knowable from static
 * analysis so the keys can be created and managed up front in the external
 * provider (LaunchDarkly / the `elastic/kibana-feature-flags` repo) and picked
 * up by the flag code-references scanner. The Notifications Center owns this
 * registry; ingest/render paths look a type's key up here rather than computing
 * it, and consumers never touch the Feature Flags service themselves.
 */

/**
 * Static registry mapping each notification type id to its literal feature-flag
 * key. Empty while the center is a scaffold. Registering a type is two static
 * edits: add its `<typeId>: '<literal key>'` entry here, and add the matching
 * {@link FeatureFlagDefinition} literal to the `featureFlags` export in
 * `server/index.ts`.
 *
 * By convention a key is `notificationsCenter.types.<typeId>`
 */
export const NOTIFICATION_TYPE_FLAGS = {
  modelStatus: 'notificationsCenter.types.modelStatus',
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
