/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryListItemChanges } from './change_history_list_item_changes';

/** Host-supplied in-editor state shown as the live row before it is saved. */
export interface ChangeHistoryPendingChange {
  /** Stable id for the pending row (must not collide with persisted change ids). */
  id: string;
  /** ISO8601 timestamp for the timeline row. */
  timestamp: string;
  actor: {
    name: string;
    profileId?: string;
  };
  /** Timeline action label (e.g. "Unsaved changes"). */
  action: string;
  /** Domain payload for preview — shape is opaque to the UI package. */
  snapshot: unknown;
  /** Optional diff vs the last committed version. */
  changes?: ChangeHistoryListItemChanges;
}
