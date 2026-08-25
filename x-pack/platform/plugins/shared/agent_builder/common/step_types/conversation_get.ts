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
import { ConversationIdSchema, ConversationSchema } from './conversation_schemas';

export const ConversationGetStepTypeId = 'conversations.get';

const InputSchema = z.object({
  conversation_id: ConversationIdSchema,
});

const OutputSchema = ConversationSchema;

export type ConversationGetInputSchema = typeof InputSchema;
export type ConversationGetOutputSchema = typeof OutputSchema;

export const conversationGetStepCommonDefinition: CommonStepDefinition<
  ConversationGetInputSchema,
  ConversationGetOutputSchema
> = {
  id: ConversationGetStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.conversationGetStep.label', {
    defaultMessage: 'Get Conversation',
  }),
  description: i18n.translate('xpack.agentBuilder.conversationGetStep.description', {
    defaultMessage: 'Retrieve a single conversation, including its rounds and timeline events.',
  }),
  documentation: {
    details: i18n.translate('xpack.agentBuilder.conversationGetStep.documentation.details', {
      defaultMessage:
        'Retrieves one conversation by ID. The output contains the conversation metadata, the full list of rounds, and the timeline events derived from those rounds. Only conversations the executing user can access are returned; an inaccessible or missing conversation fails the step the same way, so a workflow cannot use this step to probe for conversations it is not allowed to see.',
    }),
    examples: [
      `## Read a conversation created earlier in the workflow
\`\`\`yaml
- name: read_conversation
  type: ${ConversationGetStepTypeId}
  with:
    conversation_id: "{{ steps.create_conversation.output.id }}"
\`\`\``,
      `## Iterate over the conversation timeline
\`\`\`yaml
- name: read_conversation
  type: ${ConversationGetStepTypeId}
  with:
    conversation_id: "{{ inputs.conversation_id }}"

- name: log_events
  type: foreach
  foreach: "{{ steps.read_conversation.output.events }}"
  steps:
    - name: log_event
      type: console
      with:
        message: "{{ foreach.item.type }} at {{ foreach.item.created_at }}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
