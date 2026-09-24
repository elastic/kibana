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
import { MAX_IMPACT_ID_LENGTH } from '../constants';
import { impactEntitiesSchema } from '../impact';

export const GetImpactStepId = 'investigations.getImpact' as const;

export const getImpactStepInputSchema = z.object({
  conversationId: z
    .string()
    .min(1)
    .max(MAX_IMPACT_ID_LENGTH)
    .describe('Conversation whose impact to read.'),
});

export const getImpactStepOutputSchema = z.object({
  id: z.string(),
  entities: impactEntitiesSchema,
});

export const getImpactStepCommonDefinition: BaseStepDefinition<
  typeof getImpactStepInputSchema,
  typeof getImpactStepOutputSchema
> = {
  id: GetImpactStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.getImpact.label', {
    defaultMessage: 'Read investigation impact',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.getImpact.description', {
    defaultMessage: 'Reads the entities recorded against a conversation.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: getImpactStepInputSchema,
  outputSchema: getImpactStepOutputSchema,
  documentation: {
    details: i18n.translate('xpack.agenticInvestigations.steps.getImpact.documentation.details', {
      defaultMessage:
        'Returns the impact document for a conversation. Fails if none has been attached yet.',
    }),
    examples: [
      `- name: read_impact
  type: investigations.getImpact
  with:
    conversationId: "{{ inputs.conversationId }}"`,
    ],
  },
};
