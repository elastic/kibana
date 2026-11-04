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
import { MAX_OBSERVABLES_PER_CASE, OBSERVABLE_ID_MAX_LENGTH } from '../../constants';
import { CasesStepCaseIdSchema } from './shared';

export const BulkDeleteObservablesStepTypeId = 'cases.bulkDeleteObservables';

const ObservableIdsSchema = z
  .array(z.string().min(1, 'observable_ids values are required').max(OBSERVABLE_ID_MAX_LENGTH))
  .min(1)
  .max(MAX_OBSERVABLES_PER_CASE);

const InputSchema = CasesStepCaseIdSchema.extend({
  observable_ids: ObservableIdsSchema,
});

const OutputSchema = z.object({
  case_id: z.string(),
  observable_ids: z.array(z.string()),
});

type BulkDeleteObservablesStepInputSchema = typeof InputSchema;
type BulkDeleteObservablesStepOutputSchema = typeof OutputSchema;

export type BulkDeleteObservablesStepInput = z.infer<typeof InputSchema>;

export const bulkDeleteObservablesStepCommonDefinition: CommonStepDefinition<
  BulkDeleteObservablesStepInputSchema,
  BulkDeleteObservablesStepOutputSchema
> = {
  id: BulkDeleteObservablesStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.BULK_DELETE_OBSERVABLES_STEP_LABEL,
  description: i18n.BULK_DELETE_OBSERVABLES_STEP_DESCRIPTION,
  documentation: {
    details: i18n.BULK_DELETE_OBSERVABLES_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Remove several false-positive observables
\`\`\`yaml
- name: bulk_delete_observables
  type: ${BulkDeleteObservablesStepTypeId}
  with:
    case_id: "abc-123-def-456"
    observable_ids:
      - "obs-789"
      - "obs-012"
\`\`\``,
      `## Delete observables then close the case
\`\`\`yaml
- name: remove_fp_iocs
  type: ${BulkDeleteObservablesStepTypeId}
  with:
    case_id: \${{ steps.create_case.output.case.id }}
    observable_ids:
      - \${{ steps.add_observables.output.case.observables[0].id }}
      - \${{ steps.add_observables.output.case.observables[1].id }}

- name: close_case
  type: cases.closeCase
  with:
    case_id: \${{ steps.remove_fp_iocs.output.case_id }}
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
