/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  oneChatDefaultAgentId,
  oneChatAgentProviderIds,
  allToolsSelectionWildcard as allTools,
  AgentType,
  createAgentNotFoundError,
  toSerializedAgentIdentifier,
} from '@kbn/onechat-common';
import type { ConversationalAgentDefinition } from '@kbn/onechat-server';
import type { AgentProviderWithId } from '../types';
import { createHandler } from './handler';

/**
 * Returns an agent provider exposing the default onechat agent.
 */
export const createDefaultAgentProvider = (): AgentProviderWithId => {
  const provider: AgentProviderWithId = {
    id: oneChatAgentProviderIds.default,
    has: ({ agentId }) => {
      return agentId === oneChatDefaultAgentId;
    },
    get: ({ agentId }) => {
      if (agentId === oneChatDefaultAgentId) {
        return createDefaultAgentDescriptor();
      }
      throw createAgentNotFoundError({ agentId: toSerializedAgentIdentifier(agentId) });
    },
    list: () => {
      return [createDefaultAgentDescriptor()];
    },
  };

  return provider;
};

const createDefaultAgentDescriptor = (): ConversationalAgentDefinition => {
  return {
    type: AgentType.conversational,
    id: oneChatDefaultAgentId,
    description: 'Default onechat agent',
    handler: createHandler({
      agentId: oneChatDefaultAgentId,
      toolSelection: [{ toolIds: [allTools] }],
    }),
  };
};
