/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_GROUP_SIGNAL_IDS,
  MAX_IMPROVEMENTS_PER_RUN,
  MAX_IMPROVEMENT_RATIONALE_LENGTH,
  MAX_IMPROVEMENT_TITLE_LENGTH,
} from '../constants';
import { kiFieldsSchema, kiPartialFieldsSchema } from '../step_types/ki';
import type { ImprovementAction } from './improvement_actions';
import { IMPROVEMENT_ACTIONS } from './improvement_actions';

/**
 * What an analysis run may say about one proposed change.
 *
 * Everything the store owns is absent by construction: `improvement_id` is a fingerprint the
 * server derives, `status` is always `suggested` on a write, and `provenance` is assembled from
 * the selection the run was handed. A run that could name its own `improvement_id` could collapse
 * two unrelated proposals onto one lineage, or fork one problem across many, and idempotency would
 * stop being a property of the store.
 */
const proposedImprovementShape = {
  title: z
    .string()
    .min(1)
    .max(MAX_IMPROVEMENT_TITLE_LENGTH)
    .describe('A short, specific description of the change being proposed.'),
  rationale: z
    .string()
    .min(1)
    .max(MAX_IMPROVEMENT_RATIONALE_LENGTH)
    .describe(
      'Why the evidence supports this change. Reference what the signals showed, not what might be true in general.'
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('How strongly the evidence supports this change, from 0 to 1.'),
  signal_tags: z
    .array(z.string().min(1).max(256))
    .max(16)
    .optional()
    .describe('Classifier tags of the group this was derived from, e.g. `coverage_gap`.'),
  signal_ids: z
    .array(z.string().min(1).max(1024))
    .min(1)
    .max(MAX_GROUP_SIGNAL_IDS)
    .describe(
      'Ids of the signals that evidence this change, taken from the groups you were given.'
    ),
  target: z
    .object({
      ki_id: z.string().min(1).max(512).optional().describe('The Knowledge Indicator to change.'),
      workflow_id: z.string().min(1).max(1024).optional().describe('The automation to change.'),
      source_value: z
        .string()
        .min(1)
        .max(10240)
        .optional()
        .describe('The existing source to change.'),
      subject: z
        .string()
        .min(1)
        .max(1024)
        .optional()
        .describe(
          'For an `add_*` action: what the addition is about, typically the index or source whose missing coverage it would close.'
        ),
    })
    .optional()
    .describe('What the action operates on. An `add_*` action carries `subject` instead of an id.'),
  payload: z
    .object({
      ki: kiFieldsSchema.optional().describe('For `add_ki`: the document to create.'),
      ki_patch: kiPartialFieldsSchema.optional().describe('For `edit_ki`: the fields to change.'),
      workflow_yaml: z
        .string()
        .max(65536)
        .optional()
        .describe('For `add_workflow` / `edit_workflow`: the workflow definition.'),
      source: z
        .object({
          type: z.enum(['esql', 'connector']),
          value: z.string().min(1).max(10240),
        })
        .optional()
        .describe('For `add_source` / `edit_source`: the source definition.'),
    })
    .optional()
    .describe('The body of the change. Which field applies depends on the action.'),
};

/** The full taxonomy, for callers that do not narrow. */
export const proposedImprovementSchema = z.object({
  action: z.enum(IMPROVEMENT_ACTIONS).describe('The kind of change being proposed.'),
  ...proposedImprovementShape,
});

export type ProposedImprovement = z.infer<typeof proposedImprovementSchema>;

const summaryField = z
  .string()
  .max(MAX_IMPROVEMENT_RATIONALE_LENGTH)
  .optional()
  .describe(
    'What the run found, in one paragraph. Say so plainly when the evidence did not justify any change.'
  );

/**
 * The run's structured output, narrowed to the actions this AI index permits.
 *
 * Narrowing here rather than only in the prompt is the point: an instruction not to propose an
 * action is a request, and the write route rejects what slips through anyway. Narrowing the schema
 * means the model cannot express the out-of-policy action in the first place, so the common case
 * costs a rejection nobody has to review.
 *
 * An empty allow-list is observe-only, and the schema drops the `improvements` array entirely
 * rather than presenting one the run may not fill — `enum: []` is not a valid JSON Schema, and an
 * array the agent is told never to use is an invitation to try.
 */
export const buildImprovementsOutputSchema = (allowedActions: readonly ImprovementAction[]) => {
  if (allowedActions.length === 0) {
    return z.object({ summary: summaryField });
  }

  return z.object({
    summary: summaryField,
    improvements: z
      .array(
        z.object({
          action: z
            .enum(allowedActions as [ImprovementAction, ...ImprovementAction[]])
            .describe('The kind of change being proposed.'),
          ...proposedImprovementShape,
        })
      )
      .max(MAX_IMPROVEMENTS_PER_RUN)
      .describe('The changes worth making. Return an empty array when nothing is worth proposing.'),
  });
};

/**
 * The same schema as JSON Schema, for the `ai.agent` step's `with.schema`.
 *
 * Derived rather than hand-written so the shape the agent is asked for and the shape the write
 * route accepts cannot drift apart. `io: 'input'` because this describes what the model produces.
 */
export const buildImprovementsJsonSchema = (
  allowedActions: readonly ImprovementAction[]
): Record<string, unknown> =>
  z.toJSONSchema(buildImprovementsOutputSchema(allowedActions), {
    io: 'input',
    target: 'draft-7',
    unrepresentable: 'any',
  }) as Record<string, unknown>;
