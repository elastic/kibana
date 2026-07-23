/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { significantEventBaseSchema } from '../common_schemas';
import { MAX_TEXT_LENGTH, MAX_ID_LENGTH, NO_RAW_SENSITIVE_VALUES_RULE } from '../constants';

export const SIGNIFICANT_EVENT_STATUS_OPTIONS = ['open', 'closed', 'dismissed'] as const;

export const significantEventStatusSchema = z.enum(SIGNIFICANT_EVENT_STATUS_OPTIONS)
  .describe(dedent`
    "open" = incident is active and being tracked;
    "closed" = incident is confirmed resolved;
    "dismissed" = severity is low AND confidence is also low — too few corroborating signals to trust the finding.
  `);

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
});
export type SignificantEventInvestigation = z.infer<typeof significantEventInvestigationSchema>;

export const significantEventSchema = significantEventBaseSchema.extend({
  '@timestamp': z.iso.datetime({ offset: true }),
  event_uuid: z.string().max(MAX_ID_LENGTH).describe('Unique ID of an event.'),
  discovery_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('ID of the discovery document this event was derived from.'),
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
        Free-text note from the analyst or agent that assessed this event. Use to capture investigation rationale, ambiguities, or caveats not covered by other fields.
        
        ${NO_RAW_SENSITIVE_VALUES_RULE}
      `
    ),
  investigations: z.array(significantEventInvestigationSchema).max(100).optional(),
});

export type SignificantEvent = z.infer<typeof significantEventSchema>;
