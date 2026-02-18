/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Conversation,
  type ConversationRound,
  ConversationRoundStatus,
} from '@kbn/agent-builder-common';
import type { ConversationService, ConversationClient } from '../services/conversation';

export type ConversationServiceMock = jest.Mocked<ConversationService> & {
  getScopedClient(args: any): Promise<ConversationClientMock>;
};
export type ConversationClientMock = jest.Mocked<ConversationClient>;

export const createEmptyConversation = (parts: Partial<Conversation> = {}): Conversation => {
  return {
    id: 'id',
    title: 'New conversation',
    agent_id: 'agent_id',
    rounds: [],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    user: {
      id: 'unknown',
      username: 'unknown',
    },
    ...parts,
  };
};

export const createRound = (parts: Partial<ConversationRound>): ConversationRound => {
  return {
    id: 'id',
    status: ConversationRoundStatus.inProgress,
    input: { message: 'user message' },
    response: { message: 'assistant response' },
    steps: [],
    started_at: new Date().toISOString(),
    time_to_first_token: 0,
    time_to_last_token: 0,
    model_usage: {
      connector_id: 'unknown',
      input_tokens: 0,
      output_tokens: 0,
      llm_calls: 0,
    },
    ...parts,
  };
};

export const createConversationClientMock = (): ConversationClientMock => {
  return {
    get: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
  };
};

export const createConversationServiceMock = (): ConversationServiceMock => {
  return {
    getScopedClient: jest.fn().mockImplementation(async () => createConversationClientMock()),
  };
};
