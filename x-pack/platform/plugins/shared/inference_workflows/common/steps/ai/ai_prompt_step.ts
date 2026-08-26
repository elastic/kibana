/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { JsonModelShapeSchema } from '@kbn/workflows/spec/schema/common/json_model_shape_schema';
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { AI_CONNECTOR_FIELD_NOTES } from './docs';

/**
 * Step type ID for the AI prompt step.
 */
export const AiPromptStepTypeId = 'ai.prompt';

export const ConfigSchema = z.object({
  'connector-id': z
    .string()
    .optional()
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiPromptStep.schema.connectorId', {
        defaultMessage:
          'The GenAI connector to use. Defaults to the workflow default connector if omitted.',
      })
    ),
});

// Maybe we can define specific schema for metadata in the future
// For now it's a record with string keys and any values
// Because langchain returns it this format
export const MetadataSchema = z.record(z.string(), z.any());

/**
 * Input schema for the AI prompt step.
 * Uses variables structure with key->value pairs.
 */
export const InputSchema = z.object({
  prompt: z.string().describe(
    i18n.translate('xpack.inferenceWorkflows.AiPromptStep.schema.prompt', {
      defaultMessage: 'Prompt text. Supports Liquid templating.',
    })
  ),
  systemPrompt: z
    .string()
    .optional()
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiPromptStep.schema.systemPrompt', {
        defaultMessage: 'System prompt sent before the user prompt.',
      })
    ),
  schema: JsonModelShapeSchema.optional().describe(
    i18n.translate('xpack.inferenceWorkflows.AiPromptStep.schema.schema', {
      defaultMessage: 'JSON Schema for structured output.',
    })
  ),
  temperature: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiPromptStep.schema.temperature', {
        defaultMessage: 'Model temperature (0–1). Lower values are more deterministic.',
      })
    ),
});

export function getStructuredOutputSchema(contentSchema: z.ZodType) {
  return z.object({
    content: contentSchema,
    metadata: MetadataSchema,
  });
}

const StringOutputSchema = z.object({
  content: z.string().describe(
    i18n.translate('xpack.inferenceWorkflows.AiPromptStep.schema.output.content', {
      defaultMessage:
        'Free-text response, or a structured object matching schema when schema is provided.',
    })
  ),
  metadata: MetadataSchema.describe(
    i18n.translate('xpack.inferenceWorkflows.AiPromptStep.schema.output.metadata', {
      defaultMessage: 'Model metadata returned with the response.',
    })
  ),
});

/**
 * Output schema for the AI prompt step.
 * Uses variables structure with key->value pairs.
 */
export const OutputSchema = z.union([StringOutputSchema, getStructuredOutputSchema(z.unknown())]);

export type AiPromptStepConfigSchema = typeof ConfigSchema;
export type AiPromptStepInputSchema = typeof InputSchema;
export type AiPromptStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for AI prompt step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const AiPromptStepCommonDefinition: CommonStepDefinition<
  AiPromptStepInputSchema,
  AiPromptStepOutputSchema,
  AiPromptStepConfigSchema
> = {
  id: AiPromptStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.inferenceWorkflows.AiPromptStep.label', {
    defaultMessage: 'AI Prompt',
  }),
  description: i18n.translate('xpack.inferenceWorkflows.AiPromptStep.description', {
    defaultMessage: 'Sends a prompt to an AI connector and returns the response',
  }),
  documentation: {
    notes: AI_CONNECTOR_FIELD_NOTES,
    details: i18n.translate('xpack.inferenceWorkflows.AiPromptStep.documentation.details', {
      defaultMessage:
        'Call an LLM with a prompt. Supports optional structured output through a JSON Schema. When schema is provided, the structured result is available at {outputPath}.',
      values: { outputPath: 'steps.<name>.output.content' },
    }),
    examples: [
      `## Basic AI prompt
\`\`\`yaml
- name: ask_ai
  type: ${AiPromptStepTypeId}
  with:
    prompt: "What is the weather like today?"
\`\`\`
The default AI connector configured for the workflow will be used.`,
      `## AI prompt with dynamic input
\`\`\`yaml
- name: analyze_data
  type: ${AiPromptStepTypeId}
  connector-id: ai_connector
  with:
    prompt: "Analyze this data: {{ steps.previous_step.output }}"
\`\`\``,

      `## AI prompt with structured output schema.
Output schema must be a valid JSON Schema object.
See this [JSON Schema reference](https://json-schema.org/learn/getting-started-step-by-step) for details.
\`\`\`yaml
- name: extract_info
  type: ${AiPromptStepTypeId}
  connector-id: my-ai-connector
  with:
    prompt: "Extract key information from this text: {{ workflow.input }}"
    schema:
      type: "object"
      properties:
        summary:
          type: "string"
        key_points:
          type: "array"
          items:
            type: "string"
\`\`\``,

      `## AI prompt with structured output schema (JSON object syntax)
See this [JSON Schema reference](https://json-schema.org/learn/getting-started-step-by-step) for details.
\`\`\`yaml
- name: extract_info
  type: ${AiPromptStepTypeId}
  connector-id: my-ai-connector
  with:
    prompt: "Extract key information from this text: {{ workflow.input }}"
    schema: {
      "type":"object",
      "properties":{
        "summary":{
          "type":"string"
        },
        "key_points":{
          "type":"array",
          "items":{
            "type":"string"
          }
        }
      }
\`\`\``,

      `## Use AI response in subsequent steps
\`\`\`yaml
- name: get_recommendation
  type: ${AiPromptStepTypeId}
  connector-id: "my-ai-connector"
  with:
    prompt: "Provide a recommendation based on this data"
- name: process_recommendation
  type: http
  with:
    url: "https://api.example.com/process"
    body: "{{ steps.get_recommendation.output }}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
