/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { createClient, type ConversationClient } from './client';
import { createStorage } from './storage';
import type { Document } from './converters';

jest.mock('./storage');

const createStorageMock = createStorage as jest.MockedFunction<typeof createStorage>;

const user = { id: 'user-1', username: 'user-1-name' };

const createConversationDocument = ({
  userId = user.id,
  username = user.username,
}: { userId?: string; username?: string } = {}): Document => ({
  _id: 'conversation-1',
  _seq_no: 1,
  _primary_term: 1,
  _source: {
    agent_id: 'agent-1',
    user_id: userId,
    user_name: username,
    space: 'default',
    title: 'Conversation 1',
    created_at: '2024-09-04T06:44:17.944Z',
    updated_at: '2024-09-04T06:44:17.944Z',
    conversation_rounds: [],
    attachments: [],
  },
});

describe('ConversationClient', () => {
  let mockEsClient: {
    search: jest.Mock;
    index: jest.Mock;
    delete: jest.Mock;
  };
  let logger: Logger;
  let client: ConversationClient;

  beforeEach(() => {
    mockEsClient = {
      search: jest.fn(),
      index: jest.fn(),
      delete: jest.fn(),
    };

    createStorageMock.mockReturnValue({
      getClient: () => mockEsClient,
    } as unknown as ReturnType<typeof createStorage>);

    logger = loggerMock.create();

    client = createClient({
      space: 'default',
      logger,
      esClient: {} as unknown as ElasticsearchClient,
      user,
    });
  });

  describe('exists', () => {
    it('returns true when the document exists, even when owned by another user', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createConversationDocument({ userId: 'other-user-id', username: 'other-user' })],
        },
      });

      await expect(client.exists('conversation-1')).resolves.toBe(true);
    });

    it('returns false when no document exists', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      });

      await expect(client.exists('conversation-1')).resolves.toBe(false);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      mockEsClient.index.mockResolvedValue({ result: 'created' });
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createConversationDocument()],
        },
      });
    });

    it('indexes with op_type create so existing conversations are never overwritten', async () => {
      await client.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [],
      });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'conversation-1',
          op_type: 'create',
        })
      );
    });

    it('throws a not found error and does not overwrite when the id already exists', async () => {
      const conflictError = Object.assign(new Error('version conflict'), { statusCode: 409 });
      mockEsClient.index.mockRejectedValueOnce(conflictError);

      await expect(
        client.create({
          id: 'conversation-1',
          title: 'Conversation 1',
          agent_id: 'agent-1',
          rounds: [],
        })
      ).rejects.toMatchObject({
        message: 'Conversation conversation-1 not found',
      });

      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('propagates non-conflict index failures', async () => {
      const error = new Error('index unavailable');
      mockEsClient.index.mockRejectedValueOnce(error);

      await expect(
        client.create({
          id: 'conversation-1',
          title: 'Conversation 1',
          agent_id: 'agent-1',
          rounds: [],
        })
      ).rejects.toBe(error);
    });
  });
});
