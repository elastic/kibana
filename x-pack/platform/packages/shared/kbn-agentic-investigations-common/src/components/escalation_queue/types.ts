/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Open / closed — mirrors the escalation conversation template's `status` field. */
export type EscalationStatus = 'open' | 'closed';

/**
 * View-model for one escalation row in the queue.
 *
 * The page adapter (`escalation_to_queue_item.ts`) converts the raw
 * `EscalationConversationSummary` API shape into this interface.
 */
export interface EscalationQueueItem {
  /** Escalation conversation id. */
  id: string;
  title: string;
  status: EscalationStatus;
  /** ISO-8601 creation timestamp from `created_at`. */
  createdAt: string;
  /** ISO-8601 last-updated timestamp from `updated_at`. */
  updatedAt: string;
  /** Number of conversation ids in `metadata.linked_investigations`. */
  linkedInvestigationCount: number;
  /** User profile uids from `metadata.assignees`. */
  assigneeUids: readonly string[];
}
