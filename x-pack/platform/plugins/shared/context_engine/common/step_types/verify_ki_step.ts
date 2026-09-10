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
import {
  ESQL_VALID_RUNTIME_VERIFIER_ID,
  ESQL_VALID_SYNTAX_VERIFIER_ID,
  KI_VERIFIER_IDS,
  WORKFLOW_VERIFIER_ID_PREFIX,
} from '../ki_verification';
import { MAX_KI_ATTRIBUTE_KEY_LENGTH, MAX_KI_TYPE_LENGTH, kiPartialFieldsSchema } from './ki';

export const VERIFY_KI_STEP_TYPE_ID = 'context-engine.verifyKi';

export const MAX_KI_VERIFIERS = 10;
export const MAX_KI_VERIFIER_WORKFLOW_ID_LENGTH = 256;
export const MAX_KI_VERIFIER_APPLIES_TO_VALUES = 20;
export const DEFAULT_KI_VERIFIER_TIMEOUT_SEC = 60;
export const MAX_KI_VERIFIER_TIMEOUT_SEC = 300;

export const kiVerifierWorkflowSchema = z.object({
  workflow_id: z
    .string()
    .min(1)
    .max(MAX_KI_VERIFIER_WORKFLOW_ID_LENGTH)
    .describe('The id of the workflow to run as a verifier'),
  timeout_sec: z
    .number()
    .int()
    .min(1)
    .max(MAX_KI_VERIFIER_TIMEOUT_SEC)
    .optional()
    .describe(
      `Seconds to wait for the verifier workflow before failing the KI (default ${DEFAULT_KI_VERIFIER_TIMEOUT_SEC})`
    ),
  applies_to: z
    .object({
      types: z
        .array(z.string().min(1).max(MAX_KI_TYPE_LENGTH))
        .min(1)
        .max(MAX_KI_VERIFIER_APPLIES_TO_VALUES)
        .optional()
        .describe('Run only for KIs with one of these types'),
      attributes: z
        .array(z.string().min(1).max(MAX_KI_ATTRIBUTE_KEY_LENGTH))
        .min(1)
        .max(MAX_KI_VERIFIER_APPLIES_TO_VALUES)
        .optional()
        .describe('Run only for KIs carrying every one of these attribute keys'),
    })
    .optional()
    .describe('When omitted, the verifier runs for every KI'),
});

export type KiVerifierWorkflow = z.infer<typeof kiVerifierWorkflowSchema>;

export const kiVerifierEntrySchema = z.union([z.enum(KI_VERIFIER_IDS), kiVerifierWorkflowSchema]);

export type KiVerifierEntry = z.infer<typeof kiVerifierEntrySchema>;

/** Returns the id that identifies this verifier in results and duplicate checks. */
export const getKiVerifierEntryKey = (entry: KiVerifierEntry): string =>
  typeof entry === 'string' ? entry : `${WORKFLOW_VERIFIER_ID_PREFIX}${entry.workflow_id}`;

export const VerifyKiInputSchema = z.object({
  ki: kiPartialFieldsSchema,
  verifiers: z
    .array(kiVerifierEntrySchema)
    .min(1)
    .max(MAX_KI_VERIFIERS)
    .refine((entries) => new Set(entries.map(getKiVerifierEntryKey)).size === entries.length, {
      message: 'Verifier ids must be unique.',
    })
    .describe(
      'The verifiers to run, in order: built-in verifier ids and custom verifier workflows (`workflow_id`). At least one unique entry is required.'
    ),
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
        'Runs each verifier against the KI and returns a pass/fail result per verifier. Built-in ids: `{syntaxVerifierId}` (ES|QL parse), `{runtimeVerifierId}` (ES|QL execute). Custom verifiers use `workflow_id`; the workflow receives `inputs.ki` and must emit `passed` and `reason`. Requires the Context Engine advanced setting.',
      values: {
        syntaxVerifierId: ESQL_VALID_SYNTAX_VERIFIER_ID,
        runtimeVerifierId: ESQL_VALID_RUNTIME_VERIFIER_ID,
      },
    }),
    examples: [
      `## Verify a knowledge indicator's ES|QL
\`\`\`yaml
- name: verify_ki
  type: ${VERIFY_KI_STEP_TYPE_ID}
  with:
    verifiers:
      - ${ESQL_VALID_SYNTAX_VERIFIER_ID}
      - ${ESQL_VALID_RUNTIME_VERIFIER_ID}
    ki:
      type: detection
      title: Failed login burst
      attributes:
        esql: 'FROM logs-* | WHERE event.outcome == "failure" | STATS c = COUNT(*) BY user.name'
\`\`\``,
      `## Combine a built-in verifier with custom verifier workflows
\`\`\`yaml
- name: verify_ki
  type: ${VERIFY_KI_STEP_TYPE_ID}
  with:
    ki: "{{ steps.build_ki.output }}"
    verifiers:
      - ${ESQL_VALID_SYNTAX_VERIFIER_ID}
      - workflow_id: no-pii-in-content
      - workflow_id: esql-returns-rows
        timeout_sec: 60
        applies_to:
          attributes: [esql]
\`\`\``,
    ],
  },
};
