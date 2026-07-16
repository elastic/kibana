/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Scope (module + dataset + object type) used for all rule changes history writes. */
export interface RuleChangesHistoryScope {
  module: string;
  dataset: string;
  objectType: string;
}

/** Resolved author of a change, captured at operation time by the subscriber. */
export interface RuleChangesHistoryAuthor {
  uid: string | null;
  username: string | null;
}

/** A single rule change to log. */
export interface RuleChangesHistoryEntry {
  id: string;
  /**
   * Post-change object state persisted as `object.snapshot`. Callers pass the
   * domain rule (API response shape); kept generic so change history stays
   * agnostic of the rule schema.
   */
  snapshot: Record<string, unknown>;
  /** Monotonic rule sequence; persisted as `object.sequence`. */
  sequence?: number;
}

/** ECS `event.type` categorization for a rule change. */
export type RuleChangesHistoryEventType = 'creation' | 'change' | 'deletion';

export interface LogRuleChangesParams {
  spaceId: string;
  author: RuleChangesHistoryAuthor;
  entries: RuleChangesHistoryEntry[];
  action: string;
  timestamp?: string | number | Date;
  metadata?: Record<string, string | number | boolean>;
  /** ECS `event.type`. Defaults to `change` when omitted. */
  eventType?: RuleChangesHistoryEventType;
  /** Shared id linking entries written by the same (bulk) operation. */
  correlationId?: string;
}
