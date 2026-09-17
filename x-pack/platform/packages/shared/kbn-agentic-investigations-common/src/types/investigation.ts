/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Brief bucket recommendation for an investigation */
export type RecommendedAction = 'contain' | 'escalate' | 'investigate' | 'tune';

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
  status?: string;
  pendingProposalCount: number;
  recommendedAction?: RecommendedAction;
  /** Primary asset or surface impacted */
  affectedSurface?: string;
  summary?: string;
  /** Brief priority score (0-100) for queue ranking */
  priorityScore?: number;
  /** Durable record label shown in Brief (e.g. CASE-2047) */
  recordId?: string;
  /** Leading proposal CTA label for Brief cards */
  primaryActionLabel?: string;
  events: TimelineEvent[];
}
