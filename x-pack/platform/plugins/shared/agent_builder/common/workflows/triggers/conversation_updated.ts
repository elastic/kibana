/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { ConversationUpdatedTriggerId } from '@kbn/agent-builder-common';

export { ConversationUpdatedTriggerId };

const conversationChangeKindSchema = z.enum(['event', 'attachment', 'metadata', 'attributes']);

export const conversationUpdatedEventSchema = z.object({
  conversationId: z.string().meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.conversationId',
      { defaultMessage: 'The ID of the conversation that changed.' }
    ),
  }),
  templateId: z
    .string()
    .optional()
    .meta({
      description: i18n.translate(
        'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.templateId',
        { defaultMessage: 'The template that defines the metadata schema for this conversation.' }
      ),
    }),
  parentId: z
    .string()
    .optional()
    .meta({
      description: i18n.translate(
        'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.parentId',
        {
          defaultMessage: 'The ID of the parent conversation, when this conversation is a child.',
        }
      ),
    }),
  changeKinds: z.array(conversationChangeKindSchema).meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.changeKinds',
      {
        defaultMessage:
          'Which parts of the conversation this write touched: `event`, `attachment`, `metadata`, or `attributes`.',
      }
    ),
  }),
  eventTypes: z.array(z.string()).meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.eventTypes',
      {
        defaultMessage:
          'Timeline event types included in this write, such as `user_message` or `attachment_added`. Empty when the write was not an event append.',
      }
    ),
  }),
  changedFields: z.array(z.string()).meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.changedFields',
      {
        defaultMessage: 'Metadata field names that changed. Empty when metadata was not written.',
      }
    ),
  }),
  contentChange: z.boolean().meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.contentChange',
      {
        defaultMessage:
          'True when the write added content a summary should reflect: a message, an attachment, a custom event, a non-summary metadata change, or an attribute such as the title. Execution lifecycle events leave this false.',
      }
    ),
  }),
  summaryOnly: z.boolean().meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.summaryOnly',
      { defaultMessage: 'True when the only change is the `summary` metadata field.' }
    ),
  }),
});

export const conversationUpdatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: ConversationUpdatedTriggerId,
  stability: 'tech_preview',
  eventSchema: conversationUpdatedEventSchema,
  title: i18n.translate('xpack.agentBuilder.workflowTriggers.conversationUpdated.title', {
    defaultMessage: 'Agent Builder - Conversation updated',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowTriggers.conversationUpdated.description',
    {
      defaultMessage:
        'Emitted after a conversation document changes: a message, timeline event, attachment, metadata write, or attribute update.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.documentation.details',
      {
        defaultMessage:
          'Emitted after any successful persist that changes a conversation. Use event.templateId, event.changeKinds, event.eventTypes, event.contentChange, and event.summaryOnly to subscribe to the changes you care about. Execution lifecycle events are included with contentChange false so a subscriber can ignore them. A write whose only metadata change is `summary` has summaryOnly true.',
      }
    ),
    examples: [
      `## Summarize an investigation when its content changes
\`\`\`yaml
version: '1'
name: Summarize investigation
triggers:
  - type: ${ConversationUpdatedTriggerId}
    on:
      condition: 'event.contentChange: true and event.summaryOnly: false and (event.templateId: "investigation" or event.templateId: "escalation")'
steps:
  - name: note
    type: console
    with:
      message: Conversation {{ event.conversationId }} changed
\`\`\``,
    ],
  },
};
