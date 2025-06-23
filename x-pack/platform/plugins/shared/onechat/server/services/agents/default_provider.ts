/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OneChatDefaultAgentId,
  OneChatDefaultAgentProviderId,
  AgentType,
  createAgentNotFoundError,
  toSerializedAgentIdentifier,
} from '@kbn/onechat-common';
import type { ConversationalAgentDefinition } from '@kbn/onechat-server';
import type { AgentProviderWithId } from './types';
import { createHandler } from './handler';

/**
 * Returns an agent provider exposing the default onechat agent.
 */
export const createDefaultAgentProvider = (): AgentProviderWithId => {
  const provider: AgentProviderWithId = {
    id: OneChatDefaultAgentProviderId,
    has: ({ agentId }) => {
      return agentId === OneChatDefaultAgentId;
    },
    get: ({ agentId }) => {
      if (agentId === OneChatDefaultAgentId) {
        return createDefaultAgentDescriptor({ agentId: OneChatDefaultAgentProviderId });
      }
      throw createAgentNotFoundError({ agentId: toSerializedAgentIdentifier(agentId) });
    },
    list: () => {
      return [createDefaultAgentDescriptor({ agentId: OneChatDefaultAgentProviderId })];
    },
  };

  return provider;
};

const createDefaultAgentDescriptor = ({
  agentId,
}: {
  agentId: string;
}): ConversationalAgentDefinition => {
  return {
    type: AgentType.conversational,
    id: OneChatDefaultAgentId,
    description: 'Default onechat agent',
    handler: createHandler({ agentId }),
  };
};
