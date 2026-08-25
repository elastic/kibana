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
import { ConversationSummarySchema } from './conversation_schemas';

export const ConversationListStepTypeId = 'conversations.list';

const InputSchema = z.object({
  agent_id: z
    .string()
    .max(1024)
    .optional()
    .describe('Only return conversations bound to this agent.'),
});

const OutputSchema = z.array(ConversationSummarySchema);

export type ConversationListInputSchema = typeof InputSchema;
export type ConversationListOutputSchema = typeof OutputSchema;

export const conversationListStepCommonDefinition: CommonStepDefinition<
  ConversationListInputSchema,
  ConversationListOutputSchema
> = {
  id: ConversationListStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.conversationListStep.label', {
    defaultMessage: 'List Conversations',
  }),
  description: i18n.translate('xpack.agentBuilder.conversationListStep.description', {
    defaultMessage: 'List the conversations the executing user can access.',
  }),
  documentation: {
    details: i18n.translate('xpack.agentBuilder.conversationListStep.documentation.details', {
      defaultMessage:
        'Lists conversations visible to the executing user in the current space, optionally filtered by agent. Entries do not include rounds or timeline events; use the conversations.get step to read the full conversation for a specific ID.',
    }),
    examples: [
      `## List every accessible conversation
\`\`\`yaml
- name: list_conversations
  type: ${ConversationListStepTypeId}
  with: {}
\`\`\``,
      `## List conversations for one agent and read the most recent
\`\`\`yaml
- name: list_conversations
  type: ${ConversationListStepTypeId}
  with:
    agent_id: "my-custom-agent"

- name: read_latest
  type: conversations.get
  with:
    conversation_id: "{{ steps.list_conversations.output.0.id }}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
