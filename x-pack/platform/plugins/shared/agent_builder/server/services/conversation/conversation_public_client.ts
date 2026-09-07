/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  createConversationAlreadyExistsError,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { ConversationClient } from './client/client';
import type { AgentRegistry } from '../agents/agent_registry';

/**
 * Wraps the internal ConversationClient into the public ConversationPublicClient
 * contract exposed on AgentBuilderPluginStart.conversations.
 */
export const createConversationPublicClient = ({
  client,
  agentRegistry,
}: {
  client: ConversationClient;
  agentRegistry: AgentRegistry;
}): ConversationPublicClient => {
  return {
    get: client.get.bind(client),
    list: client.list.bind(client),
    create: async ({ agentId, id, title, accessControl }) => {
      const effectiveAgentId = agentId ?? agentBuilderDefaultAgentId;

      await agentRegistry.get(effectiveAgentId, { access: 'use' });

      if (id && (await client.exists(id))) {
        throw createConversationAlreadyExistsError({ conversationId: id });
      }

      const now = new Date().toISOString();
      return client.create({
        agent_id: effectiveAgentId,
        id,
        title: title ?? DEFAULT_CONVERSATION_TITLE,
        access_control: accessControl
          ? {
              access_mode: accessControl.access_mode,
              entries: (accessControl.entries ?? []).map((entry) => ({
                ...entry,
                added_at: now,
              })),
            }
          : undefined,
        rounds: [],
      });
    },
  };
};
