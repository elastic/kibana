/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationState, Severity } from '@kbn/significant-events-schema';
import type { InvestigationTriggerType } from './workflows/triggers';

/**
 * Re-exported so consumers of these responses do not need their own dependency on
 * `@kbn/significant-events-schema`. Investigations rate themselves on the same severity tier scale
 * significant events use, so a tier added there widens these responses too.
 */
export type { Severity } from '@kbn/significant-events-schema';

export {
  INVESTIGATION_SUBJECT_TYPES,
  type InvestigationSubjectType,
  INVESTIGATION_TRIGGER_TYPES,
  DEFAULT_INVESTIGATION_TRIGGER_TYPE,
  type InvestigationTriggerType,
} from './workflows/triggers';

/**
 * The alert-facing types are derived from the zod schemas in `./schemas`, so the validation a
 * caller is held to and the type the code is written against cannot disagree.
 */
export type {
  AlertInvestigationContext,
  AlertSnapshot,
  AlertSnapshotEvaluation,
  AlertSnapshotGroup,
  InvestigationContext,
  InvestigationSubject,
} from './schemas';

export {
  alertInvestigationContextSchema,
  alertSnapshotSchema,
  freeFormContextSchema,
  investigationSubjectSchema,
  MAX_ALERTS_PER_INVESTIGATION,
} from './schemas';

import type {
  AlertInvestigationContext,
  InvestigationContext,
  InvestigationSubject,
} from './schemas';

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
  context?: InvestigationContext | AlertInvestigationContext;
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
  /**
   * The conclusion narrative on its own, for a caller that wants the answer and nothing else.
   * Falls back to the summary while no hypothesis is confirmed yet. Also the only output a caller
   * gets when `result` had to be dropped for failing validation.
   */
  conclusion?: string;
  /**
   * The investigation's own severity verdict for the situation it investigated. Absent for runs
   * that are still going, failed, predate the field, or completed without the agent rating one —
   * an absent severity means unrated, never low.
   *
   * Also present inside `result`. It is lifted out for the same reason `conclusion` is: it is read
   * straight off the raw payload, so it survives `result` being dropped for failing validation,
   * and it is the one field the list endpoint carries per row.
   */
  severity?: Severity;
  /**
   * Everything the investigation produced: the hypotheses it considered with the evidence and
   * ES|QL behind each verdict, the gaps it could not see past, and what it recommends doing.
   *
   * This is the same `InvestigationState` the progress-report tool streams while the run is live,
   * so one renderer serves a finished investigation and a running one. Only the list endpoint
   * stays narrow — it omits step runs entirely, because this payload runs to several kilobytes
   * and no list view needs it per row.
   */
  result?: InvestigationState;
  error?: string;
}

export interface InvestigationStatusEvent {
  type: 'investigation_status';
  investigation_id: string;
  status: InvestigationStatus;
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
