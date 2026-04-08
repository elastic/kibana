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
import { CasesStepCaseIdSchema } from './shared';

export const DeleteObservableStepTypeId = 'cases.deleteObservable';

const InputSchema = CasesStepCaseIdSchema.extend({
  observable_id: z.string().min(1, 'observable_id is required'),
});

const OutputSchema = z.object({
  case_id: z.string(),
  observable_id: z.string(),
});

type DeleteObservableStepInputSchema = typeof InputSchema;
type DeleteObservableStepOutputSchema = typeof OutputSchema;

export type DeleteObservableStepInput = z.infer<typeof InputSchema>;

export const deleteObservableStepCommonDefinition: CommonStepDefinition<
  DeleteObservableStepInputSchema,
  DeleteObservableStepOutputSchema
> = {
  id: DeleteObservableStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.DELETE_OBSERVABLE_STEP_LABEL,
  description: i18n.DELETE_OBSERVABLE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.DELETE_OBSERVABLE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Remove a false-positive observable
\`\`\`yaml
- name: delete_observable
  type: ${DeleteObservableStepTypeId}
  with:
    case_id: "abc-123-def-456"
    observable_id: "obs-789"
\`\`\``,
      `## Delete observable
\`\`\`yaml
- name: remove_fp_ioc
  type: ${DeleteObservableStepTypeId}
  with:
    case_id: \${{ steps.create_case.output.case.id }}
    observable_id: \${{ steps.add_observables.output.case.observables[0].id }}

- name: close_case
  type: cases.closeCase
  with:
    case_id: \${{ steps.remove_fp_ioc.output.case_id }}
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
