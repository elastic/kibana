/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Display metadata shared by every registry entry (namespace or type). */
export interface NotificationDisplayMetadata {
  /** Human-readable label shown in UI filters and notification detail. */
  display_name: string;
  /** Short explanation of what the entry represents. */
  description: string;
}

/**
 * The nature of a notification type. `state` (default) represents the current state of an
 * entity and these types of notifications get de-duped at query time. `timeseries` is a stream of
 * discrete, timestamped occurrences. Each occurrence creating a new notification for users.
 */
export type NotificationKind = 'state' | 'timeseries';

/** UI-facing definition of one notification type within a namespace. */
export interface NotificationTypeDefinition extends NotificationDisplayMetadata {
  /**
   * Static LaunchDarkly key gating this type. Use this convention:
   * `notificationCenter.types.<namespace>.<typeId>`.
   * Kept as a literal so the feature flag code-ref scanner can discover it.
   * Omit to send this notification type immediately with no gate.
   */
  feature_flag?: string;
  /** Notification nature; defaults to `state` when omitted. */
  kind?: NotificationKind;
}

/** UI-facing definition of a namespace and the types it owns. */
export interface NotificationNamespaceDefinition extends NotificationDisplayMetadata {
  types: Readonly<Record<string, NotificationTypeDefinition>>;
}
