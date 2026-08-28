/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/significant-events-schema';
import type { InvestigationSubjectType, InvestigationTriggerType } from './workflows/triggers';

/**
 * Re-exported so consumers of these responses do not need their own dependency on
 * `@kbn/significant-events-schema`. Investigations deliberately share the significant-event
 * severity scale, so a tier added there widens these responses too.
 */
export type { Severity } from '@kbn/significant-events-schema';

export {
  INVESTIGATION_SUBJECT_TYPES,
  type InvestigationSubjectType,
  INVESTIGATION_TRIGGER_TYPES,
  DEFAULT_INVESTIGATION_TRIGGER_TYPE,
  type InvestigationTriggerType,
} from './workflows/triggers';

export interface InvestigationSubject {
  type: InvestigationSubjectType;
  id: string;
}

export interface InvestigationContext {
  [key: string]: unknown;
}

export interface StartInvestigationRequest {
  subject: InvestigationSubject;
  /**
   * What initiated the investigation. Defaults to "manual" when omitted.
   */
  trigger_type?: InvestigationTriggerType;
  /**
   * Caller-supplied prompt for the investigation agent. Falls back to a generic
   * message derived from the subject when omitted.
   */
  message?: string;
  /**
   * Stream names the investigation should scope its signal search to.
   */
  stream_names?: string[];
  /**
   * Caller-supplied key for concurrency control. Passed to the workflow engine as
   * `concurrency_key`, which maps to `concurrencyGroupKey` in the execution index.
   * Two starts with the same key cancel-and-replace the in-flight run (cancel-in-progress
   * strategy). Use a stable, unique caller-side ID — e.g. the alert _id or event UUID.
   */
  concurrency_key?: string;
  context?: InvestigationContext;
}

export interface StartInvestigationResponse {
  investigation_id: string;
}

export const INVESTIGATION_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

export interface GetInvestigationResponse {
  investigation_id: string;
  /** Undefined for runs initiated without a subject (e.g. a bare manual workflow run). */
  subject?: InvestigationSubject;
  trigger_type?: InvestigationTriggerType;
  status: InvestigationStatus;
  started_at?: string;
  completed_at?: string;
  conclusions?: string;
  /**
   * The investigation's own severity verdict for the situation it investigated. Absent for runs
   * that are still going, failed, predate the field, or completed without the agent rating one —
   * an absent severity means unrated, never low.
   */
  severity?: Severity;
  error?: string;
}

export interface ListInvestigationsRequest {
  statuses?: InvestigationStatus[];
  started_after?: string;
  started_before?: string;
  finished_after?: string;
  finished_before?: string;
  sort_field?: 'created_at' | 'finished_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface ListInvestigationItem {
  investigation_id: string;
  status: InvestigationStatus;
  started_at?: string;
  completed_at?: string;
  /** See {@link GetInvestigationResponse.severity}. */
  severity?: Severity;
  concurrency_key?: string;
  executed_by?: string;
}

export interface ListInvestigationsResponse {
  results: ListInvestigationItem[];
  page: number;
  size: number;
  total: number;
}

export {
  INVESTIGATION_STARTED_TRIGGER_ID,
  INVESTIGATION_COMPLETED_TRIGGER_ID,
  INVESTIGATION_FAILED_TRIGGER_ID,
  type InvestigationsTriggerId,
  type InvestigationsTriggerPayloadMap,
  type InvestigationsTriggerBasePayload,
  type InvestigationCompletedTriggerPayload,
  type InvestigationFailedTriggerPayload,
} from './workflows/triggers';
