/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

export interface MessageSentEventProperties {
  conversationId: string;
  messageLength?: number;
  hasAttachments: boolean;
  attachmentCount?: number;
  attachmentTypes?: string[];
  agentId?: string;
}

export interface MessageReceivedEventProperties {
  conversationId: string;
  responseLength?: number;
  roundNumber?: number;
  agentId?: string;
  toolsUsed?: string[];
  toolCount?: number;
  toolsInvoked?: string[];
}

export const MESSAGE_SENT_EVENT: EventTypeOpts<MessageSentEventProperties> = {
  eventType: 'Agent Builder Message Sent',
  schema: {
    conversationId: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: false,
      },
    },
    messageLength: {
      type: 'integer',
      _meta: {
        description: 'Length of the message in characters',
        optional: true,
      },
    },
    hasAttachments: {
      type: 'boolean',
      _meta: {
        description: 'Whether the message has attachments',
        optional: false,
      },
    },
    attachmentCount: {
      type: 'integer',
      _meta: {
        description: 'Number of attachments',
        optional: true,
      },
    },
    attachmentTypes: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Type of attachment',
        },
      },
      _meta: {
        description: 'Types of attachments',
        optional: true,
      },
    },
    agentId: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the agent (normalized: built-in agents keep ID, custom agents become "custom")',
        optional: true,
      },
    },
  },
};

export const MESSAGE_RECEIVED_EVENT: EventTypeOpts<MessageReceivedEventProperties> = {
  eventType: 'Agent Builder Message Received',
  schema: {
    conversationId: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: false,
      },
    },
    responseLength: {
      type: 'integer',
      _meta: {
        description: 'Length of the response in characters',
        optional: true,
      },
    },
    roundNumber: {
      type: 'integer',
      _meta: {
        description: 'Round number in the conversation',
        optional: true,
      },
    },
    agentId: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the agent (normalized: built-in agents keep ID, custom agents become "custom")',
        optional: true,
      },
    },
    toolsUsed: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Name of tool used (normalized tool ID)',
        },
      },
      _meta: {
        description: 'Names of tools used in the response (normalized tool IDs)',
        optional: true,
      },
    },
    toolCount: {
      type: 'integer',
      _meta: {
        description: 'Number of tools used',
        optional: true,
      },
    },
    toolsInvoked: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'Tool ID invoked (normalized: built-in tools keep ID, custom tools become "Custom")',
        },
      },
      _meta: {
        description:
          'Tool IDs invoked in the round (normalized: built-in tools keep ID, custom tools become "Custom")',
        optional: true,
      },
    },
  },
};

export const agentBuilderServerTelemetryEvents: Array<EventTypeOpts<Record<string, unknown>>> = [
  MESSAGE_SENT_EVENT,
  MESSAGE_RECEIVED_EVENT,
];
