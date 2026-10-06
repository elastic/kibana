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
import type { ConversationWriteSource } from '@kbn/agent-builder-common';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { ConversationClient } from './client/client';
import type { AgentRegistry } from '../agents/agent_registry';

/**
 * The `source` recorded on `ai.conversation.updated` for writes made through the public client.
 * Bound once at construction so external callers cannot misattribute their writes.
 */
export type ConversationPublicClientSource = Extract<
  ConversationWriteSource,
  'http_api' | 'workflow' | 'server_api'
>;

/**
 * Wraps the internal ConversationClient into the public ConversationPublicClient
 * contract exposed on AgentBuilderPluginStart.conversations.
 */
export const createConversationPublicClient = ({
  client,
  agentRegistry,
  source,
}: {
  client: ConversationClient;
  agentRegistry: AgentRegistry;
  source: ConversationPublicClientSource;
}): ConversationPublicClient => {
  return {
    get: client.get.bind(client),
    bulkGet: client.bulkGet.bind(client),
    list: client.list.bind(client),
    search: client.search.bind(client),
    addEvents: ({ conversationId, events }) =>
      client.addCustomEvents({ id: conversationId, events }, { source }),
    create: async ({ agentId, id, title, accessControl, templateId, metadata }) => {
      const effectiveAgentId = agentId ?? agentBuilderDefaultAgentId;

      await agentRegistry.get(effectiveAgentId, { access: 'use' });

      if (id && (await client.exists(id))) {
        throw createConversationAlreadyExistsError({ conversationId: id });
      }

      const now = new Date().toISOString();
      return client.create(
        {
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
        },
        { source }
      );
    },
    addAccessControlEntries: async (conversationId, entries, options) =>
      client.addAccessControlEntries(conversationId, entries, {
        access: options?.access ?? 'converse',
        source,
      }),
    removeAccessControlEntries: async (conversationId, principals, options) =>
      client.removeAccessControlEntries(conversationId, principals, {
        access: options?.access ?? 'converse',
        source,
      }),
    patchMetadata: async (conversationId, updates, options) => {
      const { conversation, changedFields } = await client.patchMetadata(conversationId, updates, {
        access: options?.access ?? 'owner',
        source,
      });
      return { conversation, changedFields };
    },
    update: async ({ id, title }) => {
      return await client.update({ id, title }, { access: 'owner', retryOnConflict: true, source });
    },
  };
};
