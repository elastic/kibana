/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';
import { ConversationIdSchema } from './conversation_schemas';

export const ConversationDeleteStepTypeId = 'conversations.delete';

const InputSchema = z.object({
  conversation_id: ConversationIdSchema,
});

const OutputSchema = z.object({
  success: z.boolean().describe('Whether the conversation was deleted.'),
});

export type ConversationDeleteInputSchema = typeof InputSchema;
export type ConversationDeleteOutputSchema = typeof OutputSchema;

export const conversationDeleteStepCommonDefinition: CommonStepDefinition<
  ConversationDeleteInputSchema,
  ConversationDeleteOutputSchema
> = {
  id: ConversationDeleteStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.conversationDeleteStep.label', {
    defaultMessage: 'Delete Conversation',
  }),
  description: i18n.translate('xpack.agentBuilder.conversationDeleteStep.description', {
    defaultMessage: 'Permanently delete a conversation.',
  }),
  documentation: {
    details: i18n.translate('xpack.agentBuilder.conversationDeleteStep.documentation.details', {
      defaultMessage:
        'Permanently deletes a conversation and its rounds. This cannot be undone. Requires delete access on the conversation; the step fails if the executing user lacks it or the conversation does not exist.',
    }),
    examples: [
      `## Delete a scratch conversation once the workflow is done with it
\`\`\`yaml
- name: cleanup_conversation
  type: ${ConversationDeleteStepTypeId}
  with:
    conversation_id: "{{ steps.create_conversation.output.id }}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
