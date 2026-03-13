/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { newConversationId } from './new_conversation';

export const appPaths = {
  root: '/',

  // Agent-scoped routes (all under /agents/:agentId)
  agent: {
    root: ({ agentId }: { agentId: string }) => `/agents/${agentId}`,
    conversations: {
      new: ({ agentId }: { agentId: string }) =>
        `/agents/${agentId}/conversations/${newConversationId}`,
      byId: ({ agentId, conversationId }: { agentId: string; conversationId: string }) =>
        `/agents/${agentId}/conversations/${conversationId}`,
    },
    skills: ({ agentId }: { agentId: string }) => `/agents/${agentId}/skills`,
    tools: ({ agentId }: { agentId: string }) => `/agents/${agentId}/tools`,
    plugins: ({ agentId }: { agentId: string }) => `/agents/${agentId}/plugins`,
    connectors: ({ agentId }: { agentId: string }) => `/agents/${agentId}/connectors`,
    instructions: ({ agentId }: { agentId: string }) => `/agents/${agentId}/instructions`,
  },

  // Manage routes (global CRUD, no agent context)
  manage: {
    agents: '/manage/agents',
    agentsNew: '/manage/agents/new',
    tools: '/manage/tools',
    toolsNew: '/manage/tools/new',
    toolDetails: ({ toolId }: { toolId: string }) => `/manage/tools/${toolId}`,
    toolsBulkImport: '/manage/tools/bulk_import_mcp',
    skills: '/manage/skills',
    skillsNew: '/manage/skills/new',
    skillDetails: ({ skillId }: { skillId: string }) => `/manage/skills/${skillId}`,
    plugins: '/manage/plugins',
    pluginDetails: ({ pluginId }: { pluginId: string }) => `/manage/plugins/${pluginId}`,
    connectors: '/manage/connectors',
  },

  // Legacy paths (for backward compatibility, will redirect)
  legacy: {
    conversationNew: `/conversations/${newConversationId}`,
    conversationById: ({ conversationId }: { conversationId: string }) =>
      `/conversations/${conversationId}`,
  },
};

// Route patterns for matching (used by unified sidebar)
export const routePatterns = {
  agentRoot: '/agents/:agentId',
  agentConversations: '/agents/:agentId/conversations/*',
  agentSettings: '/agents/:agentId/(skills|tools|plugins|connectors|instructions)',
  manage: '/manage/*',
};
