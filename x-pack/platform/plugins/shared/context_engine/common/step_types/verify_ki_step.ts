/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { kiPartialFieldsSchema } from './ki';

export const VERIFY_KI_STEP_TYPE_ID = 'context-engine.verifyKi';

export const VerifyKiInputSchema = z.object({
  ki: kiPartialFieldsSchema,
});

export const VerifyKiOutputSchema = z.object({
  passed: z.boolean(),
  results: z.array(
    z.object({
      verifier: z.string(),
      passed: z.boolean(),
      reason: z.string().optional(),
    })
  ),
});

export type VerifyKiInputSchemaType = typeof VerifyKiInputSchema;
export type VerifyKiOutputSchemaType = typeof VerifyKiOutputSchema;

export const VerifyKiStepCommonDefinition: CommonStepDefinition<
  VerifyKiInputSchemaType,
  VerifyKiOutputSchemaType
> = {
  id: VERIFY_KI_STEP_TYPE_ID,
  category: StepCategory.Kibana,
  inputSchema: VerifyKiInputSchema,
  outputSchema: VerifyKiOutputSchema,
  label: i18n.translate('xpack.contextEngine.verifyKiStep.label', {
    defaultMessage: 'Verify Knowledge Indicator',
  }),
  description: i18n.translate('xpack.contextEngine.verifyKiStep.description', {
    defaultMessage: 'Runs the Context Engine KI verifiers against a knowledge indicator',
  }),
  documentation: {
    details: i18n.translate('xpack.contextEngine.verifyKiStep.documentation.details', {
      defaultMessage:
        'The {stepTypeId} step runs all applicable Context Engine verifiers against a knowledge indicator and returns a per-verifier pass/fail summary. If no verifier applies (for example, no ES|QL in `attributes.esql`), the step passes with empty results. Requires the Context Engine advanced setting.',
      values: { stepTypeId: VERIFY_KI_STEP_TYPE_ID },
    }),
    examples: [
      `## Verify a knowledge indicator's ES|QL
\`\`\`yaml
- name: verify_ki
  type: ${VERIFY_KI_STEP_TYPE_ID}
  with:
    ki:
      type: detection
      title: Failed login burst
      attributes:
        esql: 'FROM logs-* | WHERE event.outcome == "failure" | STATS c = COUNT(*) BY user.name'
\`\`\``,
    ],
  },
};
