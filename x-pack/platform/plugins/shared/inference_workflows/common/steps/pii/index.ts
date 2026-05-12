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

const CustomPatternSchema = z.object({
  pattern: z.string().describe('Regex pattern to match PII'),
  entityClass: z.string().describe('Entity class label (e.g. EMPLOYEE_ID)'),
});

export const AiPiiInputSchema = z.object({
  sessionId: z
    .string()
    .describe('Session ID — used to look up the shared AnonymizationContext capability'),
  input: z
    .union([z.string(), z.array(z.unknown())])
    .describe('Text string or messages array to anonymize'),
  entities: z
    .array(z.string())
    .optional()
    .describe('Built-in entity class names to detect (IP, EMAIL, HOST_NAME)'),
  customPatterns: z.array(CustomPatternSchema).optional().describe('Additional custom regex rules'),
});

export const AiPiiOutputSchema = z.object({
  output: z.union([z.string(), z.array(z.unknown())]).describe('Anonymized text or messages array'),
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
        'Replaces personally identifiable information (PII) such as IP addresses, email addresses, and hostnames with deterministic anonymization tokens. The token map is stored in an AnonymizationContext keyed by sessionId — it never appears in the YAML workflow event. Use transform.pii_restore to reverse the process.',
    }),
    examples: [
      `## Anonymize messages before sending to LLM
\`\`\`yaml
- name: anonymize
  type: ai.pii
  with:
    sessionId: '{{ event.sessionId }}'
    input: '{{ event.messages }}'
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
  sessionId: z
    .string()
    .describe('Session ID — used to look up the shared AnonymizationContext capability'),
  input: z
    .union([z.string(), z.array(z.unknown())])
    .describe('Anonymized text or messages array containing PII tokens to restore'),
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
        'Reverses the anonymization performed by ai.pii. Looks up original values for each HMAC token using the AnonymizationContext keyed by sessionId. The token map never appears in the YAML workflow event.',
    }),
    examples: [
      `## Restore PII in LLM response
\`\`\`yaml
- name: restore
  type: transform.pii_restore
  with:
    sessionId: '{{ event.sessionId }}'
    input: '{{ event.response }}'
\`\`\``,
    ],
  },
  inputSchema: TransformPiiRestoreInputSchema,
  outputSchema: TransformPiiRestoreOutputSchema,
};
