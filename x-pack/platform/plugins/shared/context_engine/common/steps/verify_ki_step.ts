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

export const VERIFY_KI_STEP_TYPE_ID = 'context_engine.verify_ki';

export const MAX_KI_ATTRIBUTES = 100;

const KnowledgeIndicatorSchema = z.object({
  type: z.string().max(256).optional(),
  title: z.string().max(1024).optional(),
  description: z.string().max(10_000).optional(),
  content: z.string().max(100_000).optional(),
  tags: z.array(z.string().max(256)).max(100).optional(),
  attributes: z
    .record(z.string().max(256), z.unknown())
    .refine((attributes) => Object.keys(attributes).length <= MAX_KI_ATTRIBUTES, {
      message: `attributes must have at most ${MAX_KI_ATTRIBUTES} entries`,
    })
    .optional(),
});

export const VerifyKiInputSchema = z.object({
  ki: KnowledgeIndicatorSchema,
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
        'The {stepTypeId} step runs all applicable Context Engine verifiers against the given knowledge indicator and returns a per-verifier pass/fail summary. Requires the Context Engine advanced setting to be enabled.',
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
