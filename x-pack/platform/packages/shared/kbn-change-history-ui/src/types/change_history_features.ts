/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Product-level feature toggles for change-history UI affordances. */
export interface ChangeHistoryFeatures {
  /**
   * When false, compare preview and row compare actions are hidden.
   * Omitted or true: compare is enabled.
   */
  compare?: boolean;
  /** When true, restore is shown when the adapter implements `restoreChange`. */
  restore?: boolean;
  /**
   * When true, the adapter's `getPendingChange` is used to prepend an unsaved
   * in-editor row and warn on restore.
   */
  unsavedChanges?: boolean;
  /**
   * Opt-out for EBT. Omitted or true: telemetry may fire when the host passes
   * `analytics` and `scope`. Set false to force a no-op reporter.
   */
  telemetry?: boolean;
}

/** Optional privilege hints supplied by the host application. */
export interface ChangeHistoryPermissions {
  /** Must be `true` to enable restore when `features.restore` is on. */
  canRestore?: boolean;
}

/** Resolved capabilities after combining features, adapter, and host gates. */
export interface ChangeHistorySupports {
  compare: boolean;
  restore: boolean;
  unsavedChanges: boolean;
}
