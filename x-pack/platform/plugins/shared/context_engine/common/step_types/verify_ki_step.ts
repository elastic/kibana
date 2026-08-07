/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';

/**
 * Step type ID for the verify knowledge item (KI) workflow step.
 */
export const VerifyKiStepTypeId = 'context-engine.verifyKi';

const MAX_KI_KEYWORD_LENGTH = 1024;
const MAX_KI_DESCRIPTION_LENGTH = 10_000;
const MAX_KI_CONTENT_LENGTH = 100_000;
const MAX_KI_TAGS = 100;

const VerifyKiInputSchema = z.object({
  ki: z
    .looseObject({
      type: z.string().max(MAX_KI_KEYWORD_LENGTH).optional().describe('The knowledge item type.'),
      title: z.string().max(MAX_KI_KEYWORD_LENGTH).optional().describe('The knowledge item title.'),
      description: z
        .string()
        .max(MAX_KI_DESCRIPTION_LENGTH)
        .optional()
        .describe('The knowledge item description.'),
      content: z
        .string()
        .max(MAX_KI_CONTENT_LENGTH)
        .optional()
        .describe(
          'The knowledge item content. Fenced ```esql code blocks are extracted and verified.'
        ),
      tags: z
        .array(z.string().max(MAX_KI_KEYWORD_LENGTH))
        .max(MAX_KI_TAGS)
        .optional()
        .describe('Tags associated with the knowledge item.'),
      attributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Additional knowledge item attributes. An `esql` attribute is extracted and verified.'
        ),
    })
    .describe('The candidate knowledge item (KI) document to verify.'),
});

const VerifyKiOutputSchema = z.object({
  valid: z.boolean().describe('`true` when no verifier reported the knowledge item as invalid.'),
  results: z
    .array(
      z.object({
        verifier: z.string().describe('Id of the verifier that produced this result.'),
        status: z
          .enum(['valid', 'invalid', 'skipped'])
          .describe(
            '`valid` when all checks passed, `invalid` when at least one check failed, `skipped` when the verifier does not apply.'
          ),
        messages: z.array(z.string()).describe('Details about the verification outcome.'),
      })
    )
    .describe('Per-verifier verification results.'),
});

export type VerifyKiInput = z.infer<typeof VerifyKiInputSchema>;
export type VerifyKiOutput = z.infer<typeof VerifyKiOutputSchema>;

/**
 * Common step definition for the verify KI step, shared between the server
 * handler and the public (editor) definition.
 */
export const verifyKiStepCommonDefinition: CommonStepDefinition<
  typeof VerifyKiInputSchema,
  typeof VerifyKiOutputSchema
> = {
  id: VerifyKiStepTypeId,
  category: StepCategory.Elasticsearch,
  label: i18n.translate('xpack.contextEngine.verifyKiStep.label', {
    defaultMessage: 'Verify Knowledge Item',
  }),
  description: i18n.translate('xpack.contextEngine.verifyKiStep.description', {
    defaultMessage: 'Verify a candidate knowledge item (KI) before it is persisted to an AI index.',
  }),
  documentation: {
    details: i18n.translate('xpack.contextEngine.verifyKiStep.documentation.details', {
      defaultMessage:
        'Runs the registered knowledge item verifiers against a candidate KI and reports whether it is valid. The ES|QL verifier extracts ES|QL queries from fenced code blocks in the KI content and from the `esql` attribute, validates that they parse, and confirms they execute successfully. Use the `valid` output to gate whether the KI is persisted to an AI index.',
    }),
    examples: [
      `## Verify a KI before indexing it
\`\`\`yaml
- name: verify_ki
  type: ${VerifyKiStepTypeId}
  with:
    ki:
      type: access_pattern
      title: "Find slow requests"
      content: |
        Use this query to find slow requests:
        \`\`\`esql
        FROM logs-* | WHERE duration > 1000 | LIMIT 100
        \`\`\`
\`\`\``,
    ],
  },
  inputSchema: VerifyKiInputSchema,
  outputSchema: VerifyKiOutputSchema,
};
