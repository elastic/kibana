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
    plugins: ({ agentId }: { agentId: string }) => `/agents/${agentId}/plugins`,
    tools: ({ agentId }: { agentId: string }) => `/agents/${agentId}/tools`,
    connectors: ({ agentId }: { agentId: string }) => `/agents/${agentId}/connectors`,
    overview: ({ agentId }: { agentId: string }) => `/agents/${agentId}/overview`,
  },

  // Manage routes (global CRUD, no agent context)
  manage: {
    agents: '/manage/agents',
    agentsNew: '/manage/agents/new',
    agentDetails: ({ agentId }: { agentId: string }) => `/manage/agents/${agentId}`,
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

  // Legacy paths - redirect to new structure via LegacyConversationRedirect
  legacy: {
    conversation: ({ conversationId }: { conversationId: string }) =>
      `/conversations/${conversationId}`,
  },

  // Backward compatibility aliases pointing to new routes
  // TODO: Migrate consumers to use appPaths.agent.* or appPaths.manage.* directly and remove these aliases
  agents: {
    list: '/manage/agents',
    new: '/manage/agents/new',
    edit: ({ agentId }: { agentId: string }) => `/manage/agents/${agentId}`,
  },
  connectors: {
    list: '/connectors',
  },
  tools: {
    list: '/manage/tools',
    new: '/manage/tools/new',
    details: ({ toolId }: { toolId: string }) => `/manage/tools/${toolId}`,
    bulkImportMcp: '/manage/tools/bulk_import_mcp',
  },
  skills: {
    list: '/manage/skills',
    new: '/manage/skills/new',
    details: ({ skillId }: { skillId: string }) => `/manage/skills/${skillId}`,
  },
  plugins: {
    list: '/manage/plugins',
    details: ({ pluginId }: { pluginId: string }) => `/manage/plugins/${pluginId}`,
  },
};
