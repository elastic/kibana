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
import { CONVERSATION_ID_MAX_LENGTH } from '@kbn/agent-builder-common';
import { AttachmentInputSchema } from '../../step_types/run_agent_step';

export const AddUserMessageStepTypeId = 'ai.conversation.add_user_message';

const InputSchema = z
  .object({
    conversation_id: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH).meta({
      description: 'The unique identifier of the conversation to add the user message to.',
    }),
    message: z.string().optional().meta({
      description: 'The user message text. Required unless attachments are provided.',
    }),
    attachments: z.array(AttachmentInputSchema).max(100).optional().meta({
      description:
        'Optional attachments to send with the user message. Required unless a message is provided.',
    }),
  })
  .refine((val) => Boolean(val.message?.trim()) || Boolean(val.attachments?.length), {
    message: 'A user message requires a non-empty message or at least one attachment',
  });

const OutputSchema = z.object({
  conversation_id: z
    .string()
    .meta({ description: 'The ID of the conversation the user message was added to.' }),
});

export type AddUserMessageInputSchema = typeof InputSchema;
export type AddUserMessageOutputSchema = typeof OutputSchema;

export type AddUserMessageStepInput = z.infer<typeof InputSchema>;

export const addUserMessageStepCommonDefinition: CommonStepDefinition<
  AddUserMessageInputSchema,
  AddUserMessageOutputSchema
> = {
  id: AddUserMessageStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.workflowSteps.addUserMessage.label', {
    defaultMessage: 'Add user message',
  }),
  description: i18n.translate('xpack.agentBuilder.workflowSteps.addUserMessage.description', {
    defaultMessage: 'Adds a user message to an agent conversation without running the agent.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.addUserMessage.documentation.details',
      {
        defaultMessage:
          'Adds a user message, with optional attachments, to an existing conversation without running the agent. The message becomes part of the conversation context, so the agent reads it the next time it runs on that conversation, for example from a later `ai.agent` step. The conversation must already exist; create one first with `ai.conversation.create` when needed.',
      }
    ),
    examples: [
      `## Add a message to a conversation
\`\`\`yaml
- name: add_message
  type: ${AddUserMessageStepTypeId}
  with:
    conversation_id: "abc-123-def-456"
    message: "The deployment finished at {{ event.timestamp }}"
\`\`\``,
      `## Add context, then run the agent on the same conversation
\`\`\`yaml
- name: create_conversation
  type: ai.conversation.create
  with:
    title: "Incident triage"

- name: add_alert
  type: ${AddUserMessageStepTypeId}
  with:
    conversation_id: "{{ steps.create_conversation.output.conversation_id }}"
    message: "A new alert fired"
    attachments:
      - type: text
        data:
          content: "{{ event.alert.reason }}"

- name: triage
  type: ai.agent
  with:
    conversation_id: "{{ steps.create_conversation.output.conversation_id }}"
    message: "Triage the alert above"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
