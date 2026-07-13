/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { sigEventBaseSchema } from '../common_schemas';
import { MAX_TEXT_LENGTH, MAX_ID_LENGTH } from '../constants';

export const SIGNIFICANT_EVENT_STATUS_OPTIONS = [
  'promoted',
  'acknowledged',
  'demoted',
  'resolved',
  'closed',
] as const;

export const significantEventStatusSchema = z
  .enum(SIGNIFICANT_EVENT_STATUS_OPTIONS)
  .describe(
    '"promoted" for actionable incidents, "acknowledged" for known and actively tracked events, ' +
      '"demoted" for false positives, "resolved" for closed incidents.'
  );
export type SignificantEventStatus = z.infer<typeof significantEventStatusSchema>;

/**
 * One investigation run attached to this significant event.
 * `workflow_execution_id` is the investigation workflow execution id, used to fetch the full
 * investigation state (hypotheses, conclusion, etc.) from the corresponding workflow execution —
 * that workflow execution document is the single source of truth for the investigation's content,
 * so this entry intentionally carries no status of its own. The investigation is running while
 * `completed_at` is absent.
 */
export const significantEventInvestigationSchema = z.object({
  workflow_execution_id: z.string().max(MAX_ID_LENGTH),
  started_at: z.iso.datetime({ offset: true }),
  completed_at: z.iso.datetime({ offset: true }).optional(),
});
export type SignificantEventInvestigation = z.infer<typeof significantEventInvestigationSchema>;

export const significantEventSchema = sigEventBaseSchema.extend({
  '@timestamp': z.iso.datetime({ offset: true }),
  created_at: z.iso.datetime({ offset: true }),
  event_id: z.string().max(MAX_ID_LENGTH),
  discovery_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('ID of the discovery episode this event was promoted from.'),
  previous_event_id: z.string().max(MAX_ID_LENGTH).optional(),
  status: significantEventStatusSchema,
  recommendations: z
    .array(z.string().max(1000))
    .max(50)
    .describe(
      '3 stop-the-bleeding actions ranked by likelihood of stopping user impact, most reversible first.'
    ),
  assessment_note: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe(
      'Free-text note from the analyst or agent that assessed this event. ' +
        'Use to capture investigation rationale, ambiguities, or caveats not covered by other fields.'
    ),
  investigations: z.array(significantEventInvestigationSchema).max(100).optional(),
});

export type SignificantEvent = z.infer<typeof significantEventSchema>;
