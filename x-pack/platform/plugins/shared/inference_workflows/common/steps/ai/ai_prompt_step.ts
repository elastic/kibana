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

/**
 * Step type ID for the AI prompt step.
 */
export const AiPromptStepTypeId = 'ai.prompt';

/**
 * A connector field that renders to an empty or blank string (for example a templated value that
 * is not set on this path) counts as absent, so one step can list both connector fields.
 */
export const normalizeOptionalConnectorParam = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/**
 * Validation message shown when `aggregate-by` is set without a `plugin-id`: the parent rollup id
 * only means something next to the attribution id it groups.
 */
export const AGGREGATE_BY_REQUIRES_PLUGIN_ID_MESSAGE =
  '`aggregate-by` can only be set when `plugin-id` is also set.';

export const ConfigSchema = z
  .object({
    'connector-id': z.string().max(255).optional(),
    'max-step-size': z
      .string()
      .max(32)
      .optional()
      .describe(
        'Maximum response size for this workflow step. Also used as the response content length limit of the LLM call.'
      ),
    'plugin-id': z
      .string()
      .max(255)
      .optional()
      .describe(
        "The feature id to attribute this step's LLM call to in token usage tracking and connector telemetry. When omitted, no telemetry metadata is sent."
      ),
    'aggregate-by': z
      .string()
      .max(255)
      .optional()
      .describe(
        "The parent feature id to group this step's token usage under. Only used when `plugin-id` is set."
      ),
    'product-solution': z
      .string()
      .max(255)
      .optional()
      .describe(
        'The product solution to attribute this step to. Ignored when `plugin-id` is not set.'
      ),
    'product-feature': z
      .string()
      .max(255)
      .optional()
      .describe(
        'The product feature to attribute this step to. Ignored when `plugin-id` is not set.'
      ),
    'reasoning-level': z
      .enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])
      .optional()
      .describe(
        '[tech preview] Reasoning effort level forwarded to the LLM. One of: none, minimal, low, medium, high, xhigh. Support depends on the underlying model and provider.'
      ),
    'connector-id-by-feature': z
      .union([z.string().max(255), z.array(z.string().max(255)).max(8)])
      .optional()
      .describe(
        'A Model Management feature id, or an ordered list of them. An id that is not registered is skipped. Each id contributes a connector only when one is configured for it; otherwise the next id is tried. A configured connector is mutually exclusive with connector-id. A list where every id misses is not a conflict. Example: "context_engine_prompt".'
      ),
  })
  .superRefine((cfg, ctx) => {
    const connectorByFeatureRaw = cfg['connector-id-by-feature'];
    const connectorByFeature =
      typeof connectorByFeatureRaw === 'string'
        ? normalizeOptionalConnectorParam(connectorByFeatureRaw)
        : undefined;
    if (
      normalizeOptionalConnectorParam(cfg['connector-id']) !== undefined &&
      connectorByFeature !== undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot specify both connector-id and connector-id-by-feature.',
        path: ['connector-id-by-feature'],
      });
    }
    if (
      normalizeOptionalConnectorParam(cfg['aggregate-by']) !== undefined &&
      normalizeOptionalConnectorParam(cfg['plugin-id']) === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: AGGREGATE_BY_REQUIRES_PLUGIN_ID_MESSAGE,
        path: ['aggregate-by'],
      });
    }
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
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  schema: JsonModelShapeSchema.optional().describe('The schema for the output of the step.'),
  temperature: z.number().min(0).max(1).optional(),
  /**
   * EIS prompt template id. Used only when the resolved connector's
   * `capabilities.templates.policy` is `required`. Otherwise the step ignores
   * these fields and sends `prompt`. The id starts with a dot.
   */
  template_id: z
    .string()
    .max(128)
    .optional()
    .describe(
      'Pinned EIS prompt template id, including the leading dot. Sent instead of the prompt when the connector requires templates.'
    ),
  template_version: z
    .number()
    .int()
    .positive()
    .max(1_000_000)
    .optional()
    .describe(
      'Pinned EIS prompt template version. Required with template_id when the connector requires templates.'
    ),
  template_variables: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Variables for template_id. Ignored when the connector does not require a template.'),
});

export function getStructuredOutputSchema(contentSchema: z.ZodType) {
  return z.object({
    content: contentSchema,
    metadata: MetadataSchema,
  });
}

const StringOutputSchema = z.object({
  content: z.string(),
  metadata: MetadataSchema,
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
    details: i18n.translate('xpack.inferenceWorkflows.AiPromptStep.documentation.details', {
      defaultMessage:
        'The {stepTypeId} step sends a prompt to an AI connector and returns the response. The response can be referenced in later steps using template syntax.',
      values: { stepTypeId: AiPromptStepTypeId },
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
