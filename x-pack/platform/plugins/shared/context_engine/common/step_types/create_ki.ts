/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { ESQL_VALID_RUNTIME_VERIFIER_ID, ESQL_VALID_SYNTAX_VERIFIER_ID } from '../ki_verification';
import { aiIndexIdSchema, kiFieldsSchema, kiIdSchema } from './ki';
import { VerifyKiOutputSchema, kiVerifiersSchema } from './verify_ki_step';

export const CREATE_KI_STEP_ID = 'context-engine.createKi' as const;

export const KI_VERIFICATION_FAILURE_ACTIONS = ['skip', 'write_as_failed'] as const;
export type KiVerificationFailureAction = (typeof KI_VERIFICATION_FAILURE_ACTIONS)[number];

export const createKiInputSchema = z.object({
  ai_index_id: aiIndexIdSchema,
  ki_id: kiIdSchema
    .optional()
    .describe(
      'Optional stable id for the knowledge indicator. On an index re-runs with the same id replace it; on a data stream they append a new revision. Generated when omitted.'
    ),
  ki: kiFieldsSchema.describe('The knowledge indicator document to create'),
  verifiers: kiVerifiersSchema
    .optional()
    .describe(
      'Optional verifiers to run before writing, in order: built-in verifier ids and custom verifier workflows (`workflow_id`). When any fails, `on_verification_failure` decides what happens.'
    ),
  on_verification_failure: z
    .enum(KI_VERIFICATION_FAILURE_ACTIONS)
    .optional()
    .describe(
      'What to do with a KI that fails verification: `skip` (default) writes nothing and leaves any existing KI with the same id untouched; `write_as_failed` writes it with lifecycle status `verification_failed`, replacing any existing KI with the same id, out of search but visible in the AI index.'
    ),
  refresh: z
    .boolean()
    .optional()
    .describe(
      'Wait for the write to become searchable before the step completes (default false). Set when a later step in the same run updates or deletes this KI.'
    ),
});

export const createKiOutputSchema = z.object({
  id: z
    .string()
    .optional()
    .describe(
      'The id of the created knowledge indicator; absent when verification failed and the write was skipped'
    ),
  verification: VerifyKiOutputSchema.optional().describe(
    'Verifier results; present when `verifiers` was given'
  ),
});

export type CreateKiOutput = z.infer<typeof createKiOutputSchema>;

export const createKiStepCommonDefinition: CommonStepDefinition<
  typeof createKiInputSchema,
  typeof createKiOutputSchema
> = {
  id: CREATE_KI_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.createKi.label', {
    defaultMessage: 'Create Knowledge Indicator',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.createKi.description', {
    defaultMessage: 'Create a knowledge indicator (KI) in an AI index.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: createKiInputSchema,
  outputSchema: createKiOutputSchema,
  documentation: {
    details: i18n.translate('xpack.contextEngine.workflows.steps.createKi.documentation.details', {
      defaultMessage:
        'Indexes a knowledge indicator document into the backing store of the specified AI index. ' +
        'When the AI index does not exist yet, it is created automatically with an index backing ' +
        'store derived from its id. Pass ki_id to set a stable id; re-runs with the same id ' +
        'replace the KI on an index and append a new revision on a data stream. Pass verifiers to ' +
        'run KI verifiers before writing: when any fails, nothing is written and the output carries ' +
        'no id, unless on_verification_failure is write_as_failed, which writes the KI with lifecycle ' +
        'status verification_failed so it stays out of search but visible in the AI index. Either way ' +
        'verification.results names the failing verifiers. The write is not refreshed ' +
        'unless refresh is true, so set it when a later step in the same run reads the KI back. ' +
        'The step returns the id of the created KI, which can be used by later steps to update ' +
        'or delete it.',
    }),
    examples: [
      `## Create a knowledge indicator
\`\`\`yaml
- name: create_ki
  type: ${CREATE_KI_STEP_ID}
  with:
    ai_index_id: "my-ai-index"
    ki_id: "logs-index-profile"
    ki:
      type: "index_metadata"
      title: "logs-* index profile"
      description: "Profile of the logs indices"
      content: "Backing index: logs-*"
      tags:
        - "logs"
\`\`\``,
      `## Verify the ES|QL a knowledge indicator carries before writing it
\`\`\`yaml
- name: create_ki
  type: ${CREATE_KI_STEP_ID}
  with:
    ai_index_id: "my-ai-index"
    ki_id: "failed-login-burst"
    verifiers:
      - ${ESQL_VALID_SYNTAX_VERIFIER_ID}
      - ${ESQL_VALID_RUNTIME_VERIFIER_ID}
    on_verification_failure: write_as_failed
    ki:
      type: "detection"
      title: "Failed login burst"
      attributes:
        esql: 'FROM logs-* | WHERE event.outcome == "failure" | STATS c = COUNT(*) BY user.name'
- name: log_verification_failure
  type: console
  if: "steps.create_ki.output.verification.passed : false"
  with:
    message: "KI written as verification_failed: {{ steps.create_ki.output.verification.results | json }}"
\`\`\``,
    ],
  },
};
