/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Conversation, MessageRole } from '../../../common/types';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { conversationCreateRt, conversationUpdateRt } from '../runtime_types';

// backwards compatibility for messages with system role
const getConversationWithoutSystemMessages = (conversation: Conversation) => {
  if (!conversation.systemMessage) {
    conversation.systemMessage =
      conversation.messages.find((message) => message.message.role === 'system')?.message
        ?.content ?? '';
  }
  conversation.messages = conversation.messages.filter(
    (message) => message.message.role !== MessageRole.System
  );
  return conversation;
};

const getConversationRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'GET /internal/observability_ai_assistant/conversation/{conversationId}',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<Conversation> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });

    const conversation = await client.get(params.path.conversationId);
    // conversation without system messages
    return getConversationWithoutSystemMessages(conversation);
  },
});

const findConversationsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/conversations',
  params: t.partial({
    body: t.partial({
      query: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<{ conversations: Conversation[] }> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });

    const conversations = await client.find({ query: params?.body?.query });

    return {
      // conversations without system messages
      conversations: conversations.map(getConversationWithoutSystemMessages),
    };
  },
});

const createConversationRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/conversation',
  params: t.type({
    body: t.type({
      conversation: conversationCreateRt,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<Conversation> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });
    return client.create(params.body.conversation);
  },
});

const duplicateConversationRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/conversation/{conversationId}/duplicate',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<Conversation> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });
    return client.duplicateConversation(params.path.conversationId);
  },
});

const updateConversationRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
    body: t.type({
      conversation: conversationUpdateRt,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<Conversation> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });
    return client.update(params.path.conversationId, params.body.conversation);
  },
});

const deleteConversationRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<void> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });
    return client.delete(params.path.conversationId);
  },
});

const patchConversationRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'PATCH /internal/observability_ai_assistant/conversation/{conversationId}',
  params: t.type({
    path: t.type({
      conversationId: t.string,
    }),
    body: t.partial({
      public: t.boolean,
      archived: t.boolean,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<Conversation> => {
    const { service, request, params } = resources;

    const client = await service.getClient({ request });

    return client.updatePartial({
      conversationId: params.path.conversationId,
      updates: params.body,
    });
  },
});

export const conversationRoutes = {
  ...getConversationRoute,
  ...findConversationsRoute,
  ...createConversationRoute,
  ...updateConversationRoute,
  ...deleteConversationRoute,
  ...duplicateConversationRoute,
  ...patchConversationRoute,
};
