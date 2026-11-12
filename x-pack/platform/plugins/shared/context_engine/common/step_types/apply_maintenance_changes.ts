/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { MAX_KI_CONTENT_LENGTH } from '../constants';
import { rejectedItemSchema } from './apply_dream_changes';
import {
  MAINTENANCE_BATCH_SIZE,
  MAX_MAINTENANCE_LISTED_CHANGES,
  maintenanceBatchSchema,
  maintenanceChangeSchema,
} from './gather_maintenance';
import {
  aiIndexIdSchema,
  MAX_KI_DESCRIPTION_LENGTH,
  MAX_KI_ID_LENGTH,
  MAX_KI_TITLE_LENGTH,
} from './ki';

export const APPLY_MAINTENANCE_CHANGES_STEP_ID = 'context-engine.applyMaintenanceChanges' as const;

const MAX_CHANGES = MAINTENANCE_BATCH_SIZE * 5;
const MAX_REASON_LENGTH = 1024;

const idSchema = lazySchema(() => z.string().min(1).max(MAX_KI_ID_LENGTH));
const reasonSchema = lazySchema(() => z.string().max(MAX_REASON_LENGTH));
const titleSchema = lazySchema(() => z.string().min(1).max(MAX_KI_TITLE_LENGTH));
const descriptionSchema = lazySchema(() => z.string().min(1).max(MAX_KI_DESCRIPTION_LENGTH));
const contentSchema = lazySchema(() => z.string().min(1).max(MAX_KI_CONTENT_LENGTH));

/** The changes the maintenance model proposes for one batch. */
export const maintenanceChangeSetSchema = lazySchema(() =>
  z.object({
    merges: z
      .array(
        z.object({
          survivor: idSchema,
          absorbed: z.array(idSchema).min(1).max(MAINTENANCE_BATCH_SIZE),
          title: titleSchema.optional(),
          description: descriptionSchema.optional(),
          content: contentSchema.optional(),
          reason: reasonSchema,
        })
      )
      .max(MAX_CHANGES)
      .default([]),
    contradictions: z
      .array(
        z.object({
          ids: z.tuple([idSchema, idSchema]),
          label: z.enum(['changed', 'conflict']),
          content: contentSchema
            .optional()
            .describe('With changed: what the newer fact says, now that it replaces the older'),
          reason: reasonSchema,
        })
      )
      .max(MAX_CHANGES)
      .default([]),
    rewrites: z
      .array(
        z.object({
          id: idSchema,
          title: titleSchema.optional(),
          content: contentSchema,
          reason: reasonSchema,
        })
      )
      .max(MAX_CHANGES)
      .default([]),
    summaries: z
      .array(
        z.object({
          id: idSchema,
          description: descriptionSchema.optional(),
          content: contentSchema,
          reason: reasonSchema,
        })
      )
      .max(MAX_CHANGES)
      .default([]),
    relationships: z
      .array(z.object({ id: idSchema, reason: reasonSchema }))
      .max(MAX_CHANGES * 5)
      .default([])
      .describe('Relationships to remove: duplicates, and inverses of another one'),
  })
);

export type MaintenanceChangeSet = z.infer<typeof maintenanceChangeSetSchema>;

export const applyMaintenanceChangesInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    batch: maintenanceBatchSchema
      .optional()
      .describe('The batch the model reviewed, as gathered. Changes may only touch its items'),
    changes: maintenanceChangeSetSchema
      .optional()
      .describe('The changes the maintenance model returned for the batch'),
    fixes: z
      .array(maintenanceChangeSchema)
      .max(MAX_MAINTENANCE_LISTED_CHANGES)
      .optional()
      .describe('The fixes the gather step listed: items and relationships to tombstone'),
    plan_only: z
      .boolean()
      .optional()
      .describe('Check and resolve the changes and report what they would do, without writing'),
  })
);

export const applyMaintenanceChangesOutputSchema = lazySchema(() =>
  z.object({
    written: z.number().describe('Facts, entities and relationships written'),
    tombstones: z.number().describe('Facts and entities tombstoned'),
    changes: z.array(maintenanceChangeSchema).describe('What changed, each with why'),
    needs_review: z
      .array(maintenanceChangeSchema)
      .describe('Changes not made because a person must decide, each with why'),
    rejected: z.array(rejectedItemSchema).describe('Changes that broke a rule, each with why'),
    plans: z
      .array(z.object({ batch: maintenanceBatchSchema, changes: maintenanceChangeSetSchema }))
      .max(1)
      .optional()
      .describe(
        'With plan_only and a batch: the batch and its changes, to pass back to apply them'
      ),
  })
);

export type ApplyMaintenanceChangesOutput = z.infer<typeof applyMaintenanceChangesOutputSchema>;

export const applyMaintenanceChangesStepCommonDefinition: CommonStepDefinition<
  typeof applyMaintenanceChangesInputSchema,
  typeof applyMaintenanceChangesOutputSchema
> = {
  id: APPLY_MAINTENANCE_CHANGES_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.applyMaintenanceChanges.label', {
    defaultMessage: 'Apply memory maintenance changes',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.applyMaintenanceChanges.description',
    {
      defaultMessage:
        'Merge duplicates, settle contradictions, rewrite and summarize facts and entities, and remove relationships in an AI index.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: applyMaintenanceChangesInputSchema,
  outputSchema: applyMaintenanceChangesOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.applyMaintenanceChanges.documentation.details',
      {
        defaultMessage:
          'A merge keeps one item, adds the memories and sightings of the others to it with a ' +
          'supersedes reference to each, moves their relationships to it and tombstones them. ' +
          'Two contradicting facts that were true at different times are merged into the newer ' +
          'one; two that conflict keep the one seen last, and the other is tombstoned. Items a ' +
          'person edited keep their text and are never tombstoned; a change that would need ' +
          'either is listed for review. Every item must belong to the batch and its audience. ' +
          'With plan_only, nothing is written.',
      }
    ),
  },
};
