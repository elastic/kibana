/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// ai.pii
// ---------------------------------------------------------------------------

const TokenEntrySchema = z.object({
  original: z.string(),
  entityClass: z.string(),
});

const TokenMapSchema = z.record(z.string(), TokenEntrySchema);

const CustomPatternSchema = z.object({
  pattern: z.string().describe('Regex pattern to match PII'),
  entityClass: z.string().describe('Entity class label (e.g. EMPLOYEE_ID)'),
});

export const AiPiiInputSchema = z.object({
  input: z
    .union([z.string(), z.array(z.unknown())])
    .describe('Text string or messages array to anonymize'),
  salt: z.string().describe('Per-session salt derived from the session identifier'),
  tokenMap: TokenMapSchema.nullish().describe(
    "Token map from a preceding ai.pii step; entries are merged into this step's output"
  ),
  entities: z
    .array(z.string())
    .optional()
    .describe('Built-in entity class names to detect (IP, EMAIL, HOST_NAME)'),
  customPatterns: z.array(CustomPatternSchema).optional().describe('Additional custom regex rules'),
});

export const AiPiiOutputSchema = z.object({
  output: z.union([z.string(), z.array(z.unknown())]).describe('Anonymized text or messages array'),
  tokenMap: TokenMapSchema.describe(
    'Merged token map including all PII tokens discovered in this and any preceding ai.pii steps'
  ),
});

export type AiPiiInputSchemaType = typeof AiPiiInputSchema;
export type AiPiiOutputSchemaType = typeof AiPiiOutputSchema;

export const AiPiiStepCommonDefinition: BaseStepDefinition<
  AiPiiInputSchemaType,
  AiPiiOutputSchemaType
> = {
  id: 'ai.pii',
  category: StepCategory.Ai,
  label: i18n.translate('inferenceWorkflows.steps.aiPii.label', {
    defaultMessage: 'Anonymize PII',
  }),
  description: i18n.translate('inferenceWorkflows.steps.aiPii.description', {
    defaultMessage:
      'Detects and replaces PII in text or message arrays with deterministic HMAC tokens.',
  }),
  documentation: {
    details: i18n.translate('inferenceWorkflows.steps.aiPii.documentation.details', {
      defaultMessage:
        'Replaces personally identifiable information (PII) such as IP addresses, email addresses, and hostnames with deterministic HMAC tokens. The salt is passed as a step input from the workflow event; the accumulated token map is returned as step output and chained to the next step or workflow output. Use transform.pii_restore to reverse the process.',
    }),
    examples: [
      `## Anonymize messages before sending to LLM
\`\`\`yaml
- name: anonymize
  type: ai.pii
  with:
    input: '\${{ event.messages }}'
    salt: '{{ event.salt }}'
    entities: [IP, EMAIL, HOST_NAME]
\`\`\``,
    ],
  },
  inputSchema: AiPiiInputSchema,
  outputSchema: AiPiiOutputSchema,
};

// ---------------------------------------------------------------------------
// transform.pii_restore
// ---------------------------------------------------------------------------

export const TransformPiiRestoreInputSchema = z.object({
  input: z
    .union([z.string(), z.array(z.unknown())])
    .describe('Anonymized text or messages array containing PII tokens to restore'),
  tokenMap: TokenMapSchema.describe('Token map produced by ai.pii step(s) in this workflow run'),
});

export const TransformPiiRestoreOutputSchema = z.object({
  output: z
    .union([z.string(), z.array(z.unknown())])
    .describe('Deanonymized text or messages with tokens replaced by original values'),
});

export type TransformPiiRestoreInputSchemaType = typeof TransformPiiRestoreInputSchema;
export type TransformPiiRestoreOutputSchemaType = typeof TransformPiiRestoreOutputSchema;

export const TransformPiiRestoreStepCommonDefinition: BaseStepDefinition<
  TransformPiiRestoreInputSchemaType,
  TransformPiiRestoreOutputSchemaType
> = {
  id: 'transform.pii_restore',
  category: StepCategory.Data,
  label: i18n.translate('inferenceWorkflows.steps.transformPiiRestore.label', {
    defaultMessage: 'Restore PII Tokens',
  }),
  description: i18n.translate('inferenceWorkflows.steps.transformPiiRestore.description', {
    defaultMessage:
      'Replaces anonymization tokens in text or message arrays with their original values.',
  }),
  documentation: {
    details: i18n.translate('inferenceWorkflows.steps.transformPiiRestore.documentation.details', {
      defaultMessage:
        'Reverses the anonymization performed by ai.pii. The token map is passed directly as a step input from the preceding ai.pii step output.',
    }),
    examples: [
      `## Restore PII in LLM response
\`\`\`yaml
- name: restore
  type: transform.pii_restore
  with:
    input: '{{ steps.proceed.output.response }}'
    tokenMap: '\${{ steps.anonymize.output.tokenMap }}'
\`\`\``,
    ],
  },
  inputSchema: TransformPiiRestoreInputSchema,
  outputSchema: TransformPiiRestoreOutputSchema,
};
