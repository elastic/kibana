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

export const MAX_VERIFIER_IDS = 20;

export interface VerifyKiOptions {
  'esql-valid-schema'?: {
    field_verification?: 'enabled' | 'disabled';
  };
  [verifierId: string]: Record<string, unknown> | undefined;
}

export const VerifyKiInputSchema = z.object({
  ki: kiPartialFieldsSchema,
  verifiers: z
    .array(z.string().min(1).max(100))
    .min(1)
    .max(MAX_VERIFIER_IDS)
    .describe(
      'Verifier ids to run. At least one id is required; the step fails if none are listed or if an unknown id is specified.'
    ),
  options: z
    .object({
      'esql-valid-schema': z
        .object({
          field_verification: z
            .enum(['enabled', 'disabled'])
            .optional()
            .describe(
              "Controls ES|QL field verification for the 'esql-valid-schema' verifier. 'enabled' (default): checks index existence and semantically validates source, pipeline, join, and ENRICH fields. 'disabled': checks index existence only."
            ),
        })
        .optional(),
    })
    .optional()
    .describe('Per-verifier configuration options, keyed by verifier id.'),
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
        'Runs the verifiers listed in `verifiers` and returns a pass/fail result per verifier. At least one id is required; an unknown id fails the step. ES|QL verifiers: `esql-valid-syntax` validates each query locally (no cluster call); `esql-valid-schema` validates indices, fields, joins, and ENRICH policies using cluster metadata; `esql-valid-runtime` executes each query against live data, bounded to one row. Schema and runtime checks use the workflow user permissions. Set `options.esql-valid-schema.field_verification` to `disabled` to check only index existence; it defaults to `enabled`. All ES|QL verifiers read from the `esql` attribute. Requires the Context Engine advanced setting.',
    }),
    examples: [
      `## Verify a knowledge indicator's ES|QL
\`\`\`yaml
- name: verify_ki
  type: ${VERIFY_KI_STEP_TYPE_ID}
  with:
    verifiers:
      - esql-valid-syntax
      - esql-valid-schema
      - esql-valid-runtime
    ki:
      type: detection
      title: Failed login burst
      attributes:
        esql: 'FROM logs-* | WHERE event.outcome == "failure" | STATS c = COUNT(*) BY user.name'
\`\`\``,
    ],
  },
};
