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
import { rejectedItemSchema } from './apply_dream_changes';
import {
  MAX_MAINTENANCE_BATCHES,
  MAX_MAINTENANCE_LISTED_CHANGES,
  MAX_MAINTENANCE_RETRY_IDS,
  maintenanceChangeSchema,
  maintenanceHeldBackSchema,
} from './gather_maintenance';
import { aiIndexIdSchema, MAX_KI_ID_LENGTH } from './ki';

export const RECORD_MAINTENANCE_RUN_STEP_ID = 'context-engine.recordMaintenanceRun' as const;

export const MAINTENANCE_RUN_MODES = ['report', 'apply', 'dry_run'] as const;

const MAX_RUN_CHANGES = MAX_MAINTENANCE_LISTED_CHANGES * 5;
const MAX_HELD_BACK = MAX_MAINTENANCE_BATCHES + 2;
const countSchema = lazySchema(() => z.number().int().min(0));
const idSchema = lazySchema(() => z.string().max(MAX_KI_ID_LENGTH));

export const recordMaintenanceRunInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    mode: z
      .enum(MAINTENANCE_RUN_MODES)
      .describe('report: planned only; apply: written; dry_run: a manual run that wrote nothing'),
    reviewed: countSchema.describe('Facts and entities the model reviewed'),
    written: countSchema.describe('Facts, entities and relationships written, or that would be'),
    changes: z.array(maintenanceChangeSchema).max(MAX_RUN_CHANGES),
    needs_review: z.array(maintenanceChangeSchema).max(MAX_RUN_CHANGES),
    rejected: z.array(rejectedItemSchema).max(MAX_RUN_CHANGES),
    model_written: countSchema
      .optional()
      .describe('What the model changes wrote, or would; not counted in written'),
    model_changes: z
      .array(maintenanceChangeSchema)
      .max(MAX_RUN_CHANGES)
      .optional()
      .describe('The changes the model proposed, made or planned; not listed in changes'),
    model_needs_review: z.array(maintenanceChangeSchema).max(MAX_RUN_CHANGES).optional(),
    max_model_removals: countSchema
      .optional()
      .describe('Over this many removals, none of the model changes are made'),
    held_back: z
      .array(maintenanceHeldBackSchema)
      .max(MAX_HELD_BACK)
      .optional()
      .describe('Changes already held back, each group with why'),
    retried: z
      .array(idSchema)
      .max(MAX_MAINTENANCE_RETRY_IDS)
      .optional()
      .describe('Items this run reviewed again after the last run held them back'),
  })
);

export const recordMaintenanceRunOutputSchema = lazySchema(() =>
  z.object({
    reviewed: z.number(),
    written: z.number(),
    merged: z.number(),
    superseded: z.number(),
    rewritten: z.number(),
    summarized: z.number(),
    tombstoned: z.number(),
    needs_review: z.number(),
    rejected: z.number(),
    held_back: z.number().describe('Changes held back because there were too many removals'),
    changes: z
      .array(maintenanceChangeSchema)
      .describe('What changed, or would, and what is left for a person, each with why'),
    held_back_changes: z
      .array(maintenanceHeldBackSchema)
      .describe('The changes held back, each group with why'),
    held_back_ids: z
      .array(idSchema)
      .max(MAX_MAINTENANCE_RETRY_IDS)
      .describe('Items for the next run to review again; those held back twice are left out'),
  })
);

export type RecordMaintenanceRunOutput = z.infer<typeof recordMaintenanceRunOutputSchema>;

export const recordMaintenanceRunStepCommonDefinition: CommonStepDefinition<
  typeof recordMaintenanceRunInputSchema,
  typeof recordMaintenanceRunOutputSchema
> = {
  id: RECORD_MAINTENANCE_RUN_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.recordMaintenanceRun.label', {
    defaultMessage: 'Record a memory maintenance run',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.recordMaintenanceRun.description',
    {
      defaultMessage: 'Count what a memory maintenance run changed, and what it held back.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: recordMaintenanceRunInputSchema,
  outputSchema: recordMaintenanceRunOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.recordMaintenanceRun.documentation.details',
      {
        defaultMessage:
          'Counts the changes of each kind a run made, or would make. When the model ' +
          'changes would remove more items than the run may, none of them count as made: ' +
          'they are held back. Lists the held-back items for the next run to review again, ' +
          'once.',
      }
    ),
  },
};
