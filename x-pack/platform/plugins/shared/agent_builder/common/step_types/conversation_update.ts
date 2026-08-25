/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONVERSATION_TITLE_MAX_LENGTH } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';
import {
  ConversationIdSchema,
  ConversationMetadataSchema,
  ConversationSchema,
} from './conversation_schemas';

export const ConversationUpdateStepTypeId = 'ai.conversations.update';

const InputSchema = z.object({
  conversation_id: ConversationIdSchema,
  title: z.string().max(CONVERSATION_TITLE_MAX_LENGTH).optional().describe('New title.'),
  read: z.boolean().optional().describe('Whether the conversation is marked as read.'),
  pinned: z.boolean().optional().describe('Whether the conversation is pinned.'),
  metadata: ConversationMetadataSchema.optional().describe(
    'Template-defined metadata to store. Only accepted on conversations that have a template applied.'
  ),
  template_id: z.string().max(1024).optional().describe('ID of the conversation template.'),
  template_version: z.number().optional().describe('Version of the conversation template.'),
});

const OutputSchema = ConversationSchema;

export type ConversationUpdateInputSchema = typeof InputSchema;
export type ConversationUpdateOutputSchema = typeof OutputSchema;

export const conversationUpdateStepCommonDefinition: CommonStepDefinition<
  ConversationUpdateInputSchema,
  ConversationUpdateOutputSchema
> = {
  id: ConversationUpdateStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.conversationUpdateStep.label', {
    defaultMessage: 'Update Conversation',
  }),
  description: i18n.translate('xpack.agentBuilder.conversationUpdateStep.description', {
    defaultMessage: 'Update the title, read/pinned flags, or metadata of a conversation.',
  }),
  documentation: {
    details: i18n.translate('xpack.agentBuilder.conversationUpdateStep.documentation.details', {
      defaultMessage:
        'Updates presentation-level fields on a conversation. Only the supplied fields change; omitted fields are left untouched. Requires owner access. Rounds, timeline events, and access control cannot be changed through this step — rounds are written by agent executions, and the timeline is derived from them. Concurrent writes to the same conversation are retried automatically.',
    }),
    examples: [
      `## Rename a conversation
\`\`\`yaml
- name: rename_conversation
  type: ${ConversationUpdateStepTypeId}
  with:
    conversation_id: "{{ inputs.conversation_id }}"
    title: "Resolved: {{ inputs.alert_id }}"
\`\`\``,
      `## Pin a conversation and mark it unread for follow-up
\`\`\`yaml
- name: flag_conversation
  type: ${ConversationUpdateStepTypeId}
  with:
    conversation_id: "{{ inputs.conversation_id }}"
    pinned: true
    read: false
\`\`\``,
    ],
  },
  stability: 'tech_preview',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
