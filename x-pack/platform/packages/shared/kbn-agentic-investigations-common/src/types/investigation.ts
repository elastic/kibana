/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Brief bucket recommendation for an investigation */
export type RecommendedAction = 'respond' | 'investigate' | 'configure' | 'closed';

export interface TimelineEvent {
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Event category (e.g. triage, proposal, escalation) */
  type: string;
  summary: string;
  /** User or watch that produced the event */
  actor?: string | null;
}

export interface Investigation {
  id: string;
  template_id: 'investigation';
  title: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
  watch_id: string;
  watch_execution_id: string;
  watch_tier?: string;
  severity?: string;
  assignee?: string | null;
  /** Full list of assignee user-profile uids. Used by the interactive assignee picker in the flyout. */
  assignees: string[];
  status?: string;
  pendingProposalCount: number;
  recommendedAction?: RecommendedAction;
  /**
   * @deprecated Read `entityIds`. Still populated so sample data and the flyout
   * Overview row that only know a single surface keep working.
   */
  affectedSurface?: string;
  /**
   * Opaque entity ids this investigation is about. The landing-page pills and
   * their filter read this list. `affectedSurface` is the deprecated single-value
   * fallback for sample data that has not been hydrated.
   */
  entityIds?: string[];
  summary?: string;
  /** Brief priority score (0-100) for queue ranking */
  priorityScore?: number;
  /** Durable record label shown in Brief (e.g. CASE-2047) */
  recordId?: string;
  /** The underlying Agent Builder conversation id, required for escalation linking. */
  conversationId?: string;
  /** Leading proposal CTA label for Brief cards */
  primaryActionLabel?: string;
  events: TimelineEvent[];
}
