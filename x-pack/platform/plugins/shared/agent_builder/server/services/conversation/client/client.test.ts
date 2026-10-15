/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  createAgentNotFoundError,
  createAgentUnavailableError,
  isConversationWriteConflictError,
} from '@kbn/agent-builder-common';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common/chat/access_control';
import type { AgentRegistry } from '../../agents/agent_registry';
import { createRound } from '../../../test_utils';
import { createClient, type ConversationClient } from './client';
import type { Document } from './converters';

const testSpace = 'default';

const createConflictError = () => Object.assign(new Error('version conflict'), { statusCode: 409 });

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
  let agentRegistry: jest.Mocked<Pick<AgentRegistry, 'get' | 'getIds'>>;

  const createConversationDocument = ({
    id = 'conversation-1',
    agentId = 'agent-1',
    userId = 'user-1',
    username = 'test-user',
    accessMode = ConversationAccessControlMode.Private,
    seqNo = 1,
    primaryTerm = 1,
    // ES omits both fields entirely when `seq_no_primary_term` is not requested
    versioned = true,
    title = 'Conversation 1',
    rounds = [],
    attachments,
    workspaceId,
    read = false,
  }: {
    id?: string;
    agentId?: string;
    userId?: string;
    username?: string;
    accessMode?: ConversationAccessControlMode;
    seqNo?: number;
    primaryTerm?: number;
    versioned?: boolean;
    title?: string;
    rounds?: unknown[];
    attachments?: unknown[];
    workspaceId?: string;
    read?: boolean;
  } = {}): Document =>
    ({
      _id: id,
      ...(versioned ? { _seq_no: seqNo, _primary_term: primaryTerm } : {}),
      _source: {
        agent_id: agentId,
        user_id: userId,
        user_name: username,
        space: testSpace,
        title,
        created_at: '2024-09-04T06:44:17.944Z',
        updated_at: '2025-08-04T06:44:19.123Z',
        read,
        conversation_rounds: rounds,
        ...(attachments ? { attachments } : {}),
        ...(workspaceId ? { workspace_id: workspaceId } : {}),
        access_control: {
          access_mode: accessMode,
        },
      },
    } as Document);

  beforeEach(() => {
    jest.clearAllMocks();

    agentRegistry = {
      get: jest.fn().mockResolvedValue({ id: 'agent-1' }),
      getIds: jest.fn().mockResolvedValue(['agent-1']),
    };

    client = createClient({
      space: testSpace,
      logger: loggerMock.create(),
      esClient: {} as never,
      agentRegistry: agentRegistry as unknown as AgentRegistry,
      user: {
        id: 'user-1',
        username: 'test-user',
      },
    });
  });

  describe('list', () => {
    it('requests access_control and origin, and preserves them in listed conversations', async () => {
      const origin = {
        external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      };
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              ...createConversationDocument({
                accessMode: ConversationAccessControlMode.Public,
              }),
              _source: {
                ...createConversationDocument({
                  accessMode: ConversationAccessControlMode.Public,
                })._source!,
                origin,
              },
            },
          ],
        },
      });

      const result = await client.list();

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: expect.arrayContaining(['access_control', 'origin']),
        })
      );
      expect(result[0]).toEqual(
        expect.objectContaining({
          access_control: {
            access_mode: ConversationAccessControlMode.Public,
          },
          origin,
        })
      );
    });

    it('filters listed conversations to public-or-owned conversations for accessible agents', async () => {
      agentRegistry.getIds.mockResolvedValue(['agent-1', 'agent-2']);
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createConversationDocument()],
        },
      });

      await client.list();

      expect(agentRegistry.getIds).toHaveBeenCalled();
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                expect.any(Object),
                {
                  bool: {
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              term: {
                                'access_control.access_mode': ConversationAccessControlMode.Public,
                              },
                            },
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
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      { terms: { agent_id: ['agent-1', 'agent-2'] } },
                    ],
                  },
                },
              ],
            },
          },
        })
      );
    });

    it('uses the requested agent id as the only agent filter when it is accessible', async () => {
      agentRegistry.getIds.mockResolvedValue(['agent-1', 'agent-2']);
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createConversationDocument()],
        },
      });

      await client.list({ agentId: 'agent-2' });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                expect.objectContaining({
                  bool: expect.objectContaining({
                    filter: expect.arrayContaining([{ terms: { agent_id: ['agent-2'] } }]),
                  }),
                }),
              ]),
            }),
          }),
        })
      );
      expect(mockEsClient.search).not.toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([{ term: { agent_id: 'agent-2' } }]),
            }),
          }),
        })
      );
    });

    it('returns an empty list without querying conversations when the requested agent is inaccessible', async () => {
      agentRegistry.getIds.mockResolvedValue(['agent-1']);

      await expect(client.list({ agentId: 'agent-2' })).resolves.toEqual([]);

      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('returns an empty list when the user cannot access any underlying agents', async () => {
      agentRegistry.getIds.mockResolvedValue([]);

      await expect(client.list()).resolves.toEqual([]);

      expect(mockEsClient.search).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('returns a public non-owner conversation when the user can use the agent', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              userId: 'other-user-id',
              username: 'other-user',
              accessMode: ConversationAccessControlMode.Public,
            }),
          ],
        },
      });

      const result = await client.get('conversation-1');

      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
      expect(result.id).toBe('conversation-1');
    });

    it('returns not found when conversation access passes but agent use access fails', async () => {
      agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'agent-1' }));
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              userId: 'other-user-id',
              username: 'other-user',
              accessMode: ConversationAccessControlMode.Public,
            }),
          ],
        },
      });

      await expect(client.get('conversation-1')).rejects.toMatchObject({
        message: 'Conversation conversation-1 not found',
      });
    });

    it('returns not found for owned conversations when agent use access fails', async () => {
      agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'agent-1' }));
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createConversationDocument()],
        },
      });

      await expect(client.get('conversation-1')).rejects.toMatchObject({
        message: 'Conversation conversation-1 not found',
      });

      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
    });

    it('returns not found when the underlying agent is unavailable', async () => {
      agentRegistry.get.mockRejectedValue(createAgentUnavailableError({ agentId: 'agent-1' }));
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createConversationDocument()],
        },
      });

      await expect(client.get('conversation-1')).rejects.toMatchObject({
        message: 'Conversation conversation-1 not found',
      });
    });
  });

  describe('exists', () => {
    it('returns true when the document exists, even when owned by another user and private', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              userId: 'other-user-id',
              username: 'other-user',
              accessMode: ConversationAccessControlMode.Private,
            }),
          ],
        },
      });

      await expect(client.exists('conversation-1')).resolves.toBe(true);
    });

    it('returns true when the document exists but agent use access fails', async () => {
      agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'agent-1' }));
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createConversationDocument()],
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

    it('propagates Elasticsearch read failures', async () => {
      const error = new Error('search timeout');
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

  describe('getByOrigin', () => {
    it('finds a conversation by first-class origin in the current space', async () => {
      const document = createConversationDocument();
      mockEsClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [document],
          },
        })
        .mockResolvedValueOnce({
          hits: {
            hits: [document],
          },
        });

      const result = await client.getByOrigin({
        external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      });

      expect(result?.id).toBe('conversation-1');
      expect(mockEsClient.search).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                expect.any(Object),
                {
                  term: {
                    'origin.external_conversation_id':
                      'team:T123/channel:C123/thread:1712345678.000100',
                  },
                },
              ],
            },
          },
        })
      );
    });
  });

  describe('update', () => {
    it('remains owner-only by default for public conversations', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              userId: 'other-user-id',
              username: 'other-user',
              accessMode: ConversationAccessControlMode.Public,
            }),
          ],
        },
      });

      await expect(client.update({ id: 'conversation-1', title: 'Updated title' })).rejects.toThrow(
        'Conversation conversation-1 not found'
      );

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('allows public non-owner conversations to be marked read with converse access', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              userId: 'other-user-id',
              username: 'other-user',
              accessMode: ConversationAccessControlMode.Public,
            }),
          ],
        },
      });

      const result = await client.update(
        { id: 'conversation-1', read: true },
        { access: 'converse' }
      );

      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'conversation-1',
          document: expect.objectContaining({ read: true }),
        })
      );
      expect(result.read).toBe(true);
    });

    it('preserves the original owner when a non-owner writes with converse access', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              userId: 'other-user-id',
              username: 'other-user',
              accessMode: ConversationAccessControlMode.Public,
            }),
          ],
        },
      });

      await client.update({ id: 'conversation-1', read: true }, { access: 'converse' });

      // Holds because `toEs` takes no caller; pinned so a `currentUser` argument cannot slip in.
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            user_id: 'other-user-id',
            user_name: 'other-user',
          }),
        })
      );
    });

    it('returns not found for converse updates when agent use access fails', async () => {
      agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'agent-1' }));
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              userId: 'other-user-id',
              username: 'other-user',
              accessMode: ConversationAccessControlMode.Public,
            }),
          ],
        },
      });

      await expect(
        client.update({ id: 'conversation-1', title: 'Updated title' }, { access: 'converse' })
      ).rejects.toThrow('Conversation conversation-1 not found');

      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('returns not found for owned converse updates when agent use access fails', async () => {
      agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'agent-1' }));
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createConversationDocument()],
        },
      });

      await expect(
        client.update({ id: 'conversation-1', read: true }, { access: 'converse' })
      ).rejects.toThrow('Conversation conversation-1 not found');

      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });
  });

  describe('optimistic concurrency control', () => {
    it('requests seq_no_primary_term when reading a conversation', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      await client.update({ id: 'conversation-1', title: 'Updated title' });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ seq_no_primary_term: true })
      );
    });

    it('passes the version read from the document to the write', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ seqNo: 42, primaryTerm: 7 })] },
      });

      await client.update({ id: 'conversation-1', title: 'Updated title' });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({ if_seq_no: 42, if_primary_term: 7 })
      );
    });

    it('refuses to write when the read returned no version metadata', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ versioned: false })] },
      });

      await expect(client.update({ id: 'conversation-1', title: 'x' })).rejects.toThrow(
        /read without version metadata/
      );
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('surfaces a write conflict as a conversation write conflict error', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });
      mockEsClient.index.mockRejectedValue(createConflictError());

      const error = await client.update({ id: 'conversation-1', title: 'x' }).catch((e) => e);

      expect(isConversationWriteConflictError(error)).toBe(true);
      expect(error.meta.statusCode).toBe(409);
    });

    it('does not retry by default, so a payload built from a stale read is not re-applied', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });
      mockEsClient.index.mockRejectedValue(createConflictError());

      await expect(client.update({ id: 'conversation-1', title: 'x' })).rejects.toThrow();

      expect(mockEsClient.index).toHaveBeenCalledTimes(1);
    });

    it('re-applies the requested value over the fresh document when retryOnConflict is set', async () => {
      mockEsClient.search
        .mockResolvedValueOnce({ hits: { hits: [createConversationDocument()] } })
        // a round landed first, adding a round and marking the conversation unread
        .mockResolvedValue({
          hits: {
            hits: [
              createConversationDocument({
                seqNo: 2,
                read: false,
                rounds: [createRound({ id: 'round-concurrent' })],
              }),
            ],
          },
        });
      mockEsClient.index.mockRejectedValueOnce(createConflictError());
      mockEsClient.index.mockResolvedValue({ _seq_no: 3, _primary_term: 1 });

      const result = await client.update(
        { id: 'conversation-1', read: true },
        { access: 'converse', retryOnConflict: true }
      );

      expect(mockEsClient.index).toHaveBeenCalledTimes(2);

      const { document } = mockEsClient.index.mock.calls[1][0];
      expect(document.read).toBe(true);
      // the concurrently written round is preserved
      expect(document.conversation_rounds).toHaveLength(1);
      expect(result.read).toBe(true);
    });
  });

  describe('upsertRound', () => {
    const round = createRound({ id: 'round-2', input: { message: 'second' } });

    const persistedRounds = (call: number = 0) =>
      mockEsClient.index.mock.calls[call][0].document.conversation_rounds as Array<{ id: string }>;

    beforeEach(() => {
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
    });

    it('appends the round to the stored conversation', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ rounds: [createRound({ id: 'round-1' })] })] },
      });

      await client.upsertRound({ id: 'conversation-1', round });

      expect(persistedRounds().map(({ id }) => id)).toEqual(['round-1', 'round-2']);
    });

    it('re-reads and keeps a round written concurrently after a conflict', async () => {
      mockEsClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [createConversationDocument({ rounds: [createRound({ id: 'round-1' })] })],
          },
        })
        // the winning writer's round is now present in the stored document
        .mockResolvedValue({
          hits: {
            hits: [
              createConversationDocument({
                seqNo: 2,
                rounds: [createRound({ id: 'round-1' }), createRound({ id: 'round-concurrent' })],
              }),
            ],
          },
        });
      mockEsClient.index.mockRejectedValueOnce(createConflictError());

      await client.upsertRound({ id: 'conversation-1', round });

      expect(mockEsClient.index).toHaveBeenCalledTimes(2);
      expect(persistedRounds(1).map(({ id }) => id)).toEqual([
        'round-1',
        'round-concurrent',
        'round-2',
      ]);
    });

    it('throws a write conflict error once retries are exhausted', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });
      mockEsClient.index.mockRejectedValue(createConflictError());

      const error = await client.upsertRound({ id: 'conversation-1', round }).catch((e) => e);

      expect(isConversationWriteConflictError(error)).toBe(true);
      expect(error.meta.statusCode).toBe(409);
    });

    it('preserves a title renamed while the round was running', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ title: 'Renamed by user' })] },
      });

      const result = await client.upsertRound({ id: 'conversation-1', round });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ title: 'Renamed by user' }),
        })
      );
      expect(result.title).toBe('Renamed by user');
    });

    it('keeps a concurrent attachment alongside one the round created', async () => {
      const concurrent = { id: 'attachment-concurrent', versions: [], current_version: 1 };
      const fromRound = { id: 'attachment-from-round', versions: [], current_version: 1 };

      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ attachments: [concurrent] })] },
      });

      await client.upsertRound({
        id: 'conversation-1',
        round,
        attachments: { snapshot: [], produced: [fromRound] } as never,
      });

      const { attachments } = mockEsClient.index.mock.calls[0][0].document;
      expect(attachments.map(({ id }: { id: string }) => id).sort()).toEqual([
        'attachment-concurrent',
        'attachment-from-round',
      ]);
    });

    it('keeps a round edit to an attachment the stored conversation still has at v1', async () => {
      const stored = { id: 'X', versions: [], current_version: 1 };
      const edited = { id: 'X', versions: [], current_version: 2 };

      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ attachments: [stored] })] },
      });

      await client.upsertRound({
        id: 'conversation-1',
        round,
        // the round started from v1 and edited it in memory; nothing has
        // persisted that yet, so the stored record must not win
        attachments: { snapshot: [stored], produced: [edited] } as never,
      });

      const { attachments } = mockEsClient.index.mock.calls[0][0].document;
      expect(attachments).toEqual([edited]);
    });

    it('does not overwrite a workspace already set on the stored conversation', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ workspaceId: 'workspace-existing' })] },
      });

      await client.upsertRound({
        id: 'conversation-1',
        round,
        workspaceId: 'workspace-new',
      });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ workspace_id: 'workspace-existing' }),
        })
      );
    });

    it('sets the workspace when the stored conversation has none', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      await client.upsertRound({
        id: 'conversation-1',
        round,
        workspaceId: 'workspace-new',
      });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ workspace_id: 'workspace-new' }),
        })
      );
    });
  });

  describe('addAttachmentsToLastRound', () => {
    const refs = [{ attachment_id: 'attachment-1', version: 1 }];
    const produced = [{ id: 'attachment-1', versions: [], current_version: 1 }];

    const persistedRounds = (call: number = 0) =>
      mockEsClient.index.mock.calls[call][0].document.conversation_rounds as Array<{
        id: string;
        input: { attachment_refs?: Array<{ attachment_id: string }> };
      }>;

    const request = {
      id: 'conversation-1',
      refs,
      attachments: { snapshot: [], produced },
    } as never;

    beforeEach(() => {
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
    });

    it('merges the refs into the last stored round only', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              rounds: [createRound({ id: 'round-1' }), createRound({ id: 'round-2' })],
            }),
          ],
        },
      });

      await client.addAttachmentsToLastRound(request);

      const [first, last] = persistedRounds();
      expect(first.input.attachment_refs).toBeUndefined();
      expect(last.input.attachment_refs).toEqual(refs);
    });

    it('applies the refs to a round appended concurrently after a conflict', async () => {
      mockEsClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [createConversationDocument({ rounds: [createRound({ id: 'round-1' })] })],
          },
        })
        .mockResolvedValue({
          hits: {
            hits: [
              createConversationDocument({
                seqNo: 2,
                rounds: [createRound({ id: 'round-1' }), createRound({ id: 'round-concurrent' })],
              }),
            ],
          },
        });
      mockEsClient.index.mockRejectedValueOnce(createConflictError());

      await client.addAttachmentsToLastRound(request);

      expect(mockEsClient.index).toHaveBeenCalledTimes(2);

      const [first, last] = persistedRounds(1);
      expect(first.id).toBe('round-1');
      expect(first.input.attachment_refs).toBeUndefined();
      expect(last.id).toBe('round-concurrent');
      expect(last.input.attachment_refs).toEqual(refs);
    });

    it('keeps a concurrent attachment alongside the produced ones', async () => {
      const concurrent = { id: 'attachment-concurrent', versions: [], current_version: 1 };

      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              rounds: [createRound({ id: 'round-1' })],
              attachments: [concurrent],
            }),
          ],
        },
      });

      await client.addAttachmentsToLastRound(request);

      const { attachments } = mockEsClient.index.mock.calls[0][0].document;
      expect(attachments.map(({ id }: { id: string }) => id).sort()).toEqual([
        'attachment-1',
        'attachment-concurrent',
      ]);
    });

    it('throws a bad request error when the stored conversation has no rounds', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      await expect(client.addAttachmentsToLastRound(request)).rejects.toThrow(
        'Conversation conversation-1 has no rounds to attach to'
      );

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('throws a write conflict error once retries are exhausted', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ rounds: [createRound({ id: 'round-1' })] })] },
      });
      mockEsClient.index.mockRejectedValue(createConflictError());

      const error = await client.addAttachmentsToLastRound(request).catch((e) => e);

      expect(isConversationWriteConflictError(error)).toBe(true);
      expect(error.meta.statusCode).toBe(409);
    });

    it('remains owner-only by default for public conversations', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              userId: 'other-user-id',
              username: 'other-user',
              accessMode: ConversationAccessControlMode.Public,
              rounds: [createRound({ id: 'round-1' })],
            }),
          ],
        },
      });

      await expect(client.addAttachmentsToLastRound(request)).rejects.toThrow(
        'Conversation conversation-1 not found'
      );

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('remains owner-only for public conversations', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              userId: 'other-user-id',
              username: 'other-user',
              accessMode: ConversationAccessControlMode.Public,
            }),
          ],
        },
      });

      await expect(client.delete('conversation-1')).rejects.toThrow(
        'Conversation conversation-1 not found'
      );

      expect(mockEsClient.delete).not.toHaveBeenCalled();
    });

    it('returns true when the document was already deleted (404)', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });
      const notFoundError = Object.assign(new Error('not found'), { statusCode: 404 });
      mockEsClient.delete.mockRejectedValue(notFoundError);

      await expect(client.delete('conversation-1')).resolves.toBe(true);
    });

    it('rethrows non-404 errors from the delete call', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });
      const serverError = Object.assign(new Error('internal server error'), { statusCode: 500 });
      mockEsClient.delete.mockRejectedValue(serverError);

      await expect(client.delete('conversation-1')).rejects.toBe(serverError);
    });
  });
});
