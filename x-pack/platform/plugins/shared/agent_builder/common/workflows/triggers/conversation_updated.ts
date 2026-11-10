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
  ConversationUpdatedTriggerId,
  conversationChangeKinds,
  conversationWriteSources,
} from '@kbn/agent-builder-common';

const conversationUpdatedEventSchema = z.object({
  conversationId: z.string().meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.conversationId',
      {
        defaultMessage: 'The ID of the conversation that was updated.',
      }
    ),
  }),
  templateId: z
    .string()
    .optional()
    .meta({
      description: i18n.translate(
        'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.templateId',
        {
          defaultMessage: 'The template of the conversation, when it has one.',
        }
      ),
    }),
  parentId: z
    .string()
    .optional()
    .meta({
      description: i18n.translate(
        'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.parentId',
        {
          defaultMessage:
            'The ID of the parent conversation, when this conversation is a child (e.g. a persistent sub-agent).',
        }
      ),
    }),
  source: z.enum(conversationWriteSources).meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.source',
      {
        defaultMessage:
          'The code path that performed the write: `execution` (an agent execution, including the user message stored when it arrives and the generated title), `http_api` (Agent Builder HTTP APIs), `workflow` (Agent Builder workflow steps), or `server_api` (another Kibana plugin using the Agent Builder server-side contract). Use `actorTypes` to know who made the change.',
      }
    ),
  }),
  changeKinds: z.array(z.enum(conversationChangeKinds)).meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.changeKinds',
      {
        defaultMessage:
          'What this write changed: `created` (the write created the conversation, and also reports everything set at creation, such as template defaults in `changedFields`), `events`, `attachments`, `metadata`, `title`, `template` and/or `access`. Never empty.',
      }
    ),
  }),
  eventTypes: z.array(z.string()).meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.eventTypes',
      {
        defaultMessage:
          'Types of the events this write added, de-duplicated (for example `user_message`, `execution_terminated`, `attachment_added`, or a custom event type). Empty when no event was added.',
      }
    ),
  }),
  actorTypes: z.array(z.string()).meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.actorTypes',
      {
        defaultMessage:
          'Actor types of the events this write added, de-duplicated: `user`, `agent`, `external` or `system`.',
      }
    ),
  }),
  executionId: z
    .string()
    .optional()
    .meta({
      description: i18n.translate(
        'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.executionId',
        {
          defaultMessage:
            'The agent execution this write persisted, whether it terminated, failed or was aborted. Absent for writes that persisted no execution.',
        }
      ),
    }),
  attachmentTypes: z.array(z.string()).meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.attachmentTypes',
      {
        defaultMessage:
          'Types of the attachments this write added, versioned, deleted, restored or edited, de-duplicated.',
      }
    ),
  }),
  attachmentIds: z.array(z.string()).meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.attachmentIds',
      {
        defaultMessage: 'IDs of the attachments this write changed.',
      }
    ),
  }),
  changedFields: z.array(z.string()).meta({
    description: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.eventSchema.changedFields',
      {
        defaultMessage:
          'Names of the metadata fields whose stored value changed. Values are never included.',
      }
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
        'Emitted after every conversation write that changes something: new events, attachments, metadata, title, template or access.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowTriggers.conversationUpdated.documentation.details',
      {
        defaultMessage:
          'Emitted once per successful conversation write that changes something; writes that change nothing emit nothing. The payload describes the write but never carries values: read the conversation if you need them. In trigger conditions, an array field matches when any of its elements matches (event.eventTypes: "user_message"), wildcards work on strings (event.eventTypes: attachment_*), and a wildcard on an absent field is false (event.executionId: * matches only writes that persisted an execution). To coalesce bursts, set a concurrency key that includes both the workflow id and the conversation id (see the first example for the exact key), with strategy queue, max 1 and queue-size 1. To avoid reacting to your own writes, match the changes you care about rather than excluding the field you write. A create reports `created` plus everything it set, including template defaults: add not event.changeKinds: "created" to the clauses that should only match changes to an existing conversation. Deleting a conversation, marking it as read, pinning it and round feedback emit nothing.',
      }
    ),
    examples: [
      `## Refresh an investigation summary when it gains content
Creating an investigation seeds its \`status\`, so the metadata clauses exclude creates. The first user message, which can arrive with the create, still matches.
\`\`\`yaml
version: '1'
name: Refresh investigation summary
settings:
  concurrency:
    key: '{{ workflow.id }}:{{ event.conversationId }}'
    strategy: queue
    max: 1
    queue-size: 1
triggers:
  - type: ${ConversationUpdatedTriggerId}
    on:
      condition: >-
        event.templateId: "investigation"
        and (
          event.eventTypes: "user_message"
          or event.executionId: *
          or event.changeKinds: "attachments"
          or (
            not event.changeKinds: "created"
            and (
              event.changedFields: "status"
              or event.changedFields: "severity"
              or event.changedFields: "verdict"
            )
          )
        )
steps:
  - name: log
    type: console
    with:
      message: 'Conversation {{ event.conversationId }} changed: {{ event.changeKinds }}'
\`\`\``,
      `## React to a new dashboard attachment
The payload arrays are flat and cannot tie an attachment type to an operation, so this matches any write that added an attachment and touched a dashboard (for example, adding a text attachment while updating a dashboard).
\`\`\`yaml
version: '1'
name: React to dashboards
triggers:
  - type: ${ConversationUpdatedTriggerId}
    on:
      condition: 'event.eventTypes: "attachment_added" and event.attachmentTypes: "dashboard"'
steps:
  - name: log
    type: console
    with:
      message: Dashboard attached
\`\`\``,
    ],
  },
};
