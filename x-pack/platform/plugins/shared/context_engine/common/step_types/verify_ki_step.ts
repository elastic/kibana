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
import { kiPartialFieldsSchema, MAX_KI_ATTRIBUTE_KEY_LENGTH } from './ki';

export const VERIFY_KI_STEP_TYPE_ID = 'context-engine.verifyKi';

export const DEFAULT_ESQL_ATTRIBUTE = 'esql';

export const MAX_ESQL_ATTRIBUTES = 20;
export const MAX_VERIFIER_IDS = 20;

export const VerifyKiInputSchema = z.object({
  ki: kiPartialFieldsSchema,
  esql_attributes: z
    .array(z.string().min(1).max(MAX_KI_ATTRIBUTE_KEY_LENGTH))
    .max(MAX_ESQL_ATTRIBUTES)
    .optional()
    .describe(
      `Names of the KI attributes carrying ES|QL to verify, defaulting to '${DEFAULT_ESQL_ATTRIBUTE}'. A listed attribute the KI does not carry is skipped, not failed.`
    ),
  verifiers: z
    .array(z.string().min(1).max(100))
    .min(1)
    .max(MAX_VERIFIER_IDS)
    .describe('Verifier ids to run. At least one id is required; the step fails if none are listed or if an unknown id is specified.'),
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
        'The {stepTypeId} step runs the Context Engine verifiers listed in `verifiers` against a knowledge indicator and returns a pass/fail result per verifier. At least one verifier id is required; the step fails if none are listed. Two verifiers apply to ES|QL: `esql-valid-syntax` statically validates each query without contacting the cluster, and `esql-valid-runtime` runs each query against the cluster, bounded by a row limit and using the permissions of the user running the workflow. Both read ES|QL from the attributes listed in `esql_attributes`, defaulting to `attributes.{defaultAttribute}`; a listed attribute the knowledge indicator does not carry is skipped rather than failed. If it carries none of them, no verifier applies and the step passes with empty results. Requires the Context Engine advanced setting.',
      values: { stepTypeId: VERIFY_KI_STEP_TYPE_ID, defaultAttribute: DEFAULT_ESQL_ATTRIBUTE },
    }),
    examples: [
      `## Verify a knowledge indicator's ES|QL
\`\`\`yaml
- name: verify_ki
  type: ${VERIFY_KI_STEP_TYPE_ID}
  with:
    verifiers:
      - esql-valid-syntax
      - esql-valid-runtime
    ki:
      type: detection
      title: Failed login burst
      attributes:
        esql: 'FROM logs-* | WHERE event.outcome == "failure" | STATS c = COUNT(*) BY user.name'
\`\`\``,
      `## Verify ES|QL held in custom attributes
\`\`\`yaml
- name: verify_ki
  type: ${VERIFY_KI_STEP_TYPE_ID}
  with:
    verifiers:
      - esql-valid-syntax
      - esql-valid-runtime
    esql_attributes:
      - aggregation_query
      - sampling_query
    ki: "{{ steps.construct_ki.output }}"
\`\`\``,
    ],
  },
};
