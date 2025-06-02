/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OneChatDefaultAgentId,
  AgentType,
  createAgentNotFoundError,
  toSerializedAgentIdentifier,
} from '@kbn/onechat-common';
import type { Logger } from '@kbn/core/server';
import type { AgentProvider, ConversationalAgentDescriptor } from '@kbn/onechat-server';
import { createHandler } from './handler';

/**
 * Returns an agent provider exposing the default onechat agent.
 */
export const createDefaultAgentProvider = ({ logger }: { logger: Logger }): AgentProvider => {
  const provider: AgentProvider = {
    has: ({ agentId }) => {
      return agentId === OneChatDefaultAgentId;
    },
    get: ({ agentId }) => {
      if (agentId === OneChatDefaultAgentId) {
        return createDefaultAgentDescriptor({ logger });
      }
      throw createAgentNotFoundError({ agentId: toSerializedAgentIdentifier(agentId) });
    },
  };

  return provider;
};

const createDefaultAgentDescriptor = ({
  logger,
}: {
  logger: Logger;
}): ConversationalAgentDescriptor => {
  return {
    type: AgentType.conversational,
    id: OneChatDefaultAgentId,
    description: 'Default onechat agent',
    handler: createHandler({ logger }),
  };
};
