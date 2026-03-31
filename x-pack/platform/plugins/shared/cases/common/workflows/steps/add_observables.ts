/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';
import { MAX_OBSERVABLES_PER_CASE } from '../../constants';

export const AddObservablesStepTypeId = 'cases.addObservables';

const ObservableInputSchema = z.object({
  typeKey: z.string().min(1, 'typeKey is required'),
  value: z.string().min(1, 'value is required'),
  description: z.string().nullable().optional(),
});

const InputSchema = CasesStepCaseIdSchema.extend({
  observables: z.array(ObservableInputSchema).min(1).max(MAX_OBSERVABLES_PER_CASE),
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

type AddObservablesStepInputSchema = typeof InputSchema;
type AddObservablesStepOutputSchema = typeof OutputSchema;

export type AddObservablesStepInput = z.infer<typeof InputSchema>;

export const addObservablesStepCommonDefinition: CommonStepDefinition<
  AddObservablesStepInputSchema,
  AddObservablesStepOutputSchema
> = {
  id: AddObservablesStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.ADD_OBSERVABLES_STEP_LABEL,
  description: i18n.ADD_OBSERVABLES_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_OBSERVABLES_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Add observables to case
\`\`\`yaml
- name: add_observables
  type: ${AddObservablesStepTypeId}
  with:
    case_id: "abc-123-def-456"
    observables:
      - typeKey: "ip"
        value: "10.0.0.8"
        description: "Source IP"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
