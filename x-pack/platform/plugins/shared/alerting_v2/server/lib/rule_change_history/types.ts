/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { RuleSavedObjectAttributes } from '../../saved_objects';

/** Scope (module + dataset + object type) used for all rule change history writes. */
export interface RuleChangeHistoryScope {
  module: string;
  dataset: string;
  objectType: string;
}

/** Resolved author of a change, captured at operation time by the `RulesClient`. */
export interface RuleChangeHistoryAuthor {
  uid: string | null;
  username: string | null;
}

/**
 * Post-change rule state persisted as `object.snapshot`. For deletions this may
 * carry a reduced set of attributes (metadata only).
 */
export interface RuleSnapshot {
  attributes: RuleSavedObjectAttributes | Partial<RuleSavedObjectAttributes>;
  references: SavedObjectReference[];
}

/** A single rule change to log. */
export interface RuleChangeHistoryEntry {
  id: string;
  snapshot: RuleSnapshot;
  /** Monotonic rule sequence; persisted as `object.sequence`. */
  sequence?: number;
}

/** ECS `event.type` categorization for a rule change. */
export type RuleChangeHistoryEventType = 'creation' | 'change' | 'deletion';

export interface LogRuleChangesParams {
  spaceId: string;
  author: RuleChangeHistoryAuthor;
  entries: RuleChangeHistoryEntry[];
  action: string;
  timestamp?: string | number | Date;
  metadata?: Record<string, string | number | boolean>;
  /** ECS `event.type`. Defaults to `change` when omitted. */
  eventType?: RuleChangeHistoryEventType;
  /** Shared id linking entries written by the same (bulk) operation. */
  correlationId?: string;
}
