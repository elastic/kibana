/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';

/** Domain rule snapshot persisted as `object.snapshot` (API response minus SO OCC token). */
export type RuleChangesHistorySnapshot = Omit<RuleResponse, 'version'>;

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
  /** Domain rule (API response), not SO attributes. */
  snapshot: RuleChangesHistorySnapshot;
  /** Monotonic rule sequence; persisted as `object.sequence`. */
  sequence: number;
}

/** ECS `event.type` categorization for a rule change. */
export type RuleChangesHistoryEventType = 'creation' | 'change' | 'deletion';

export interface LogRuleChangesParams {
  spaceId: string;
  author: RuleChangesHistoryAuthor;
  entries: RuleChangesHistoryEntry[];
  action: string;
  timestamp?: string | number | Date;
  /** ECS `event.type`. Defaults to `change` when omitted. */
  eventType?: RuleChangesHistoryEventType;
  /** Shared id linking entries written by the same (bulk) operation. */
  correlationId?: string;
}
