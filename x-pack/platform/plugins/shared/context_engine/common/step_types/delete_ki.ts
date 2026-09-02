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
import { aiIndexIdSchema, kiIdSchema } from './ki';

export const DELETE_KI_STEP_ID = 'context-engine.deleteKi' as const;

export const deleteKiInputSchema = z.object({
  ai_index_id: aiIndexIdSchema,
  ki_id: kiIdSchema,
});

export const deleteKiOutputSchema = z.object({
  id: z.string().describe('The document id of the deleted knowledge indicator'),
});

export const deleteKiStepCommonDefinition: CommonStepDefinition<
  typeof deleteKiInputSchema,
  typeof deleteKiOutputSchema
> = {
  id: DELETE_KI_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.deleteKi.label', {
    defaultMessage: 'Delete Knowledge Indicator',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.deleteKi.description', {
    defaultMessage: 'Delete a knowledge indicator (KI) from an AI index.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: deleteKiInputSchema,
  outputSchema: deleteKiOutputSchema,
  documentation: {
    details: i18n.translate('xpack.contextEngine.workflows.steps.deleteKi.documentation.details', {
      defaultMessage:
        'Deletes a knowledge indicator document from the backing store of the specified AI index. ' +
        'The step fails when the KI does not exist in the AI index.',
    }),
    examples: [
      `## Delete a knowledge indicator
\`\`\`yaml
- name: delete_ki
  type: ${DELETE_KI_STEP_ID}
  with:
    ai_index_id: "my-ai-index"
    ki_id: "{{ steps.create_ki.output.id }}"
\`\`\``,
    ],
  },
};
