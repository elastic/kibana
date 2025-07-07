/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  oneChatDefaultAgentId,
  allToolsSelectionWildcard as allTools,
  AgentType,
  createAgentNotFoundError,
} from '@kbn/onechat-common';
import type { ProvidedAgent } from '@kbn/onechat-server';
import type { AgentProviderWithId } from '../types';
import { createHandler } from './handler';

/**
 * Returns an agent provider exposing the default onechat agent.
 */
export const createDefaultAgentProvider = (): AgentProviderWithId => {
  const provider: AgentProviderWithId = {
    id: 'default',
    has: ({ agentId }) => {
      return agentId === oneChatDefaultAgentId;
    },
    get: ({ agentId }) => {
      if (agentId === oneChatDefaultAgentId) {
        return createDefaultAgentDescriptor();
      }
      throw createAgentNotFoundError({ agentId });
    },
    list: () => {
      return [createDefaultAgentDescriptor()];
    },
  };

  return provider;
};

const createDefaultAgentDescriptor = (): ProvidedAgent => {
  return {
    type: AgentType.chat,
    id: oneChatDefaultAgentId,
    description: 'Default onechat agent',
    handler: createHandler({
      agentId: oneChatDefaultAgentId,
      toolSelection: [{ tool_ids: [allTools] }],
    }),
  };
};
