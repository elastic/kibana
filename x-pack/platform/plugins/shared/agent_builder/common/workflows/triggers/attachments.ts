/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import {
  ConversationAttachmentAddedTriggerId,
  ConversationAttachmentUpdatedTriggerId,
  ConversationAttachmentDeletedTriggerId,
} from '@kbn/agent-builder-common';

export {
  ConversationAttachmentAddedTriggerId,
  ConversationAttachmentUpdatedTriggerId,
  ConversationAttachmentDeletedTriggerId,
};

export type { ConversationAttachmentEvent } from '@kbn/agent-builder-common';

const attachmentEventSchema = z.object({
  conversationId: z.string().meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationAttachment.eventSchema.conversationId',
      { defaultMessage: 'The ID of the conversation.' }
    ),
  }),
  attachmentId: z.string().meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationAttachment.eventSchema.attachmentId',
      { defaultMessage: 'The ID of the attachment that was added, updated, or deleted.' }
    ),
  }),
  attachmentType: z.string().meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationAttachment.eventSchema.attachmentType',
      {
        defaultMessage:
          'The type of the attachment (e.g. "text", "esql", "visualization"). Use this to filter the trigger to a specific attachment type.',
      }
    ),
  }),
});

export const conversationAttachmentAddedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: ConversationAttachmentAddedTriggerId,
  stability: 'tech_preview',
  eventSchema: attachmentEventSchema,
  title: i18n.translate('xpack.agentBuilder.workflowTriggers.conversationAttachmentAdded.title', {
    defaultMessage: 'Agent Builder - Conversation attachment added',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowTriggers.conversationAttachmentAdded.description',
    {
      defaultMessage: 'Emitted after a new attachment is added to a conversation.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationAttachmentAdded.documentation.details',
      {
        defaultMessage:
          'Emitted after an attachment is successfully added to a conversation, whether by a user action, an API call, or an agent tool. The payload includes event.conversationId, event.attachmentId, and event.attachmentType. Use event.attachmentType in a trigger condition to react only to a specific attachment kind.',
      }
    ),
    examples: [
      `## React when an ES|QL attachment is added
\`\`\`yaml
version: '1'
name: Handle ESQ|L attachment
triggers:
  - type: ${ConversationAttachmentAddedTriggerId}
    on:
      condition: 'event.attachmentType: "esql"'
steps:
  - name: handle_esql_attachment
    type: console
    with:
      message: "New ES|QL attachment added: {{ event.attachmentId }}"
\`\`\``,
      `## React to any new attachment
\`\`\`yaml
version: '1'
name: Log new attachment
triggers:
  - type: ${ConversationAttachmentAddedTriggerId}
steps:
  - name: log_attachment
    type: console
    with:
      message: "Attachment {{ event.attachmentId }} of type {{ event.attachmentType }} added to conversation {{ event.conversationId }}"
\`\`\``,
    ],
  },
};

export const conversationAttachmentUpdatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: ConversationAttachmentUpdatedTriggerId,
  stability: 'tech_preview',
  eventSchema: attachmentEventSchema,
  title: i18n.translate('xpack.agentBuilder.workflowTriggers.conversationAttachmentUpdated.title', {
    defaultMessage: 'Agent Builder - Conversation attachment updated',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowTriggers.conversationAttachmentUpdated.description',
    {
      defaultMessage:
        'Emitted after an existing attachment is updated (content changed, restored from soft-delete, or metadata modified).',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationAttachmentUpdated.documentation.details',
      {
        defaultMessage:
          'Emitted after an attachment is successfully updated — including content changes, version bumps, restores from soft-delete, and metadata (description) edits. The payload includes event.conversationId, event.attachmentId, and event.attachmentType.',
      }
    ),
    examples: [
      `## React when a visualization attachment is updated
\`\`\`yaml
version: '1'
name: Handle visualization update
triggers:
  - type: ${ConversationAttachmentUpdatedTriggerId}
    on:
      condition: 'event.attachmentType: "visualization"'
steps:
  - name: handle_update
    type: console
    with:
      message: "Visualization {{ event.attachmentId }} updated"
\`\`\``,
    ],
  },
};

export const conversationAttachmentDeletedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: ConversationAttachmentDeletedTriggerId,
  stability: 'tech_preview',
  eventSchema: attachmentEventSchema,
  title: i18n.translate('xpack.agentBuilder.workflowTriggers.conversationAttachmentDeleted.title', {
    defaultMessage: 'Agent Builder - Conversation attachment deleted',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowTriggers.conversationAttachmentDeleted.description',
    {
      defaultMessage:
        'Emitted after an attachment is soft-deleted or permanently deleted from a conversation.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationAttachmentDeleted.documentation.details',
      {
        defaultMessage:
          'Emitted after an attachment is removed from a conversation — either by a soft delete (restorable) or a permanent delete. The payload includes event.conversationId, event.attachmentId, and event.attachmentType.',
      }
    ),
    examples: [
      `## React when any attachment is deleted
\`\`\`yaml
version: '1'
name: Log attachment deletion
triggers:
  - type: ${ConversationAttachmentDeletedTriggerId}
steps:
  - name: log_deletion
    type: console
    with:
      message: "Attachment {{ event.attachmentId }} removed from conversation {{ event.conversationId }}"
\`\`\``,
    ],
  },
};
