/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { significantEventBaseSchema, type Severity } from '../common_schemas';
import {
  ASSESSMENT_NOTE_ROLE_RULE,
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
  NO_RAW_SENSITIVE_VALUES_RULE,
} from '../constants';

export const SIGNIFICANT_EVENT_STATUS_OPTIONS = ['open', 'closed', 'dismissed'] as const;

export const significantEventStatusSchema = z.enum(SIGNIFICANT_EVENT_STATUS_OPTIONS)
  .describe(dedent`
    "open" = a current failure, material degradation, or sensitive-data exposure is confirmed or remains plausibly unverified. A mechanism found at an unchanged background rate (rate-flat inconclusive) is verified as not newly elevated — it is not "plausibly unverified" and must not open a new event;
    "closed" = a failure condition is confirmed recovered;
    "dismissed" = the proposed incident is a false alarm, benign/positive change, unrelated finding, a background pattern at its usual rate, or is not confirmed by evidence, with no plausible failure, degradation, or exposure left unverified.
  `);

export type SignificantEventStatus = z.infer<typeof significantEventStatusSchema>;

/**
 * Statuses that represent an unresolved / ongoing event. Deduplication uses this set to find a
 * prior event for the same issue so successive write cycles dedup against it. "closed" and
 * "dismissed" are excluded — a recovered or dismissed issue that recurs should open a fresh event.
 */
export const SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS = ['open'] as const;

/**
 * One investigation run attached to this significant event.
 * `workflow_execution_id` holds the investigation id, which is its Agent Builder conversation id;
 * the shared investigations API (`GET /internal/investigations/investigations/{id}`) is the
 * single source of truth for the investigation's content, so this entry intentionally carries no
 * status of its own. Entries written before investigations were conversations hold a workflow
 * execution id, which that API does not know. The field keeps its name so stored events stay
 * valid.
 */
export const significantEventInvestigationSchema = z.object({
  workflow_execution_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('ID of the investigation (its Agent Builder conversation id).'),
  started_at: z.iso.datetime({ offset: true }).describe('When this investigation run started.'),
  completed_at: z.iso
    .datetime({ offset: true })
    .optional()
    .describe(
      'When this investigation run finished. Absent while the investigation is still running.'
    ),
});
export type SignificantEventInvestigation = z.infer<typeof significantEventInvestigationSchema>;

/** Status of a significant event's investigation, as the significant events API reports it. */
export type InvestigationRunStatus = 'pending' | 'complete' | 'failed' | 'unavailable';

export const significantEventSchema = significantEventBaseSchema.extend({
  '@timestamp': z.iso.datetime({ offset: true }),
  event_uuid: z.string().max(MAX_ID_LENGTH).describe('Unique ID of an event.'),
  previous_event_uuid: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('event_uuid of the original event that this event was derived from.'),
  status: significantEventStatusSchema,
  assessment_note: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe(
      dedent`
        Concise rationale for this assessment. Max ${MAX_ASSESSMENT_NOTE_LENGTH} chars.
        ${ASSESSMENT_NOTE_ROLE_RULE}
        Record the reasoning, ambiguity, or caveat that is not already in the title, symptom_hypothesis, summary, or signal descriptions. Do not restate the observed condition, error signature, impact, query steps, or detection artifacts.

        ${NO_RAW_SENSITIVE_VALUES_RULE}
      `
    ),
  investigations: z.array(significantEventInvestigationSchema).max(100).optional(),
});

export type SignificantEvent = z.infer<typeof significantEventSchema>;

/**
 * Read/API event model returned by list and lifecycle endpoints. `created_at` is the earliest
 * retained lineage `@timestamp` (computed at read time) and is intentionally not part of the
 * stored Significant Event write schema.
 */
export interface SignificantEventResponse extends SignificantEvent {
  created_at: string;
}

/**
 * Maps SignificantEvent severity to the alerting v2 severity vocabulary.
 * Typed as `Record<Severity, ...>` so a new Severity value causes a compile error here.
 */
export const SIGNIFICANT_EVENTS_SEVERITY_MAP: Record<
  Severity,
  'critical' | 'high' | 'medium' | 'low'
> = {
  '80-critical': 'critical',
  '60-high': 'high',
  '40-medium': 'medium',
  '20-low': 'low',
};

/**
 * Maps SignificantEvent status to the alerting v2 alert_status vocabulary.
 * `closed` and `dismissed` are both inactive by decision — they are indistinguishable
 * in `.rule-events`; the reason lives in `data.assessment_note`.
 * Typed as `Record<SignificantEventStatus, ...>` so a new status value causes a compile error here.
 */
export const SIGNIFICANT_EVENTS_STATUS_MAP: Record<SignificantEventStatus, 'active' | 'inactive'> =
  {
    open: 'active',
    closed: 'inactive',
    dismissed: 'inactive',
  };
