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
import { AI_CONNECTOR_FIELD_NOTES } from './docs';

/**
 * Step type ID for the AI classify step.
 */
export const AiClassifyStepTypeId = 'ai.classify';

export const ConfigSchema = z.object({
  'connector-id': z
    .string()
    .optional()
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.connectorId', {
        defaultMessage: 'GenAI connector to use.',
      })
    ),
});

export const CategorySchema = z.union([
  z.string(),
  z.object({ name: z.string(), description: z.string() }),
]);

export type Category = z.infer<typeof CategorySchema>;
export const getCategoryName = (category: Category): string =>
  typeof category === 'string' ? category : category.name;

/**
 * Input schema for the AI classify step.
 */
export const InputSchema = z.object({
  input: z.union([z.string(), z.array(z.unknown()), z.record(z.string(), z.unknown())]).describe(
    i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.input', {
      defaultMessage: 'Input to classify (string, array, or object).',
    })
  ),
  categories: z
    .array(CategorySchema)
    .min(1)
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.categories', {
        defaultMessage:
          'Allowed categories. Each entry is a plain category-name string, or an object with name and description.',
      })
    ),
  instructions: z
    .string()
    .optional()
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.instructions', {
        defaultMessage: 'Guidance for the classifier.',
      })
    ),
  allowMultipleCategories: z
    .boolean()
    .optional()
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.allowMultipleCategories', {
        defaultMessage: 'Allow the output to include more than one category.',
      })
    ),
  fallbackCategory: CategorySchema.optional().describe(
    i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.fallbackCategory', {
      defaultMessage:
        'Category returned when the model cannot confidently choose. Accepts a string or an object with name and description.',
    })
  ),
  includeRationale: z
    .boolean()
    .optional()
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.includeRationale', {
        defaultMessage: "Include the model's reasoning in the output.",
      })
    ),
  temperature: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.temperature', {
        defaultMessage: 'Model temperature (0–1).',
      })
    ),
});

/**
 * Output schema for the AI classify step.
 * This is the base schema - the dynamic schema will be created based on input parameters.
 */
export const OutputSchema = z.object({
  category: z
    .string()
    .optional()
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.output.category', {
        defaultMessage:
          'Present when allowMultipleCategories is false (default). Always the category name, even when you define the category as an object.',
      })
    ),
  categories: z
    .array(z.string())
    .optional()
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.output.categories', {
        defaultMessage: 'Present when allowMultipleCategories is true.',
      })
    ),
  rationale: z
    .string()
    .optional()
    .describe(
      i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.output.rationale', {
        defaultMessage: 'Present when includeRationale is true.',
      })
    ),
  metadata: z.record(z.string(), z.any()).describe(
    i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.schema.output.metadata', {
      defaultMessage: 'Always present.',
    })
  ),
});

export type AiClassifyStepConfigSchema = typeof ConfigSchema;
export type AiClassifyStepInputSchema = typeof InputSchema;
export type AiClassifyStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for AI classify step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const AiClassifyStepCommonDefinition: CommonStepDefinition<
  AiClassifyStepInputSchema,
  AiClassifyStepOutputSchema,
  AiClassifyStepConfigSchema
> = {
  id: AiClassifyStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.label', {
    defaultMessage: 'AI Classify',
  }),
  description: i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.description', {
    defaultMessage: 'Categorizes data into predefined categories using AI',
  }),
  documentation: {
    details: i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.documentation.details', {
      defaultMessage:
        'Classify input into one of a fixed set of categories. Optionally includes a rationale and supports multi-label classification. Category names in the output are always the name, never the description.',
    }),
    notes: [
      ...AI_CONNECTOR_FIELD_NOTES,
      i18n.translate('xpack.inferenceWorkflows.AiClassifyStep.documentation.notes.fallback', {
        defaultMessage:
          'Always set fallbackCategory in production. Without a fallback, a confused model can fail the step. With one, every invocation produces a usable category you can branch on with a switch or if.',
      }),
      i18n.translate(
        'xpack.inferenceWorkflows.AiClassifyStep.documentation.notes.categoryObjects',
        {
          defaultMessage:
            'Since 9.5, categories and fallbackCategory also accept an object with name and description. Descriptions are included in the classification prompt and do not appear in the output. You can mix plain strings and objects in the same categories list.',
        }
      ),
    ],
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

      `## Custom Instructions
\`\`\`yaml
- name: classify_incident
  type: ${AiClassifyStepTypeId}
  with:
    input: "{{ steps.get_incident.output }}"
    categories: ["Security", "Performance", "Network", "Application"]
    instructions: "Focus on root cause type. Ignore transient issues."
\`\`\``,

      `## Fallback Category
\`\`\`yaml
- name: classify_log
  type: ${AiClassifyStepTypeId}
  with:
    input: "{{ steps.get_log.output }}"
    categories: ["Authentication", "Authorization", "Data Access"]
    fallbackCategory: "Unknown"
\`\`\`
When the model cannot confidently match input to defined categories, the fallback category is used.`,

      `## Category descriptions
\`\`\`yaml
- name: classify_alert
  type: ${AiClassifyStepTypeId}
  connector-id: "my-bedrock"
  with:
    input: "{{ inputs.alert_narrative }}"
    categories:
      - name: "Phishing"
        description: "User-targeted deception to steal credentials or deliver malicious links; no sustained host compromise pattern required."
      - name: "Malware"
        description: "Execution of malicious code, ransomware, or clear C2/beaconing on an endpoint."
      - name: "Credential Access"
        description: "Brute force, password spraying, or secret dumping without confirmed large outbound data transfer."
    fallbackCategory:
      name: "Unknown"
      description: "Insufficient signal to map confidently to any defined category."
    includeRationale: true
\`\`\`
When you supply a description, the step includes it in the classification prompt. Output \`category\` / \`categories\` still contain only the category name.`,

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

      `## Custom Connector with Temperature
\`\`\`yaml
- name: classify_ticket
  type: ${AiClassifyStepTypeId}
  connector-id: "custom-classifier-model"
  with:
    input: "{{ steps.ticket_description.output }}"
    categories: ["Bug", "Feature Request", "Support"]
    temperature: 0.1
    instructions: "Prefer 'Bug' if any technical issue mentioned"
\`\`\``,

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
