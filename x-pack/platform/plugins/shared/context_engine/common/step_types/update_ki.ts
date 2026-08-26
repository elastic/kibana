/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { aiIndexIdSchema, kiIdSchema, kiPartialFieldsSchema } from './ki';

export const UPDATE_KI_STEP_ID = 'context-engine.updateKi' as const;

export const updateKiInputSchema = z.object({
  ai_index_id: aiIndexIdSchema,
  ki_id: kiIdSchema,
  ki: kiPartialFieldsSchema.describe('The knowledge indicator fields to update'),
});

export const updateKiOutputSchema = z.object({
  id: z.string().describe('The document id of the updated knowledge indicator'),
  result: z
    .enum(['updated', 'noop'])
    .describe('Whether the update changed the document or was a no-op'),
});

export const updateKiStepCommonDefinition: CommonStepDefinition<
  typeof updateKiInputSchema,
  typeof updateKiOutputSchema
> = {
  id: UPDATE_KI_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.updateKi.label', {
    defaultMessage: 'Update Knowledge Indicator',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.updateKi.description', {
    defaultMessage: 'Update an existing knowledge indicator (KI) in an AI index.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: updateKiInputSchema,
  outputSchema: updateKiOutputSchema,
  documentation: {
    details: i18n.translate('xpack.contextEngine.workflows.steps.updateKi.documentation.details', {
      defaultMessage:
        'Applies a partial update to a knowledge indicator document in the backing store of the ' +
        'specified AI index. Only the provided fields are changed. The step fails when the KI does ' +
        'not exist in the AI index.',
    }),
    examples: [
      `## Update a knowledge indicator
\`\`\`yaml
- name: update_ki
  type: ${UPDATE_KI_STEP_ID}
  with:
    ai_index_id: "my-ai-index"
    ki_id: "{{ steps.create_ki.output.id }}"
    ki:
      description: "Updated description"
      tags:
        - "logs"
        - "reviewed"
\`\`\``,
    ],
  },
};
