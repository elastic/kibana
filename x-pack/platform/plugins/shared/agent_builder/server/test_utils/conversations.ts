/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Conversation } from '@kbn/onechat-common';
import type { ConversationService, ConversationClient } from '../services/conversation';

export type ConversationServiceMock = jest.Mocked<ConversationService> & {
  getScopedClient(args: any): Promise<ConversationClientMock>;
};
export type ConversationClientMock = jest.Mocked<ConversationClient>;

export const createEmptyConversation = (): Conversation => {
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
