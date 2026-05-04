/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory, type BaseStepDefinition } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

export const AiClassifyStepTypeId = 'ai.classify';

export const ConfigSchema = z.object({
  'connector-id': z.string().optional(),
});

export const InputSchema = z.object({
  input: z.union([z.string(), z.array(z.unknown()), z.record(z.string(), z.unknown())]),
  categories: z.array(z.string()).min(1),
  instructions: z.string().optional(),
  allowMultipleCategories: z.boolean().optional(),
  fallbackCategory: z.string().optional(),
  includeRationale: z.boolean().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

export const OutputSchema = z.object({
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  rationale: z.string().optional(),
  metadata: z.record(z.string(), z.any()),
});

export type AiClassifyStepConfigSchema = typeof ConfigSchema;
export type AiClassifyStepInputSchema = typeof InputSchema;
export type AiClassifyStepOutputSchema = typeof OutputSchema;

export const AiClassifyStepCommonDefinition: BaseStepDefinition<
  AiClassifyStepInputSchema,
  AiClassifyStepOutputSchema,
  AiClassifyStepConfigSchema
> = {
  id: AiClassifyStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.inference.workflowSteps.aiClassify.label', {
    defaultMessage: 'AI Classify',
  }),
  description: i18n.translate('xpack.inference.workflowSteps.aiClassify.description', {
    defaultMessage: 'Categorizes data into predefined categories using AI',
  }),
  documentation: {
    details: i18n.translate('xpack.inference.workflowSteps.aiClassify.documentation.details', {
      defaultMessage: `The ${AiClassifyStepTypeId} step categorizes input data into predefined categories using an AI connector. The classification result can be referenced in later steps using template syntax.`,
      values: { templateSyntax: '`{{ steps.stepName.output }}`' },
    }),
    examples: [
      `## Basic Classification
\`\`\`yaml
- name: classify_alert
  type: ${AiClassifyStepTypeId}
  with:
    input: "{{ steps.fetch_alert.output }}"
    categories: ["Critical", "Warning", "Info"]
\`\`\`
The default AI connector configured for the workflow will be used.`,

      `## Multi-label Classification with Rationale
\`\`\`yaml
- name: tag_alert
  type: ${AiClassifyStepTypeId}
  with:
    input: "{{ steps.alert_details.output }}"
    categories: ["High Priority", "Security", "Performance", "User Impacting"]
    allowMultipleCategories: true
    includeRationale: true
    instructions: "Select all applicable tags"
\`\`\`
When \`allowMultipleCategories\` is true, the output includes a \`categories\` array. When \`includeRationale\` is true, the output includes a \`rationale\` field.`,

      `## Use classification in subsequent steps
\`\`\`yaml
- name: classify_severity
  type: ${AiClassifyStepTypeId}
  with:
    input: "{{ steps.get_incident_details.output }}"
    categories: ["Critical", "High", "Medium", "Low"]
    includeRationale: true
- name: notify_team
  type: http
  with:
    url: "https://api.example.com/notify"
    body:
      severity: "{{ steps.classify_severity.output.category }}"
      reason: "{{ steps.classify_severity.output.rationale }}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};

/**
 * Builds a dynamic Zod schema for structured output based on AI classification step inputs.
 */
export function buildStructuredOutputSchema(
  params: z.infer<AiClassifyStepInputSchema>
): typeof OutputSchema {
  const { allowMultipleCategories, includeRationale } = params;

  const shape: Record<string, z.ZodType> = {
    metadata: z.record(z.string(), z.any()),
  };

  if (allowMultipleCategories) {
    shape.categories = z.array(z.string());
  } else {
    shape.category = z.string();
  }

  if (includeRationale) {
    shape.rationale = z.string();
  }

  return z.object(shape) as typeof OutputSchema;
}
