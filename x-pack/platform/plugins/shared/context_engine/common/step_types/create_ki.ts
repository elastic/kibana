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
import { aiIndexIdSchema, kiFieldsSchema, kiIdSchema } from './ki';

export const CREATE_KI_STEP_ID = 'context-engine.createKi' as const;

export const createKiInputSchema = z.object({
  ai_index_id: aiIndexIdSchema,
  ki_id: kiIdSchema
    .optional()
    .describe(
      'Optional document id for the knowledge indicator (index-backed AI indices only); a KI with the same id is replaced. When omitted, the id is generated.'
    ),
  ki: kiFieldsSchema.describe('The knowledge indicator document to create'),
});

export const createKiOutputSchema = z.object({
  id: z.string().describe('The document id of the created knowledge indicator'),
});

export const createKiStepCommonDefinition: CommonStepDefinition<
  typeof createKiInputSchema,
  typeof createKiOutputSchema
> = {
  id: CREATE_KI_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.createKi.label', {
    defaultMessage: 'Create Knowledge Indicator',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.createKi.description', {
    defaultMessage: 'Create a knowledge indicator (KI) in an AI index.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: createKiInputSchema,
  outputSchema: createKiOutputSchema,
  documentation: {
    details: i18n.translate('xpack.contextEngine.workflows.steps.createKi.documentation.details', {
      defaultMessage:
        'Indexes a knowledge indicator document into the backing store of the specified AI index. ' +
        'When the AI index does not exist yet, it is created automatically with an index backing ' +
        'store derived from its id. Pass ki_id to set a stable document id (index-backed only); ' +
        're-runs with the same id replace the KI. The step returns the document id of the ' +
        'created KI, which can be used by later steps to update or delete it.',
    }),
    examples: [
      `## Create a knowledge indicator
\`\`\`yaml
- name: create_ki
  type: ${CREATE_KI_STEP_ID}
  with:
    ai_index_id: "my-ai-index"
    ki_id: "logs-index-profile"
    ki:
      type: "index_metadata"
      title: "logs-* index profile"
      description: "Profile of the logs indices"
      content: "Backing index: logs-*"
      tags:
        - "logs"
\`\`\``,
    ],
  },
};
