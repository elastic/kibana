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
import type { ConversationAccessControlEntry } from '@kbn/agent-builder-common/chat/access_control';
import {
  CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES,
  CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH,
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common/chat/access_control';
import type { ConversationTemplate, SerializedMetadataValue } from '@kbn/agent-builder-common';
import type { AgentRegistry } from '../../agents/agent_registry';
import { createRound } from '../../../test_utils';
import { createClient, type ConversationClient } from './client';
import type { Document } from './converters';

jest.mock('../templates/registry', () => ({ getTemplate: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const getTemplateMock: jest.Mock = require('../templates/registry').getTemplate;

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
    entries = [],
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
    entries?: ConversationAccessControlEntry[];
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
          entries,
        },
      },
    } as Document);

  beforeEach(() => {
    jest.clearAllMocks();

    agentRegistry = {
      get: jest.fn().mockResolvedValue({ id: 'agent-1' }),
      getIds: jest.fn().mockResolvedValue(['agent-1']),
    };

    getTemplateMock.mockReset();

    client = createClient({
      space: testSpace,
      logger: loggerMock.create(),
      esClient: {} as never,
      agentRegistry: agentRegistry as unknown as AgentRegistry,
      user: {
        id: 'user-1',
        username: 'test-user',
        isAdmin: false,
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
            entries: [],
          },
          origin,
        })
      );
    });

    it('filters listed conversations to public, owned or shared conversations for accessible agents', async () => {
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
                            {
                              nested: {
                                path: 'access_control.entries',
                                ignore_unmapped: true,
                                query: {
                                  bool: {
                                    filter: [
                                      { term: { 'access_control.entries.type': 'user' } },
                                      { term: { 'access_control.entries.id': 'user-1' } },
                                    ],
                                  },
                                },
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
      const result = await client.create({
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
      expect(result.permissions).toEqual({
        rename: true,
        delete: true,
        update_access_control: true,
      });
    });

    it('throws an already-exists error when the id already exists', async () => {
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
        message: 'Conversation conversation-1 already exists',
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

    it('serializes caller-supplied TOGGLE and NUMBER metadata to strings before indexing', async () => {
      // Regression for: caller passes boolean/number, raw value lands in ES, and
      // deserializeMetadataValue('true' === <boolean>) → wrong type on read-back.
      const template: ConversationTemplate = {
        id: 'tmpl-serialize',
        version: 1,
        name: 'Serialize test template',
        description: '',
        fields: {
          flag: { input_type: 'TOGGLE', required: false },
          count: { input_type: 'NUMBER', required: false },
        },
      };
      getTemplateMock.mockReturnValue(template);

      await client.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [],
        template_id: 'tmpl-serialize',
        metadata: { flag: true, count: 42 },
      });

      const { document: indexedDoc } = mockEsClient.index.mock.calls[0][0] as {
        document: Record<string, unknown>;
      };
      // Values must be stored as strings so the flattened field stays string-only.
      expect((indexedDoc.metadata as Record<string, unknown>).flag).toBe('true');
      expect((indexedDoc.metadata as Record<string, unknown>).count).toBe('42');
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

    it('allows the owner to rename with rename access', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      const result = await client.update(
        { id: 'conversation-1', title: 'Renamed' },
        { access: 'rename' }
      );

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'conversation-1',
          document: expect.objectContaining({ title: 'Renamed' }),
        })
      );
      expect(result.title).toBe('Renamed');
    });

    it('denies rename access to a public non-owner conversation', async () => {
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
        client.update({ id: 'conversation-1', title: 'Renamed' }, { access: 'rename' })
      ).rejects.toThrow('Conversation conversation-1 not found');

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
    it('remains owner-only for public conversations when the caller is not an admin', async () => {
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

  // ---------------------------------------------------------------------------
  // Template-related tests
  // ---------------------------------------------------------------------------

  const makeTemplate = (
    id: string,
    fields: ConversationTemplate['fields'] = {},
    version = 1
  ): ConversationTemplate => ({
    id,
    version,
    name: `Template ${id}`,
    description: 'A test template',
    fields,
  });

  const createConversationDocumentWithTemplate = ({
    templateId,
    templateVersion,
    metadata = {},
  }: {
    templateId?: string;
    templateVersion?: number;
    metadata?: Record<string, SerializedMetadataValue>;
  } = {}): Document =>
    ({
      _id: 'conversation-1',
      _seq_no: 1,
      _primary_term: 1,
      _source: {
        agent_id: 'agent-1',
        user_id: 'user-1',
        user_name: 'test-user',
        space: testSpace,
        title: 'Conversation 1',
        created_at: '2024-09-04T06:44:17.944Z',
        updated_at: '2025-08-04T06:44:19.123Z',
        read: false,
        conversation_rounds: [],
        access_control: { access_mode: ConversationAccessControlMode.Private },
        ...(templateId ? { template_id: templateId } : {}),
        ...(templateVersion !== undefined ? { template_version: templateVersion } : {}),
        ...(Object.keys(metadata).length ? { metadata } : {}),
      },
    } as Document);

  describe('template metadata response conversion', () => {
    const template = makeTemplate('template-1', {
      enabled: { input_type: 'TOGGLE', description: 'Enabled' },
    });

    beforeEach(() => {
      getTemplateMock.mockReturnValue(template);
    });

    it('deserializes template metadata when getting a conversation', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocumentWithTemplate({
              templateId: template.id,
              metadata: { enabled: 'true' },
            }),
          ],
        },
      });

      await expect(client.get('conversation-1')).resolves.toMatchObject({
        metadata: { enabled: true },
      });
    });

    it('requests and deserializes template metadata when listing conversations', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocumentWithTemplate({
              templateId: template.id,
              metadata: { enabled: 'true' },
            }),
          ],
        },
      });

      await expect(client.list()).resolves.toMatchObject([{ metadata: { enabled: true } }]);
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: expect.arrayContaining(['template_id', 'template_version', 'metadata']),
        })
      );
    });
  });

  describe('applyTemplate', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockEsClient.index.mockResolvedValue({});
    });

    it('throws a bad-request error when the template id is unknown', async () => {
      getTemplateMock.mockReturnValue(undefined);
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocumentWithTemplate()] },
      });

      await expect(
        client.applyTemplate('conversation-1', 'unknown-template')
      ).rejects.toMatchObject({
        message: expect.stringContaining('Template not found'),
      });
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('seeds template default values into metadata and stamps template_version', async () => {
      const template = makeTemplate(
        'tmpl-a',
        {
          severity: {
            input_type: 'SELECT',
            description: 'Severity',
            default_value: 'low',
            options: ['low', 'high'],
          },
          region: { input_type: 'TEXT', description: 'Region' }, // no default
        },
        2
      );
      getTemplateMock.mockReturnValue(template);
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocumentWithTemplate()] },
      });

      await client.applyTemplate('conversation-1', 'tmpl-a');

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            metadata: { severity: 'low' }, // only the field with a default value
            template_id: 'tmpl-a',
            template_version: 2,
          }),
        })
      );
    });

    it('rejects switching to a different template (one template per conversation)', async () => {
      const templateA = makeTemplate('tmpl-a', {
        old_key: { input_type: 'TEXT', description: 'Old key', default_value: 'old_value' },
      });
      const templateB = makeTemplate('tmpl-b', {
        new_key: { input_type: 'TEXT', description: 'New key', default_value: 'new_value' },
      });

      getTemplateMock.mockImplementation((id: string) =>
        id === 'tmpl-a' ? templateA : id === 'tmpl-b' ? templateB : undefined
      );

      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocumentWithTemplate({
              templateId: 'tmpl-a',
              metadata: { old_key: 'old_value' },
            }),
          ],
        },
      });

      await expect(client.applyTemplate('conversation-1', 'tmpl-b')).rejects.toThrow(
        'Conversation already has template "tmpl-a". Switching templates is not supported'
      );
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('rejects applying a different template even when conversation has user-defined metadata keys', async () => {
      const templateA = makeTemplate('tmpl-a', {
        tmpl_a_key: { input_type: 'TEXT', description: 'Template A key' },
      });
      const templateB = makeTemplate('tmpl-b', {
        tmpl_b_key: { input_type: 'TEXT', description: 'Template B key', default_value: 'b_val' },
      });

      getTemplateMock.mockImplementation((id: string) =>
        id === 'tmpl-a' ? templateA : id === 'tmpl-b' ? templateB : undefined
      );

      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocumentWithTemplate({
              templateId: 'tmpl-a',
              metadata: {
                tmpl_a_key: 'set_by_user',
                user_custom_key: 'stays',
              },
            }),
          ],
        },
      });

      await expect(client.applyTemplate('conversation-1', 'tmpl-b')).rejects.toThrow(
        'Conversation already has template "tmpl-a". Switching templates is not supported'
      );
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('on same-template version bump: preserves existing field values, drops removed fields', async () => {
      const templateV2 = makeTemplate(
        'tmpl-a',
        {
          kept_field: { input_type: 'TEXT', description: 'Still in new version' },
          new_field: {
            input_type: 'TEXT',
            description: 'Added in v2',
            default_value: 'new_default',
          },
        },
        2
      );

      // Registry always returns the latest version; existing conversation stores v1's fields.
      getTemplateMock.mockReturnValue(templateV2);
      // The conversation currently stores v1's fields
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocumentWithTemplate({
              templateId: 'tmpl-a',
              templateVersion: 1,
              metadata: {
                kept_field: 'user_value',
                dropped_field: 'old_value',
              },
            }),
          ],
        },
      });

      await client.applyTemplate('conversation-1', 'tmpl-a');

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            template_id: 'tmpl-a',
            template_version: 2,
            metadata: expect.objectContaining({
              kept_field: 'user_value', // existing value preserved
              new_field: 'new_default', // new field seeded with default
              // dropped_field: absent (not in new version's field set)
            }),
          }),
        })
      );
      const doc = mockEsClient.index.mock.calls[0][0].document;
      expect(doc.metadata).not.toHaveProperty('dropped_field');
    });

    it('serializes TOGGLE field defaults to strings when applying a template', async () => {
      const template = makeTemplate('tmpl-bool', {
        mfa_enabled: { input_type: 'TOGGLE', description: 'MFA flag', default_value: false },
      });
      getTemplateMock.mockReturnValue(template);
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocumentWithTemplate()] },
      });

      await client.applyTemplate('conversation-1', 'tmpl-bool');

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            metadata: { mfa_enabled: 'false' },
          }),
        })
      );
    });

    it('serializes TEXT_ARRAY field defaults to string arrays when applying a template', async () => {
      const template = makeTemplate('tmpl-arr', {
        tags: { input_type: 'TEXT_ARRAY', description: 'Tags', default_value: ['a', 'b'] },
      });
      getTemplateMock.mockReturnValue(template);
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocumentWithTemplate()] },
      });

      await client.applyTemplate('conversation-1', 'tmpl-arr');

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            metadata: { tags: ['a', 'b'] },
          }),
        })
      );
    });

    it('enforces owner access — throws for conversations owned by another user', async () => {
      getTemplateMock.mockReturnValue(makeTemplate('tmpl-a'));
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createConversationDocument({ userId: 'other-user', username: 'other' })],
        },
      });

      await expect(client.applyTemplate('conversation-1', 'tmpl-a')).rejects.toMatchObject({
        message: expect.stringContaining('conversation-1'),
      });
    });
  });

  describe('patchMetadata', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
    });

    it('throws when the conversation has no template', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocumentWithTemplate()] },
      });

      await expect(
        client.patchMetadata('conversation-1', { severity: 'high' })
      ).rejects.toMatchObject({
        message: expect.stringContaining('has no template'),
      });
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('merges serialized updates into existing metadata', async () => {
      const template = makeTemplate('tmpl-a', {
        severity: { input_type: 'SELECT', description: 'Sev', options: ['low', 'high'] },
        status: {
          input_type: 'SELECT',
          description: 'Status',
          options: ['open', 'closed'],
          default_value: 'open',
        },
        notified: { input_type: 'TOGGLE', description: 'Notified' },
      });
      getTemplateMock.mockReturnValue(template);

      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocumentWithTemplate({
              templateId: 'tmpl-a',
              metadata: { status: 'open' },
            }),
          ],
        },
      });

      await client.patchMetadata('conversation-1', { severity: 'high', notified: true });

      const written = mockEsClient.index.mock.calls[0][0].document;
      expect(written.metadata).toEqual({
        status: 'open', // pre-existing key preserved
        severity: 'high', // new key added
        notified: 'true', // TOGGLE serialized to string
      });
    });

    it('performs the merge inside the OCC closure so concurrent writes are not lost', async () => {
      // Simulate: at OCC read time the doc has an extra key `status` written concurrently.
      const template = makeTemplate('tmpl-a', {
        severity: { input_type: 'SELECT', description: 'Sev', options: ['low', 'high'] },
        status: {
          input_type: 'SELECT',
          description: 'Status',
          options: ['open', 'closed'],
          default_value: 'open',
        },
      });
      getTemplateMock.mockReturnValue(template);

      // The OCC read (inside writeConversation → readModifyWrite) returns a doc that already
      // has `status: 'closed'` written concurrently.
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocumentWithTemplate({
              templateId: 'tmpl-a',
              metadata: { status: 'closed' },
            }),
          ],
        },
      });

      await client.patchMetadata('conversation-1', { severity: 'high' });

      const written = mockEsClient.index.mock.calls[0][0].document;
      // The concurrently written `status` key must be preserved in the output.
      expect(written.metadata).toEqual({
        status: 'closed',
        severity: 'high',
      });
    });

    it('throws when an update key is not declared in the template', async () => {
      const template = makeTemplate('tmpl-a', {
        severity: { input_type: 'SELECT', description: 'Sev', options: ['low', 'high'] },
      });
      getTemplateMock.mockReturnValue(template);

      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocumentWithTemplate({ templateId: 'tmpl-a' })] },
      });

      await expect(
        client.patchMetadata('conversation-1', { unknown_field: 'value' })
      ).rejects.toMatchObject({
        message: expect.stringContaining('unknown_field'),
      });
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('enforces owner access — throws for conversations owned by another user', async () => {
      getTemplateMock.mockReturnValue(makeTemplate('tmpl-a', { x: { input_type: 'TEXT' } }));
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createConversationDocument({ userId: 'other-user', username: 'other' })],
        },
      });

      await expect(client.patchMetadata('conversation-1', { x: 'value' })).rejects.toMatchObject({
        message: expect.stringContaining('conversation-1'),
      });
    });
  });

  describe('create with template', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockEsClient.index.mockResolvedValue({ result: 'created' });
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocumentWithTemplate()] },
      });
    });

    it('seeds metadata from template fields that have a default value and stamps template_version', async () => {
      const template = makeTemplate(
        'tmpl-seed',
        {
          priority: {
            input_type: 'SELECT',
            description: 'Priority',
            default_value: 'medium',
            options: ['low', 'medium', 'high'],
          },
          no_default_field: { input_type: 'TEXT', description: 'Empty' },
        },
        3
      );
      getTemplateMock.mockReturnValue(template);

      await client.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [],
        template_id: 'tmpl-seed',
      });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            metadata: { priority: 'medium' }, // only fields with defaults
            template_id: 'tmpl-seed',
            template_version: 3,
          }),
        })
      );
    });

    it('serializes TOGGLE field defaults to strings in metadata on create', async () => {
      const template = makeTemplate('tmpl-bool', {
        mfa_enabled: { input_type: 'TOGGLE', description: 'MFA flag', default_value: false },
        containment_applied: {
          input_type: 'TOGGLE',
          description: 'Containment',
          default_value: true,
        },
        label: { input_type: 'TEXT', description: 'Label', default_value: 'active' },
      });
      getTemplateMock.mockReturnValue(template);

      await client.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [],
        template_id: 'tmpl-bool',
      });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            // TOGGLE and NUMBER values are serialized to strings for the flattened field mapping.
            metadata: { mfa_enabled: 'false', containment_applied: 'true', label: 'active' },
          }),
        })
      );
    });

    it('serializes TEXT_ARRAY field defaults to string arrays in metadata on create', async () => {
      const template = makeTemplate('tmpl-arr', {
        tags: { input_type: 'TEXT_ARRAY', description: 'Tags', default_value: ['alpha', 'beta'] },
      });
      getTemplateMock.mockReturnValue(template);

      await client.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [],
        template_id: 'tmpl-arr',
      });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            metadata: { tags: ['alpha', 'beta'] },
          }),
        })
      );
    });

    it('throws a bad-request error when the template id is unknown', async () => {
      getTemplateMock.mockReturnValue(undefined);

      await expect(
        client.create({
          id: 'conversation-1',
          title: 'Conversation 1',
          agent_id: 'agent-1',
          rounds: [],
          template_id: 'non-existent',
        })
      ).rejects.toThrow('Template not found: non-existent');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('creates without a template when template_id is not provided', async () => {
      await client.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [],
      });

      expect(getTemplateMock).not.toHaveBeenCalled();
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.not.objectContaining({ template_id: expect.anything() }),
        })
      );
    });
  });

  describe('access checks', () => {
    const publicConversationOwnedByAnotherUser = () =>
      createConversationDocument({
        userId: 'other-user-id',
        username: 'other-user',
        accessMode: ConversationAccessControlMode.Public,
      });

    it('returns owner permissions with conversations from get', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      const result = await client.get('conversation-1');

      expect(result.permissions).toEqual({
        rename: true,
        delete: true,
        update_access_control: true,
      });
      expect(result.access_control).toEqual({
        access_mode: ConversationAccessControlMode.Private,
        entries: [],
      });
    });

    it('returns public participant permissions with conversations from get', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [publicConversationOwnedByAnotherUser()] },
      });

      const result = await client.get('conversation-1');

      expect(result.permissions).toEqual({
        rename: false,
        delete: false,
        update_access_control: false,
      });
    });

    it('returns per-conversation permissions from list', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({ id: 'owned' }),
            { ...publicConversationOwnedByAnotherUser(), _id: 'participating' },
          ],
        },
      });

      const results = await client.list();

      expect(results.map(({ permissions }) => permissions)).toEqual([
        { rename: true, delete: true, update_access_control: true },
        { rename: false, delete: false, update_access_control: false },
      ]);
      results.forEach((conversation) => expect(conversation).not.toHaveProperty('rounds'));
      expect(results.map(({ id }) => id)).toEqual(['owned', 'participating']);
    });

    it('enforces delete denial for public participants', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [publicConversationOwnedByAnotherUser()] },
      });

      const result = await client.get('conversation-1');

      expect(result.permissions).toEqual({
        rename: false,
        delete: false,
        update_access_control: false,
      });
      await expect(client.delete('conversation-1')).rejects.toThrow(
        'Conversation conversation-1 not found'
      );
    });

    it('enforces rename denial for public participants', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [publicConversationOwnedByAnotherUser()] },
      });

      const result = await client.get('conversation-1');

      expect(result.permissions).toEqual({
        rename: false,
        delete: false,
        update_access_control: false,
      });
      await expect(
        client.update({ id: 'conversation-1', title: 'renamed' }, { access: 'rename' })
      ).rejects.toThrow('Conversation conversation-1 not found');
    });
  });

  describe('updateAccessControl', () => {
    const newMember: Omit<ConversationAccessControlEntry, 'added_at'> = {
      type: 'user',
      id: 'user-2',
      role: ConversationAccessControlRole.Member,
    };

    beforeEach(() => {
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
      jest.useFakeTimers().setSystemTime(new Date('2026-08-11T10:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('stamps added_at on new entries and persists the requested mode', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      const result = await client.updateAccessControl('conversation-1', {
        access_mode: ConversationAccessControlMode.Private,
        entries: [newMember],
      });

      expect(result).toEqual({
        access_mode: ConversationAccessControlMode.Private,
        entries: [{ ...newMember, added_at: '2026-08-11T10:00:00.000Z' }],
      });
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'conversation-1',
          document: expect.objectContaining({ access_control: result }),
        })
      );
    });

    it('rejects entries when publishing the conversation', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      await expect(
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Public,
          entries: [newMember],
        })
      ).rejects.toThrow('ACL entries are not supported when access_mode is "public"');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('allows publishing the conversation with an empty entries list', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      const result = await client.updateAccessControl('conversation-1', {
        access_mode: ConversationAccessControlMode.Public,
        entries: [],
      });

      expect(result).toEqual({ access_mode: ConversationAccessControlMode.Public, entries: [] });
    });

    it('preserves added_at for members that are already listed', async () => {
      const existing: ConversationAccessControlEntry = {
        ...newMember,
        added_at: '2026-01-01T00:00:00.000Z',
      };
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ entries: [existing] })] },
      });

      const result = await client.updateAccessControl('conversation-1', {
        access_mode: ConversationAccessControlMode.Private,
        entries: [newMember, { ...newMember, id: 'user-3' }],
      });

      expect(result.entries).toEqual([
        existing,
        { type: 'user', id: 'user-3', role: 'member', added_at: '2026-08-11T10:00:00.000Z' },
      ]);
    });

    it('drops an entry naming the owner', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      const result = await client.updateAccessControl('conversation-1', {
        access_mode: ConversationAccessControlMode.Private,
        entries: [{ ...newMember, id: 'user-1' }, newMember],
      });

      expect(result.entries).toEqual([{ ...newMember, added_at: '2026-08-11T10:00:00.000Z' }]);
    });

    it('rejects repeated ids with a bad request error', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      await expect(
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Private,
          entries: [newMember, newMember],
        })
      ).rejects.toThrow('Duplicate ACL entry for user "user-2"');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('rejects an invalid role with a bad request error', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      await expect(
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Private,
          entries: [{ ...newMember, role: 'manager' as ConversationAccessControlRole }],
        })
      ).rejects.toThrow('Unknown ACL role: manager');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('rejects more entries than the maximum', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      const entries = Array.from(
        { length: CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES + 1 },
        (_, index) => ({ ...newMember, id: `user-${index}` })
      );

      await expect(
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Private,
          entries,
        })
      ).rejects.toThrow(`ACL entries exceed maximum of ${CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES}`);

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('rejects a non-user principal type', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      await expect(
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Private,
          entries: [
            { ...newMember, type: 'role' } as unknown as Omit<
              ConversationAccessControlEntry,
              'added_at'
            >,
          ],
        })
      ).rejects.toThrow('Each ACL entry requires a type of "user"');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('rejects an empty id', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      await expect(
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Private,
          entries: [{ ...newMember, id: '' }],
        })
      ).rejects.toThrow('Each ACL entry requires a non-empty id');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('rejects an id longer than the maximum', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()] },
      });

      await expect(
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Private,
          entries: [
            {
              ...newMember,
              id: 'a'.repeat(CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH + 1),
            },
          ],
        })
      ).rejects.toThrow(
        `ACL principal id exceeds maximum length of ${CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH}`
      );

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('masks non-owners as not found, even for members of a public conversation', async () => {
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
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Private,
          entries: [],
        })
      ).rejects.toThrow('Conversation conversation-1 not found');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });
  });

  describe('admin client', () => {
    let adminClient: ConversationClient;

    const conversationOwnedByAnotherUser = (accessMode: ConversationAccessControlMode) =>
      createConversationDocument({
        userId: 'other-user-id',
        username: 'other-user',
        accessMode,
      });

    beforeEach(() => {
      adminClient = createClient({
        space: testSpace,
        logger: loggerMock.create(),
        esClient: {} as never,
        agentRegistry: agentRegistry as unknown as AgentRegistry,
        user: {
          id: 'admin-user-id',
          username: 'admin-user',
          isAdmin: true,
        },
      });
    });

    it('deletes a public conversation owned by another user', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [conversationOwnedByAnotherUser(ConversationAccessControlMode.Public)] },
      });
      mockEsClient.delete.mockResolvedValue({ result: 'deleted' });

      await expect(adminClient.delete('conversation-1')).resolves.toBe(true);

      expect(mockEsClient.delete).toHaveBeenCalledWith({ id: 'conversation-1' });
    });

    it('renames a public conversation owned by another user', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [conversationOwnedByAnotherUser(ConversationAccessControlMode.Public)] },
      });
      mockEsClient.index.mockResolvedValue({ result: 'updated' });

      const updated = await adminClient.update(
        { id: 'conversation-1', title: 'renamed by admin' },
        { access: 'rename' }
      );

      expect(updated.title).toBe('renamed by admin');
    });

    it('cannot rename or delete a private conversation owned by another user', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [conversationOwnedByAnotherUser(ConversationAccessControlMode.Private)] },
      });

      await expect(adminClient.delete('conversation-1')).rejects.toThrow(
        'Conversation conversation-1 not found'
      );
      await expect(
        adminClient.update(
          { id: 'conversation-1', title: 'renamed by admin' },
          { access: 'rename' }
        )
      ).rejects.toThrow('Conversation conversation-1 not found');

      expect(mockEsClient.delete).not.toHaveBeenCalled();
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('cannot read a private conversation owned by another user', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [conversationOwnedByAnotherUser(ConversationAccessControlMode.Private)] },
      });

      await expect(adminClient.get('conversation-1')).rejects.toThrow(
        'Conversation conversation-1 not found'
      );
    });

    it('does not gain owner access to a public conversation owned by another user', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [conversationOwnedByAnotherUser(ConversationAccessControlMode.Public)] },
      });

      await expect(
        adminClient.update({ id: 'conversation-1', title: 'renamed by admin' })
      ).rejects.toThrow('Conversation conversation-1 not found');
    });
  });
});
