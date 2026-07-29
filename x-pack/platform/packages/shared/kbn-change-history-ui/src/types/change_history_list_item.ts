/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryListItemChanges } from './change_history_list_item_changes';

/** List row — intentionally smaller than full change detail. */
export interface ChangeHistoryListItem {
  /** Stable change id (maps to change-history `event.id` when backed by the platform store). */
  id: string;
  /** ISO8601 */
  timestamp: string;
  actor: {
    name: string;
    profileId?: string;
  };
  /** Human-readable action label (domain may map from `event.action`). */
  action: string;
  /** Diff vs the immediate previous version (N-1 → N). Omit when not computed or nothing to show. */
  changes?: ChangeHistoryListItemChanges;
  /** Optional user comment / reason shown on the timeline row when present. */
  comment?: string;
  /** True when this row reflects the entity's current live state. */
  isCurrent?: boolean;
  /** Optional domain tags (e.g. bulk operation, restore). */
  tags?: string[];
  /** Optional opaque metadata for custom row renderers and telemetry.
   *  Consumers may include `version` (number) for version-distance telemetry; not platform-defined. */
  metadata?: Record<string, unknown>;
}
