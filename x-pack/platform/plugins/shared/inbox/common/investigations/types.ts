/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Provisional Daybreak proposal envelope — stored on the Agent Builder Conversation
 * (`state.daybreak_proposal` + evidence attachment). Validated by the POC, not final #17942.
 */
export interface ProposalEnvelope {
  title: string;
  summary: string;
  severity: string;
  status: string;
  recommended_action?: string;
  confidence?: number;
  source_watch_id: string;
  watch_execution_id: string;
  evidence_ref?: string[];
}

/**
 * Investigation row projected for the Daybreak queue (Conversation + Watch provenance).
 */
export interface Investigation {
  conversation_id: string;
  title: string;
  /** Conversation-level round status when queryable. */
  status?: string;
  severity?: string;
  proposal_status?: string;
  summary?: string;
  confidence?: number;
  recommended_action?: string;
  source_watch_id: string;
  watch_execution_id: string;
  evidence_ref?: string[];
  created_at: string;
  updated_at: string;
  read?: boolean;
}

export interface ListInvestigationsResponse {
  investigations: Investigation[];
  /** Fields the queue can sort/filter on today (Conversation top-level columns). */
  queryable_fields: string[];
  /** Envelope fields stored but not aggregatable/filterable today. */
  non_queryable_fields: string[];
}

/** Detail payload for the investigation flyout (state + attachments from ES). */
export interface InvestigationDetail {
  investigation: Investigation;
  state?: Record<string, unknown>;
  attachments?: Array<Record<string, unknown>>;
}
