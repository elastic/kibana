/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BaseStepDefinition } from '@kbn/workflows';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

const MAX_ID_LENGTH = 256;

export const AppendWorkflowExecutionIdStepId = 'investigations.appendWorkflowExecutionId' as const;

export const appendWorkflowExecutionIdStepInputSchema = z.object({
  conversationId: z.string().min(1).max(MAX_ID_LENGTH).describe('Investigation conversation ID.'),
  workflowExecutionId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('Workflow execution to append.'),
});

export const appendWorkflowExecutionIdStepOutputSchema = z.object({
  workflowExecutionId: z.string(),
});

export const appendWorkflowExecutionIdStepCommonDefinition: BaseStepDefinition<
  typeof appendWorkflowExecutionIdStepInputSchema,
  typeof appendWorkflowExecutionIdStepOutputSchema
> = {
  id: AppendWorkflowExecutionIdStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.appendWorkflowExecutionId.stepLabel', {
    defaultMessage: 'Append investigation workflow execution',
  }),
  description: i18n.translate(
    'xpack.agenticInvestigations.steps.appendWorkflowExecutionId.stepDescription',
    {
      defaultMessage:
        'Adds a workflow execution to an investigation without duplicating existing IDs.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: appendWorkflowExecutionIdStepInputSchema,
  outputSchema: appendWorkflowExecutionIdStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.agenticInvestigations.steps.appendWorkflowExecutionId.documentation.detailsDescription',
      {
        defaultMessage:
          'Appends the execution ID to workflow_execution_ids on an investigation conversation. Existing IDs keep their order. An ID already present is left unchanged.',
      }
    ),
    examples: [
      `- name: append_workflow_execution
  type: investigations.appendWorkflowExecutionId
  with:
    conversationId: "{{ inputs.conversationId }}"
    workflowExecutionId: "{{ execution.id }}"`,
    ],
  },
};
