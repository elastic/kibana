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
import { CONVERSATION_EVENT_TYPE_MAX_LENGTH } from '../../constants';

export const AddConversationEventStepTypeId = 'ai.conversation.add_event';

const InputSchema = z.object({
  conversation_id: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH).meta({
    description: 'The unique identifier of the conversation to append the event to.',
  }),
  type: z.string().min(1).max(CONVERSATION_EVENT_TYPE_MAX_LENGTH).meta({
    description:
      'The event type to append. Must be a custom event type registered by a plugin; built-in timeline event types are rejected.',
  }),
  data: z.record(z.string(), z.unknown()).default({}).meta({
    description:
      'The event payload. Its shape is defined by the registered event type and is validated against that type before the event is appended.',
  }),
});

const OutputSchema = z.object({
  conversation_id: z
    .string()
    .meta({ description: 'The ID of the conversation the event was appended to.' }),
  event_id: z.string().meta({ description: 'The server-assigned ID of the appended event.' }),
  type: z.string().meta({ description: 'The type of the appended event.' }),
  created_at: z
    .string()
    .meta({ description: 'The ISO timestamp assigned to the event by the server.' }),
});

export type AddConversationEventInputSchema = typeof InputSchema;
export type AddConversationEventOutputSchema = typeof OutputSchema;

export type AddConversationEventStepInput = z.infer<typeof InputSchema>;

export const addConversationEventStepCommonDefinition: CommonStepDefinition<
  AddConversationEventInputSchema,
  AddConversationEventOutputSchema
> = {
  id: AddConversationEventStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.workflowSteps.addConversationEvent.label', {
    defaultMessage: 'Add conversation event',
  }),
  description: i18n.translate('xpack.agentBuilder.workflowSteps.addConversationEvent.description', {
    defaultMessage: 'Appends a custom event to an agent conversation timeline.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.addConversationEvent.documentation.details',
      {
        defaultMessage:
          'Appends a custom event to the conversation timeline. The timeline is append-only, so events cannot be updated or removed once added. Only event types registered by a plugin are accepted, and the `data` payload is validated against the schema declared by that type; built-in timeline event types such as `user_message` are rejected. The step fails without writing anything if the type is unknown or the payload is invalid.',
      }
    ),
    examples: [
      `## Append a note to a conversation
\`\`\`yaml
- name: add_note
  type: ${AddConversationEventStepTypeId}
  with:
    conversation_id: "abc-123-def-456"
    type: text_note
    data:
      title: "Triage"
      text: "Escalated to the on-call engineer"
\`\`\``,
      `## Append a note from a trigger event
\`\`\`yaml
- name: add_note
  type: ${AddConversationEventStepTypeId}
  with:
    conversation_id: "{{ event.conversationId }}"
    type: text_note
    data:
      text: "Metadata changed: {{ event.changedFields }}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
