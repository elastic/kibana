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
    bulkGet: client.bulkGet.bind(client),
    list: client.list.bind(client),
    search: client.search.bind(client),
    create: async ({ agentId, id, title, accessControl, templateId, metadata }) => {
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
        template_id: templateId,
        metadata,
        rounds: [],
      });
    },
    patchMetadata: async (conversationId, updates) => {
      // patchMetadata validates against the conversation's template, runs OCC-safe
      // read-modify-write with up to 5 retries (writeConversation), and returns the
      // internal Conversation type. A second get retrieves ConversationWithPermissions
      // (which adds the `permissions` object derived from the caller's identity).
      const { changedFields } = await client.patchMetadata(conversationId, updates);
      const conversation = await client.get(conversationId);
      return { conversation, changedFields };
    },
    update: async ({ id, title }) => {
      // Uses access: 'owner' and retryOnConflict: true (the default is retryOnConflict:
      // false, which sets maxRetries: 0 and surfaces write conflicts to the caller).
      // Only title is writable here. Metadata must go through patchMetadata so it is
      // validated against the conversation's template — client.update's fields path
      // does NOT run validateMetadataUpdate.
      await client.update({ id, title }, { access: 'owner', retryOnConflict: true });
      return client.get(id);
    },
  };
};
