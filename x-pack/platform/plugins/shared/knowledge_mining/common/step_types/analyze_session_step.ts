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

export const AnalyzeSessionStepTypeId = 'knowledge-mining:analyze-session';

export const InputSchema = z.object({
  conversation_id: z
    .string()
    .describe('The ID of the conversation to analyze for knowledge extraction.'),
});

export const OutputSchema = z.object({
  suggestions_created: z
    .number()
    .describe('The number of knowledge suggestions created from the conversation.'),
  message: z.string().describe('A summary of the analysis results.'),
});

export const ConfigSchema = z.object({});

export type AnalyzeSessionInputSchema = typeof InputSchema;
export type AnalyzeSessionOutputSchema = typeof OutputSchema;
export type AnalyzeSessionConfigSchema = typeof ConfigSchema;

export const analyzeSessionStepCommonDefinition: CommonStepDefinition<
  AnalyzeSessionInputSchema,
  AnalyzeSessionOutputSchema,
  AnalyzeSessionConfigSchema
> = {
  id: AnalyzeSessionStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.knowledgeMining.analyzeSessionStep.label', {
    defaultMessage: 'Analyze Session for Knowledge',
  }),
  description: i18n.translate('xpack.knowledgeMining.analyzeSessionStep.description', {
    defaultMessage:
      'Analyze a conversation session to extract persistent knowledge suggestions. Compares against existing memories to avoid duplicates.',
  }),
  documentation: {
    details: i18n.translate('xpack.knowledgeMining.analyzeSessionStep.documentation.details', {
      defaultMessage:
        'This step reads a conversation, fetches existing memories for context, and uses an LLM to produce create/update/delete suggestions for the knowledge base.',
    }),
    examples: [
      `## Basic usage
\`\`\`yaml
- name: analyze
  type: ${AnalyzeSessionStepTypeId}
  with:
    conversation_id: "{{ trigger.conversation_id }}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
