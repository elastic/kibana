/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { UpdateCaseRequest as UpdateCaseRequestSchema } from '../../bundled-types.gen';
import { CasesStepBaseConfigSchema, CasesStepSingleCaseOutputSchema } from './shared';
import * as i18n from '../translations';

export const CreateCaseFromTemplateStepTypeId = 'cases.createCaseFromTemplate';

const OverwritesSchema = UpdateCaseRequestSchema.shape.cases.element.omit({
  id: true,
  version: true,
});

const InputSchema = z.object({
  case_template_id: z.string().min(1, 'case_template_id is required'),
  overwrites: OverwritesSchema.optional(),
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

const ConfigSchema = CasesStepBaseConfigSchema;

type CreateCaseFromTemplateStepInputSchema = typeof InputSchema;
type CreateCaseFromTemplateStepOutputSchema = typeof OutputSchema;

export type CreateCaseFromTemplateStepInput = z.infer<typeof InputSchema>;
export type CreateCaseFromTemplateStepOutput = z.infer<typeof OutputSchema>;
export type CreateCaseFromTemplateStepConfig = z.infer<typeof ConfigSchema>;

export const createCaseFromTemplateStepCommonDefinition: CommonStepDefinition<
  CreateCaseFromTemplateStepInputSchema,
  CreateCaseFromTemplateStepOutputSchema
> = {
  id: CreateCaseFromTemplateStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.CREATE_CASE_FROM_TEMPLATE_STEP_LABEL,
  description: i18n.CREATE_CASE_FROM_TEMPLATE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.CREATE_CASE_FROM_TEMPLATE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Create case from template
\`\`\`yaml
- name: create_case_from_template
  type: ${CreateCaseFromTemplateStepTypeId}
  with:
    case_template_id: "triage_template"
\`\`\``,
      `## Create case from template with overwrites
\`\`\`yaml
- name: create_case_from_template_with_overwrites
  type: ${CreateCaseFromTemplateStepTypeId}
  with:
    case_template_id: "triage_template"
    overwrites:
      title: "Template based case title"
      severity: "high"
      status: "in-progress"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
