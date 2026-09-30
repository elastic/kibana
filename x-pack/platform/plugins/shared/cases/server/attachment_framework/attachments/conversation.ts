/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { ConversationAttachmentPayloadSchema } from '../../../common/types/domain_zod/attachment/conversation/v2';
import type { UnifiedAttachmentTypeSetup } from '../types';

export const conversationNotFoundMessage = (id: string) =>
  `Conversation ${id} was not found or you don't have access to it.`;

/**
 * Reference to an Agent Builder conversation. `resolve` verifies the requester
 * can read the conversation and stamps its title and agent onto the metadata.
 */
export const createConversationAttachmentType = (
  getAgentBuilder: () => Promise<AgentBuilderPluginStart>
): UnifiedAttachmentTypeSetup => ({
  id: AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE,
  schema: ConversationAttachmentPayloadSchema,
  workflowSchema: ConversationAttachmentPayloadSchema,
  resolve: async (payload, { request }) => {
    const { attachmentId } = ConversationAttachmentPayloadSchema.parse(payload);
    const { conversations } = await getAgentBuilder();
    const client = await conversations.getScopedClient({ request });
    const conversation = (await client.bulkGet([attachmentId])).get(attachmentId);
    if (!conversation) {
      throw Boom.badRequest(conversationNotFoundMessage(attachmentId));
    }
    return {
      ...payload,
      metadata: { title: conversation.title, agentId: conversation.agent_id },
    };
  },
});
