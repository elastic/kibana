/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import * as i18n from '../translations';
import { ExtractObservablesStatusSchema } from '../../types/api/observable/latest';
import { CasesStepCaseIdSchema, CasesStepSingleCaseOutputSchema } from './shared';

export const ExtractObservablesStepTypeId = 'cases.extractObservables';

const InputSchema = CasesStepCaseIdSchema;

const OutputSchema = CasesStepSingleCaseOutputSchema.extend({
  status: ExtractObservablesStatusSchema,
  new_observables_count: lazySchema(() => z.number().int().min(0)),
  alerts_requested: lazySchema(() => z.number().int().min(0)),
  alerts_found: lazySchema(() => z.number().int().min(0)),
});

type ExtractObservablesStepInputSchema = typeof InputSchema;
type ExtractObservablesStepOutputSchema = typeof OutputSchema;

export type ExtractObservablesStepInput = z.infer<typeof InputSchema>;

export const extractObservablesStepCommonDefinition: CommonStepDefinition<
  ExtractObservablesStepInputSchema,
  ExtractObservablesStepOutputSchema
> = {
  id: ExtractObservablesStepTypeId,
  category: StepCategory.KibanaCases,
  label: i18n.EXTRACT_OBSERVABLES_STEP_LABEL,
  description: i18n.EXTRACT_OBSERVABLES_STEP_DESCRIPTION,
  documentation: {
    details: i18n.EXTRACT_OBSERVABLES_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Extract observables from the alerts attached to a case
\`\`\`yaml
- name: extract_observables
  type: ${ExtractObservablesStepTypeId}
  with:
    case_id: "abc-123-def-456"
\`\`\``,
      `## Extract observables, then tag the case when new ones were found
\`\`\`yaml
- name: extract_observables
  type: ${ExtractObservablesStepTypeId}
  with:
    case_id: \${{ steps.create_case.output.case.id }}

- name: tag_case
  type: cases.addTags
  if: \${{ steps.extract_observables.output.new_observables_count > 0 }}
  with:
    case_id: \${{ steps.extract_observables.output.case.id }}
    tags:
      - "has-observables"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
