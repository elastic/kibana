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
import { MAX_KI_ATTRIBUTE_KEY_LENGTH, MAX_KI_TYPE_LENGTH, kiPartialFieldsSchema } from './ki';

export const VERIFY_KI_STEP_TYPE_ID = 'context-engine.verifyKi';

export const MAX_KI_VERIFIER_WORKFLOWS = 10;
export const MAX_KI_VERIFIER_WORKFLOW_ID_LENGTH = 256;
export const MAX_KI_VERIFIER_APPLIES_TO_VALUES = 20;
export const DEFAULT_KI_VERIFIER_TIMEOUT_SEC = 60;
export const MAX_KI_VERIFIER_TIMEOUT_SEC = 300;

/** A user-authored verifier: a workflow taking `inputs.ki` and emitting `passed` and `reason`. */
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
        .max(MAX_KI_VERIFIER_APPLIES_TO_VALUES)
        .optional()
        .describe('Run only for KIs with one of these types'),
      attributes: z
        .array(z.string().min(1).max(MAX_KI_ATTRIBUTE_KEY_LENGTH))
        .max(MAX_KI_VERIFIER_APPLIES_TO_VALUES)
        .optional()
        .describe('Run only for KIs carrying every one of these attribute keys'),
    })
    .optional()
    .describe('When omitted, the verifier runs for every KI'),
});

export type KiVerifierWorkflow = z.infer<typeof kiVerifierWorkflowSchema>;

/** A built-in verifier selected by id (for example `esql-valid-syntax`). */
export const kiBuiltInVerifierSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(MAX_KI_VERIFIER_WORKFLOW_ID_LENGTH)
    .describe('The id of a built-in verifier to run'),
});

export const kiVerifierEntrySchema = z.union([kiBuiltInVerifierSchema, kiVerifierWorkflowSchema]);

export type KiVerifierEntry = z.infer<typeof kiVerifierEntrySchema>;

export const VerifyKiInputSchema = z.object({
  ki: kiPartialFieldsSchema,
  verifiers: z
    .array(kiVerifierEntrySchema)
    .max(MAX_KI_VERIFIER_WORKFLOWS)
    .optional()
    .describe(
      'The verifiers to run, in order: built-ins by `id` and custom workflows by `workflow_id`. When omitted, every built-in verifier runs. An empty list runs no verifiers and the step passes.'
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
        'The {stepTypeId} step runs Context Engine verifiers against a knowledge indicator and returns a per-verifier pass/fail summary. Without `verifiers`, every built-in verifier runs. With `verifiers`, exactly the listed ones run in order: built-ins by `id` (for example `esql-valid-syntax`) and custom workflows by `workflow_id`. An empty `verifiers` list runs nothing and the step passes with empty results, so only use it to deliberately skip verification. A verifier only runs when it applies to the KI (for example, the ES|QL verifier needs `attributes.esql`); if none apply, the step passes with empty results. A custom verifier workflow receives the KI as `inputs.ki` and must emit `passed` (boolean) and `reason` (string) through a `workflow.output` step. A custom verifier that fails, times out, or returns malformed output fails the KI. Requires the Context Engine advanced setting.',
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
      `## Pick the verifiers to run: a built-in plus custom verifier workflows
\`\`\`yaml
- name: verify_ki
  type: ${VERIFY_KI_STEP_TYPE_ID}
  with:
    ki: "{{ steps.build_ki.output }}"
    verifiers:
      - id: esql-valid-syntax
      - workflow_id: no-pii-in-content
      - workflow_id: esql-returns-rows
        timeout_sec: 60
        applies_to:
          attributes: [esql]
\`\`\``,
    ],
  },
};
