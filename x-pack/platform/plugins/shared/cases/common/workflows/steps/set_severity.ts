/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { CaseSeverity } from '../../bundled-types.gen';
import * as i18n from '../translations';
import {
  CasesStepBaseConfigSchema,
  CasesStepCaseIdVersionSchema,
  CasesStepSingleCaseOutputSchema,
} from './shared';

export const SetSeverityStepTypeId = 'cases.setSeverity';

const InputSchema = CasesStepCaseIdVersionSchema.extend({
  severity: CaseSeverity,
});

const OutputSchema = CasesStepSingleCaseOutputSchema;

type SetSeverityStepInputSchema = typeof InputSchema;
type SetSeverityStepOutputSchema = typeof OutputSchema;

export type SetSeverityStepInput = z.infer<typeof InputSchema>;

export const setSeverityStepCommonDefinition: CommonStepDefinition<
  SetSeverityStepInputSchema,
  SetSeverityStepOutputSchema
> = {
  id: SetSeverityStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.SET_SEVERITY_STEP_LABEL,
  description: i18n.SET_SEVERITY_STEP_DESCRIPTION,
  documentation: {
    details: i18n.SET_SEVERITY_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set case severity
\`\`\`yaml
- name: set_case_severity
  type: ${SetSeverityStepTypeId}
  with:
    case_id: "abc-123-def-456"
    severity: "high"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: CasesStepBaseConfigSchema,
};
