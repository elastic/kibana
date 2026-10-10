/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import dedent from 'dedent';
import { significantEventBaseSchema } from '../common_schemas';
import {
  ASSESSMENT_NOTE_ROLE_RULE,
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
  NO_RAW_SENSITIVE_VALUES_RULE,
} from '../constants';

export const SIGNIFICANT_EVENT_STATUS_OPTIONS = [
  ALERT_EPISODE_STATUS.ACTIVE,
  ALERT_EPISODE_STATUS.INACTIVE,
] as const satisfies readonly AlertEpisodeStatus[];

export const significantEventStatusSchema = lazySchema(() =>
  z.enum(SIGNIFICANT_EVENT_STATUS_OPTIONS).describe(dedent`
      "${ALERT_EPISODE_STATUS.ACTIVE}" = a current failure, material degradation, or sensitive-data exposure is confirmed or remains plausibly unverified. A mechanism found at an unchanged background rate (rate-flat inconclusive) is verified as not newly elevated — it is not "plausibly unverified" and must not create a new event;
      "${ALERT_EPISODE_STATUS.INACTIVE}" = the event is no longer active. Record the recovery, false-alarm, benign-change, or other assessment rationale in "assessment_note".
    `)
);

export type SignificantEventStatus = z.infer<typeof significantEventStatusSchema>;

/**
 * Statuses that represent an unresolved / ongoing event. Deduplication uses this set to find a
 * prior event for the same issue so successive write cycles dedup against it. An inactive issue
 * that recurs should create a fresh event.
 */
export const SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS = [ALERT_EPISODE_STATUS.ACTIVE] as const;

/**
 * One investigation run attached to this significant event.
 * `workflow_execution_id` is the investigation workflow execution id, used to fetch the full
 * investigation state (hypotheses, conclusion, etc.) from the corresponding workflow execution —
 * that workflow execution document is the single source of truth for the investigation's content,
 * so this entry intentionally carries no status of its own. The investigation is running while
 * `completed_at` is absent.
 */
export const significantEventInvestigationSchema = lazySchema(() =>
  z.object({
    workflow_execution_id: z
      .string()
      .max(MAX_ID_LENGTH)
      .describe('ID of the investigation workflow execution.'),
    started_at: z.iso.datetime({ offset: true }).describe('When this investigation run started.'),
    completed_at: z.iso
      .datetime({ offset: true })
      .optional()
      .describe(
        'When this investigation run finished. Absent while the investigation is still running.'
      ),
  })
);
export type SignificantEventInvestigation = z.infer<typeof significantEventInvestigationSchema>;

export const significantEventSchema = lazySchema(() =>
  significantEventBaseSchema.extend({
    '@timestamp': z.iso.datetime({ offset: true }),
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
