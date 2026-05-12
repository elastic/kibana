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

/**
 * Step type ID for the AI summarize step.
 */
export const AiSummarizeStepTypeId = 'ai.summarize';

export const ConfigSchema = z.object({
  'connector-id': z.string().optional(),
});

/**
 * Input schema for the AI summarize step.
 */
export const InputSchema = z.object({
  input: z.union([z.string(), z.array(z.unknown()), z.record(z.string(), z.unknown())]),
  instructions: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

/**
 * Output schema for the AI summarize step.
 */
export const OutputSchema = z.object({
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type AiSummarizeStepConfigSchema = typeof ConfigSchema;
export type AiSummarizeStepInputSchema = typeof InputSchema;
export type AiSummarizeStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for AI summarize step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const AiSummarizeStepCommonDefinition: BaseStepDefinition<
  AiSummarizeStepInputSchema,
  AiSummarizeStepOutputSchema,
  AiSummarizeStepConfigSchema
> = {
  id: AiSummarizeStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('inferenceWorkflows.AiSummarizeStep.label', {
    defaultMessage: 'AI Summarize',
  }),
  description: i18n.translate('inferenceWorkflows.AiSummarizeStep.description', {
    defaultMessage: 'Generates a summary of the provided content using AI',
  }),
  documentation: {
    details: i18n.translate('inferenceWorkflows.AiSummarizeStep.documentation.details', {
      defaultMessage: `The ${AiSummarizeStepTypeId} step generates a concise summary of the provided content using an AI connector.`,
      values: { templateSyntax: '`{{ steps.stepName.output }}`' },
    }),
    examples: [
      `## Basic Summarization
\`\`\`yaml
- name: summarize_logs
  type: ${AiSummarizeStepTypeId}
  with:
    input: "{{ steps.fetch_logs.output }}"
\`\`\`
The default AI connector configured for the workflow will be used.`,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
