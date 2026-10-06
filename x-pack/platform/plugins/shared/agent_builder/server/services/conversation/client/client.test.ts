/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { createClient, type ConversationClient } from './client';
import type { Document } from './converters';

const testSpace = 'default';

interface MockEsClient {
  search: jest.Mock;
  index: jest.Mock;
  delete: jest.Mock;
}

const mockEsClient: MockEsClient = {
  search: jest.fn(),
  index: jest.fn(),
  delete: jest.fn(),
};

jest.mock('./storage', () => ({
  createStorage: jest.fn(() => ({
    getClient: jest.fn(() => mockEsClient),
  })),
}));

describe('ConversationClient', () => {
  let client: ConversationClient;

  /** Pass `userId: null` to build a legacy document that never stored a `user_id`. */
  const createConversationDocument = ({
    id = 'conversation-1',
    agentId = 'agent-1',
    userId = 'user-1',
    username = 'test-user',
  }: {
    id?: string;
    agentId?: string;
    userId?: string | null;
    username?: string;
  } = {}): Document =>
    ({
      _id: id,
      _seq_no: 1,
      _primary_term: 1,
      _source: {
        agent_id: agentId,
        ...(userId === null ? {} : { user_id: userId }),
        user_name: username,
        space: testSpace,
        title: 'Conversation 1',
        created_at: '2024-09-04T06:44:17.944Z',
        updated_at: '2025-08-04T06:44:19.123Z',
        conversation_rounds: [],
      },
    } as Document);

  beforeEach(() => {
    jest.clearAllMocks();

    client = createClient({
      space: testSpace,
      logger: loggerMock.create(),
      esClient: {} as never,
      user: {
        id: 'user-1',
        username: 'test-user',
      },
    });
  });

  describe('exists', () => {
    it('returns true when the document exists, even when owned by another user', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              userId: 'other-user-id',
              username: 'other-user',
            }),
          ],
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

    it('propagates search failures', async () => {
      const error = new Error('search unavailable');
      mockEsClient.search.mockRejectedValue(error);

      await expect(client.exists('conversation-1')).rejects.toBe(error);
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

    it('throws a not found error when the id already exists', async () => {
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

  describe('ownership', () => {
    const createClientForUser = (user: { id?: string; username: string }) =>
      createClient({
        space: testSpace,
        logger: loggerMock.create(),
        esClient: {} as never,
        user,
      });

    it('grants access on a matching user_id', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      await expect(client.get('conversation-1')).resolves.toEqual(
        expect.objectContaining({ id: 'conversation-1' })
      );
    });

    it('denies a same-username caller with no id when the conversation stored a user_id', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ userId: 'owner-profile-uid' })] },
      });

      const sameUsernameOtherRealm = createClientForUser({ username: 'test-user' });

      await expect(sameUsernameOtherRealm.get('conversation-1')).rejects.toThrow(
        'Conversation conversation-1 not found'
      );
    });

    it('falls back to username when the conversation never stored a user_id', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ userId: null })] },
      });

      const legacyOwner = createClientForUser({ username: 'test-user' });

      await expect(legacyOwner.get('conversation-1')).resolves.toEqual(
        expect.objectContaining({ id: 'conversation-1' })
      );
    });

    it('denies a different username on a conversation without a user_id', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ userId: null, username: 'other-user' })] },
      });

      const otherUser = createClientForUser({ username: 'test-user' });

      await expect(otherUser.get('conversation-1')).rejects.toThrow(
        'Conversation conversation-1 not found'
      );
    });

    it('lists on user_id, and on username only for documents without a user_id', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.list();

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                {
                  bool: {
                    should: [
                      { term: { user_id: 'user-1' } },
                      {
                        bool: {
                          must_not: { exists: { field: 'user_id' } },
                          filter: { term: { user_name: 'test-user' } },
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ]),
            }),
          }),
        })
      );
    });

    it('omits the user_id clause when the caller has no resolvable id', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await createClientForUser({ username: 'test-user' }).list();

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          must_not: { exists: { field: 'user_id' } },
                          filter: { term: { user_name: 'test-user' } },
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ]),
            }),
          }),
        })
      );
    });
  });
});
