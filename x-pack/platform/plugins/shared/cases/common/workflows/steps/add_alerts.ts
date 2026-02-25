/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import {
  CaseResponseProperties as CaseResponsePropertiesSchema,
  Rule,
} from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema } from './shared';

export const AddAlertsStepTypeId = 'cases.addAlerts';

const AlertInputSchema = z.object({
  alertId: z.string().min(1, 'alertId is required'),
  index: z.string().min(1, 'index is required'),
  rule: Rule.optional(),
});

export const InputSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  alerts: z.array(AlertInputSchema).min(1).max(1000),
});

export const OutputSchema = z.object({
  case: CaseResponsePropertiesSchema,
});

export type AddAlertsStepInputSchema = typeof InputSchema;
export type AddAlertsStepOutputSchema = typeof OutputSchema;

export type AddAlertsStepInput = z.infer<typeof InputSchema>;
export type AddAlertsStepOutput = z.infer<typeof OutputSchema>;

export const addAlertsStepCommonDefinition: CommonStepDefinition<
  AddAlertsStepInputSchema,
  AddAlertsStepOutputSchema
> = {
  id: AddAlertsStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
