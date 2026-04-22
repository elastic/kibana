/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';

export const PersistFindingsStepTypeId = 'alerting.persistFindings';

const RuleEntrySchema = z.object({
  id: z.string(),
  rule: z.record(z.string(), z.unknown()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const InputSchema = z.object({
  rules: z.array(RuleEntrySchema),
  execution_id: z.string(),
  space_id: z.string(),
});

export const OutputSchema = z.object({
  persisted: z.number(),
  dropped: z.number(),
});

export type PersistFindingsInput = z.infer<typeof InputSchema>;
export type PersistFindingsOutput = z.infer<typeof OutputSchema>;

export const persistFindingsCommonDefinition: CommonStepDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  id: PersistFindingsStepTypeId,
  label: 'Persist Findings',
  description:
    'Validates each finding against the finding document schema and indexes valid findings into Elasticsearch, dropping invalid ones',
  category: StepCategory.Data,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
