/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';

/** Step type ID for the Verify KI workflow step. */
export const VerifyKiStepTypeId = 'context-engine.verifyKi';

export const InputSchema = z.object({
  index: z
    .string()
    .min(1)
    .max(1024)
    .describe('Index or alias containing the Knowledge Indicators to verify'),
  size: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe('Maximum number of KIs to fetch (defaults to 10)'),
});

export const OutputSchema = z.object({
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  results: z.array(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      passed: z.boolean(),
      verifierResults: z.array(
        z.object({
          verifier: z.string(),
          passed: z.boolean(),
          reason: z.string().optional(),
        })
      ),
    })
  ),
});

export const ConfigSchema = z.object({
  verifiers: z
    .array(z.string().max(256))
    .max(100)
    .optional()
    .describe('Verifier ids to run; omit to run all registered verifiers'),
});

export type VerifyKiStepInputSchema = typeof InputSchema;
export type VerifyKiStepOutputSchema = typeof OutputSchema;
export type VerifyKiStepOutput = z.infer<typeof OutputSchema>;

export const verifyKiStepCommonDefinition: CommonStepDefinition<
  VerifyKiStepInputSchema,
  VerifyKiStepOutputSchema,
  typeof ConfigSchema
> = {
  id: VerifyKiStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.translate('xpack.contextEngine.verifyKiStep.label', {
    defaultMessage: 'Verify KI',
  }),
  description: i18n.translate('xpack.contextEngine.verifyKiStep.description', {
    defaultMessage: 'Runs Knowledge Indicator verifiers against KIs in an index',
  }),
  documentation: {
    details: i18n.translate('xpack.contextEngine.verifyKiStep.documentation.details', {
      defaultMessage:
        'Fetches Knowledge Indicators from the given index and runs the selected Context Engine verifiers against each one, returning a pass/fail summary per KI.',
    }),
    examples: [
      `## Verify KIs with all registered verifiers
\`\`\`yaml
- name: verify_kis
  type: ${VerifyKiStepTypeId}
  with:
    index: "my-ai-index"
\`\`\``,
      `## Run selected verifiers against up to 50 KIs
\`\`\`yaml
- name: verify_kis
  type: ${VerifyKiStepTypeId}
  verifiers:
    - has-title
    - min-content
  with:
    index: "my-ai-index"
    size: 50
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
