/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { ConversationMetadataUpdatedTriggerId } from '@kbn/agent-builder-common';

export { ConversationMetadataUpdatedTriggerId };

const conversationMetadataUpdatedEventSchema = z.object({
  conversationId: z.string().meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationMetadataUpdated.eventSchema.conversationId',
      { defaultMessage: 'The ID of the conversation whose metadata was updated.' }
    ),
  }),
  templateId: z
    .string()
    .optional()
    .meta({
      description: i18n.translate(
        'xpack.agentBuilder.workflowTriggers.conversationMetadataUpdated.eventSchema.templateId',
        { defaultMessage: 'The template that defines the metadata schema for this conversation.' }
      ),
    }),
  parentId: z
    .string()
    .optional()
    .meta({
      description: i18n.translate(
        'xpack.agentBuilder.workflowTriggers.conversationMetadataUpdated.eventSchema.parentId',
        {
          defaultMessage:
            'The ID of the parent conversation, when this conversation is a child (e.g. a sub-agent).',
        }
      ),
    }),
  changedFields: z.array(z.string()).meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationMetadataUpdated.eventSchema.changedFields',
      {
        defaultMessage:
          'Names of the metadata fields that changed in this write. Use this to subscribe only to specific fields such as `status`, `decision`, or `severity`.',
      }
    ),
  }),
});

export type { ConversationMetadataUpdatedEvent } from '@kbn/agent-builder-common';

export const conversationMetadataUpdatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: ConversationMetadataUpdatedTriggerId,
  stability: 'tech_preview',
  eventSchema: conversationMetadataUpdatedEventSchema,
  title: i18n.translate('xpack.agentBuilder.workflowTriggers.conversationMetadataUpdated.title', {
    defaultMessage: 'Agent Builder - Conversation metadata updated',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowTriggers.conversationMetadataUpdated.description',
    {
      defaultMessage:
        'Emitted after a validated metadata write changes at least one field on a conversation.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationMetadataUpdated.documentation.details',
      {
        defaultMessage:
          'Emitted after a metadata write succeeds and changes at least one field. The payload includes event.conversationId, event.templateId (if set), event.parentId (for child conversations), and event.changedFields (names of fields that changed). Use event.changedFields in trigger conditions to react only to specific fields such as `status`, `decision`, or `severity`.',
      }
    ),
    examples: [
      `## Resume workflow when a proposal decision is recorded
\`\`\`yaml
version: '1'
name: Handle proposal decision
triggers:
  - type: ${ConversationMetadataUpdatedTriggerId}
    on:
      condition: 'event.changedFields: "decision"'
steps:
  - name: handle_decision
    type: console
    with:
      message: Decision recorded
\`\`\``,
      `## React to severity changes on a specific template
\`\`\`yaml
version: '1'
name: React to severity change
triggers:
  - type: ${ConversationMetadataUpdatedTriggerId}
    on:
      condition: 'event.templateId: "investigation" and event.changedFields: "severity"'
steps:
  - name: notify
    type: console
    with:
      message: Severity changed
\`\`\``,
    ],
  },
};
