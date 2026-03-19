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

/** Registered workflow step type id. */
export const AiGuardrailStepTypeId = 'ai.guardrail';

export const ConfigSchema = z.object({
  'connector-id': z.string().optional(),
});

const CustomPromptCheckConfigSchema = z.object({
  system_prompt_details: z.string(),
  inference_id: z.string().optional(),
  max_turns: z.number().optional(),
});

const CustomPromptCheckSchema = z.object({
  type: z.literal('custom_prompt'),
  config: CustomPromptCheckConfigSchema,
});

export const InputSchema = z.object({
  message: z.string().describe('Current user message (e.g. {{ inputs.prompt }}).'),
  conversation_history: z
    .array(z.any())
    .optional()
    .describe('Typically {{ inputs.conversation_history }} from the before-agent hook.'),
  attachments: z
    .array(z.any())
    .optional()
    .describe('Typically {{ inputs.attachments }} from the before-agent hook.'),
  previous_conversations: z.number().optional().describe('Keep only the last N history entries.'),
  on_fail: z
    .enum(['abort', 'monitor'])
    .default('abort')
    .describe("'abort' stops the agent; 'monitor' logs and continues."),
  abort_message: z.string().optional().describe('Message when aborting on failure.'),
  checks: z
    .array(CustomPromptCheckSchema)
    .min(1)
    .describe("Guardrail checks (supported type: 'custom_prompt')."),
});

export const OutputSchema = z.object({
  pass: z.boolean().describe('True if guardrail passed, false if evaluation failed.'),
  reason: z.string().optional().describe('When pass is false, explains why the guardrail failed.'),
  abort: z
    .boolean()
    .optional()
    .describe('When true and used in a guardrail workflow, the before-agent hook will abort.'),
  abort_message: z
    .string()
    .optional()
    .describe('Message shown when the workflow aborts agent execution.'),
});

export type AiGuardrailStepConfigSchema = typeof ConfigSchema;
export type AiGuardrailStepInputSchema = typeof InputSchema;
export type AiGuardrailStepOutputSchema = typeof OutputSchema;
export type CustomPromptGuardrailConfig = z.infer<typeof CustomPromptCheckConfigSchema>;

export const AiGuardrailStepCommonDefinition: CommonStepDefinition<
  AiGuardrailStepInputSchema,
  AiGuardrailStepOutputSchema,
  AiGuardrailStepConfigSchema
> = {
  id: AiGuardrailStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.guardrailStep.label', {
    defaultMessage: '[Experimental] AI Guardrail',
  }),
  description: i18n.translate('xpack.agentBuilder.guardrailStep.description', {
    defaultMessage:
      'Experimental: Declarative guardrail with hook-injected context; custom_prompt checks; abort or monitor on failure.',
  }),
  documentation: {
    details: i18n.translate('xpack.agentBuilder.guardrailStep.documentation.details', {
      defaultMessage: `The ${AiGuardrailStepTypeId} step evaluates the message using optional conversation_history and attachments from the before-agent hook. Map message from inputs.prompt. Use checks with type custom_prompt. on_fail: abort or monitor (shadow mode). Reference output with {templateSyntax}.`,
      values: { templateSyntax: '`{{ steps.stepName.output }}`' },
    }),
    examples: [
      `## Hook inputs + custom_prompt
\`\`\`yaml
- name: validate
  type: ${AiGuardrailStepTypeId}
  with:
    message: "{{ inputs.prompt }}"
    conversation_history: "{{ inputs.conversation_history }}"
    attachments: "{{ inputs.attachments }}"
    previous_conversations: 2
    on_fail: abort
    abort_message: "This message was blocked by a guardrail check."
    checks:
      - type: custom_prompt
        config:
          inference_id: "my-connector-id"
          system_prompt_details: "Determine if the request is acceptable."
          max_turns: 10
\`\`\``,
      `## Monitor (shadow) mode
\`\`\`yaml
- name: validate
  type: ${AiGuardrailStepTypeId}
  with:
    message: "{{ inputs.prompt }}"
    on_fail: monitor
    checks:
      - type: custom_prompt
        config:
          system_prompt_details: "Log violations without blocking."
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
