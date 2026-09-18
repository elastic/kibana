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
import { impactEntityIdsSchema } from '../impact';

export const AttachImpactStepId = 'investigations.attachImpact' as const;

export const attachImpactStepInputSchema = z.object({
  conversationId: z.string().describe('Conversation this impact belongs to.'),
  entityIds: impactEntityIdsSchema.describe(
    'Opaque ids of the entities this investigation is about. Merged onto any existing impact for the conversation.'
  ),
});

export const attachImpactStepOutputSchema = z.object({
  id: z.string(),
  entityIds: impactEntityIdsSchema,
});

export const attachImpactStepCommonDefinition: BaseStepDefinition<
  typeof attachImpactStepInputSchema,
  typeof attachImpactStepOutputSchema
> = {
  id: AttachImpactStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.attachImpact.label', {
    defaultMessage: 'Attach investigation impact',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.attachImpact.description', {
    defaultMessage:
      'Records the entities an investigation is about, merging them onto the conversation\u2019s existing impact document.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: attachImpactStepInputSchema,
  outputSchema: attachImpactStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.agenticInvestigations.steps.attachImpact.documentation.details',
      {
        defaultMessage:
          'One impact document per conversation. Attaching more entities unions them onto that document rather than appending a new one.',
      }
    ),
    examples: [
      `- name: attach_impact
  type: investigations.attachImpact
  with:
    conversationId: "{{ inputs.conversationId }}"
    entityIds:
      - "{{ inputs.userId }}"
      - "{{ inputs.hostId }}"`,
    ],
  },
};
