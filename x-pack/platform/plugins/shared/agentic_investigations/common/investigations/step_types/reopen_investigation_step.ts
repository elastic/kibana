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

const MAX_CONVERSATION_ID_LENGTH = 256;

export const ReopenInvestigationStepId = 'investigations.reopen' as const;

export const reopenInvestigationStepInputSchema = z.object({
  conversationId: z
    .string()
    .min(1)
    .max(MAX_CONVERSATION_ID_LENGTH)
    .describe('Investigation to reopen.'),
});

export const reopenInvestigationStepOutputSchema = z.object({
  reopened: z
    .boolean()
    .describe(
      'True when the investigation was closed and has been reopened; false when it was already open.'
    ),
  title: z.string().describe('Current title of the investigation after the step ran.'),
});

export const reopenInvestigationStepCommonDefinition: BaseStepDefinition<
  typeof reopenInvestigationStepInputSchema,
  typeof reopenInvestigationStepOutputSchema
> = {
  id: ReopenInvestigationStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.reopenInvestigation.label', {
    defaultMessage: 'Reopen investigation',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.reopenInvestigation.description', {
    defaultMessage:
      'Reopens a closed investigation and prepends "[Reopen] " to its title. No-op when the investigation is already open.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: reopenInvestigationStepInputSchema,
  outputSchema: reopenInvestigationStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.agenticInvestigations.steps.reopenInvestigation.documentation.details',
      {
        defaultMessage:
          'Sets the investigation status to open and prefixes the title with "[Reopen] " (idempotent). ' +
          'Returns reopened: false and the unchanged title when the investigation was already open.',
      }
    ),
    examples: [
      `- name: reopen_investigation
  type: investigations.reopen
  with:
    conversationId: "\${{ inputs.conversationId }}"`,
    ],
  },
};
