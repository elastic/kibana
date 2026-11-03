/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z, isoDateTime } from '@kbn/zod/v4';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import dedent from 'dedent';
import { significantEventBaseSchema } from '../common_schemas';
import {
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
  ASSESSMENT_NOTE_ROLE_RULE,
  NO_RAW_SENSITIVE_VALUES_RULE,
} from '../constants';

export const SIGNIFICANT_EVENT_STATUS_OPTIONS = [
  ALERT_EPISODE_STATUS.ACTIVE,
  ALERT_EPISODE_STATUS.RECOVERING,
  ALERT_EPISODE_STATUS.INACTIVE,
] as const satisfies readonly AlertEpisodeStatus[];

export const significantEventStatusSchema = lazySchema(() =>
  z.enum(SIGNIFICANT_EVENT_STATUS_OPTIONS).describe(dedent`
      "${ALERT_EPISODE_STATUS.ACTIVE}" = a current failure, material degradation, or sensitive-data exposure is confirmed or remains plausibly unverified. A mechanism found at an unchanged background rate (rate-flat inconclusive) is verified as not newly elevated — it is not "plausibly unverified" and must not create a new event;
      "${ALERT_EPISODE_STATUS.RECOVERING}" = derived, never set by a caller: entered when every member rule was last judged healthy, from "active" only: an event is never opened "recovering". It stays until a breach in any member returns it to "${ALERT_EPISODE_STATUS.ACTIVE}" in the same episode, an operator deactivates it, or its rule is deleted;
      "${ALERT_EPISODE_STATUS.INACTIVE}" = the event is no longer active: every confirming signal on it has been re-checked and cleared; an event is never opened "${ALERT_EPISODE_STATUS.INACTIVE}" or "${ALERT_EPISODE_STATUS.RECOVERING}". A healthy result from one rule never closes signals it did not check; while any confirming signal on the event is unresolved, it stays "${ALERT_EPISODE_STATUS.ACTIVE}". Record the recovery, false-alarm, benign-change, or other assessment rationale in "assessment_note".
    `)
);

export type SignificantEventStatus = z.infer<typeof significantEventStatusSchema>;

/**
 * Statuses an operator or tool may set by hand. `recovering` is not settable: only the lifecycle
 * state machine writes it (an assessment that every member is healthy, on an active event).
 * Alerting v2 gives operators only `activate` / `deactivate`.
 */
export const SIGNIFICANT_EVENT_MANUAL_STATUS_OPTIONS = [
  ALERT_EPISODE_STATUS.ACTIVE,
  ALERT_EPISODE_STATUS.INACTIVE,
] as const satisfies readonly AlertEpisodeStatus[];

export type SignificantEventManualStatus = (typeof SIGNIFICANT_EVENT_MANUAL_STATUS_OPTIONS)[number];

export const significantEventManualStatusSchema = z
  .enum(SIGNIFICANT_EVENT_MANUAL_STATUS_OPTIONS)
  .describe(
    `"${ALERT_EPISODE_STATUS.ACTIVE}" = a current failure is confirmed or remains plausibly unverified; "${ALERT_EPISODE_STATUS.INACTIVE}" = the event is no longer active (record the rationale in "assessment_note").`
  );

/**
 * Statuses that represent an unresolved / ongoing event. Deduplication uses this set to find a
 * prior event for the same issue so successive write cycles dedup against it — a recovering event
 * is still the live episode, so a re-firing rule continues it instead of creating a duplicate. An
 * inactive issue that recurs should create a fresh event.
 */
export const SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS = [
  ALERT_EPISODE_STATUS.ACTIVE,
  ALERT_EPISODE_STATUS.RECOVERING,
] as const;

/**
 * One investigation run attached to this significant event.
 * `workflow_execution_id` holds the investigation id, which is its Agent Builder conversation id;
 * the shared investigations API (`GET /internal/investigations/investigations/{id}`) is the
 * single source of truth for the investigation's content; this entry records the run's timestamps
 * and terminal outcome. Entries written before investigations were conversations hold a workflow
 * execution id, which that API does not know. The field keeps its name so stored events stay
 * valid.
 */
export const significantEventInvestigationSchema = lazySchema(() =>
  z.object({
    workflow_execution_id: z
      .string()
      .max(MAX_ID_LENGTH)
      .describe('ID of the investigation (its Agent Builder conversation id).'),
    started_at: isoDateTime({ offset: true }).describe('When this investigation run started.'),
    completed_at: isoDateTime({ offset: true })
      .optional()
      .describe(
        'When this investigation run finished. Absent while the investigation is still running.'
      ),
    outcome: z
      .enum(['completed', 'failed'])
      .optional()
      .describe('Terminal outcome of this run. Absent while running or on older attachments.'),
  })
);
export type SignificantEventInvestigation = z.infer<typeof significantEventInvestigationSchema>;

/** Status of a significant event's investigation, as the significant events API reports it. */
export type InvestigationRunStatus = 'pending' | 'complete' | 'failed' | 'unavailable';

export const significantEventSchema = lazySchema(() =>
  significantEventBaseSchema.extend({
    '@timestamp': isoDateTime({ offset: true }),
    status: significantEventStatusSchema,
    assessment_note: z
      .string()
      .max(MAX_TEXT_LENGTH)
      .optional()
      .describe(
        dedent`
        Rationale for this assessment: why this severity, what was ruled out, and why this confidence.
        ${ASSESSMENT_NOTE_ROLE_RULE}
        Good: "High: checkout fails 18.5% of attempts and the ledger write path is blocked, meeting the high condition. Payment retries were ruled out; breadth across regions is unmeasured. Confidence is 70.0% because the mechanism is corroborated by one source." Bad: "Draft: the error shows connection refused... let me revise: summarizing the logs again."

        ${NO_RAW_SENSITIVE_VALUES_RULE}
        `
      ),
    investigations: z.array(significantEventInvestigationSchema).max(100).optional(),
  })
);

export type SignificantEvent = z.infer<typeof significantEventSchema>;

/**
 * Read/API event model returned by list and lifecycle endpoints. `created_at` is the earliest
 * retained lineage `@timestamp` (computed at read time) and is intentionally not part of the
 * stored Significant Event write schema.
 */
export interface SignificantEventResponse extends SignificantEvent {
  created_at: string;
}
