/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';

export const ValidateRulesStepTypeId = 'alerting.validateRules';

const RuleEntrySchema = z.object({
  id: z.string(),
  rule: z.record(z.string(), z.unknown()),
  meta: z.unknown().optional(),
});

export const InputSchema = z.object({
  rules: z.array(RuleEntrySchema),
});

const ColumnSchema = z.object({ name: z.string(), type: z.string() });

export const OutputSchema = z.object({
  validRules: z.array(RuleEntrySchema),
  invalidRules: z.array(RuleEntrySchema),
  fieldSchemas: z.record(z.string(), z.array(ColumnSchema)),
  hasInvalid: z.boolean(),
  validationReport: z.array(
    z.object({
      id: z.string(),
      valid: z.boolean(),
      errors: z.array(z.string()).optional(),
    })
  ),
});

export type ValidateRulesInput = z.infer<typeof InputSchema>;
export type ValidateRulesOutput = z.infer<typeof OutputSchema>;

export const validateRulesCommonDefinition: CommonStepDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  id: ValidateRulesStepTypeId,
  label: 'Validate Rules',
  description:
    'Validates alerting rules against Elasticsearch — checks ES|QL query execution, index pattern existence, and grouping field validity',
  category: StepCategory.Data,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
