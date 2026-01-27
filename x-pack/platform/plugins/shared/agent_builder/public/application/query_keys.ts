/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Query keys for react-query
 */
export const queryKeys = {
  conversations: {
    all: ['conversations'] as const,
    byAgent: (agentId: string) => ['conversations', 'list', { agentId }],
    byId: (conversationId: string) => ['conversations', conversationId],
  },
  agentProfiles: {
    all: ['agentProfiles'] as const,
    byId: (agentProfileId?: string) => ['agentProfiles', agentProfileId],
  },
  tools: {
    all: ['tools', 'list'] as const,
    typeInfo: ['tools', 'typeInfo'] as const,
    byId: (toolId?: string) => ['tools', toolId],
    indexSearch: {
      resolveTargets: (pattern: string) => ['tools', 'indexSearch', 'resolveTargets', pattern],
    },
    workflows: {
      byId: (workflowId?: string) => ['tools', 'workflows', workflowId],
      list: () => ['tools', 'workflows', 'list'] as const,
    },
    connectors: {
      list: (type?: string) => ['tools', 'connectors', 'list', type],
      get: (connectorId: string) => ['tools', 'connectors', 'get', connectorId],
      listMcpTools: (connectorId: string) => ['tools', 'connectors', 'listMcpTools', connectorId],
    },
    health: {
      list: () => ['tools', 'health', 'list'] as const,
      byId: (toolId: string) => ['tools', 'health', toolId],
      mcp: () => ['tools', 'health', 'mcp'] as const,
    },
    namespace: {
      validate: (namespace: string, connectorId?: string) =>
        ['tools', 'namespace', 'validate', namespace, connectorId] as const,
    },
  },
};
