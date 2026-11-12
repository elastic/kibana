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
import { MAX_MAINTENANCE_LISTED_CHANGES, maintenanceChangeSchema } from './gather_maintenance';
import { aiIndexIdSchema } from './ki';

export const RECORD_MAINTENANCE_RUN_STEP_ID = 'context-engine.recordMaintenanceRun' as const;

export const MAINTENANCE_RUN_MODES = ['report', 'apply', 'dry_run'] as const;

const MAX_RUN_CHANGES = MAX_MAINTENANCE_LISTED_CHANGES * 5;
const countSchema = lazySchema(() => z.number().int().min(0));

export const recordMaintenanceRunInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    mode: z
      .enum(MAINTENANCE_RUN_MODES)
      .describe('report: planned only; apply: written; dry_run: a manual run that wrote nothing'),
    braked: z.boolean().optional().describe('The run stopped before writing'),
    reviewed: countSchema.describe('Facts and entities the model reviewed'),
    written: countSchema.describe('Facts, entities and relationships written, or that would be'),
    changes: z.array(maintenanceChangeSchema).max(MAX_RUN_CHANGES),
    needs_review: z.array(maintenanceChangeSchema).max(MAX_RUN_CHANGES),
    rejected: z.array(rejectedItemSchema).max(MAX_RUN_CHANGES),
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
      defaultMessage: 'Count what a memory maintenance run changed, and report it.',
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
          'Counts the changes of each kind a run made, or would make, and reports the counts ' +
          'as telemetry, without any KI text.',
      }
    ),
  },
};
