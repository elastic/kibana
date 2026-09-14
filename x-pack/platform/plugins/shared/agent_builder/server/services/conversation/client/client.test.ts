/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
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
import type {
  ConversationTemplate,
  SerializedMetadataValue,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import type { AgentRegistry } from '../../agents/agent_registry';
import { createRound } from '../../../test_utils';
import { buildPinnedFilter } from '../access_control/query';
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

interface MockRawEsClient {
  get: jest.Mock;
}

const mockRawEsClient: MockRawEsClient = {
  get: jest.fn(),
};

const TEST_CONVERSATION_INDEX = '.kibana_agent_builder_conversations';

jest.mock('./storage', () => ({
  createStorage: jest.fn(() => ({
    getClient: jest.fn(() => mockEsClient),
  })),
  conversationIndexName: '.kibana_agent_builder_conversations',
}));

// Failing: See https://github.com/elastic/kibana/issues/289049
describe.skip('ConversationClient', () => {
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
    readBy = [{ userId: 'unrelated-reader-id' }],
    hasReadBy = true,
    pinnedBy = [{ userId: 'unrelated-pinner-id' }],
    schemaVersion,
    events,
    space = testSpace,
    hasSpace = true,
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
    readBy?: Array<{ userId: string }>;
    hasReadBy?: boolean;
    pinnedBy?: Array<{ userId: string }>;
    schemaVersion?: number;
    events?: TimelineEvent[];
    space?: string;
    hasSpace?: boolean;
  } = {}): Document =>
    ({
      _id: id,
      ...(versioned ? { _seq_no: seqNo, _primary_term: primaryTerm } : {}),
      _source: {
        agent_id: agentId,
        user_id: userId,
        user_name: username,
        ...(hasSpace ? { space } : {}),
        title,
        created_at: '2024-09-04T06:44:17.944Z',
        updated_at: '2025-08-04T06:44:19.123Z',
        read,
        ...(hasReadBy ? { read_by: readBy } : {}),
        pinned_by: pinnedBy,
        conversation_rounds: rounds,
        ...(attachments ? { attachments } : {}),
        ...(workspaceId ? { workspace_id: workspaceId } : {}),
        ...(schemaVersion !== undefined ? { schema_version: schemaVersion } : {}),
        ...(events !== undefined ? { events } : {}),
        access_control: {
          access_mode: accessMode,
          entries,
        },
      },
    } as Document);

  const mockGetDocumentResponse = (doc: Document) => {
    mockRawEsClient.get.mockResolvedValue({
      _id: doc._id!,
      _index: TEST_CONVERSATION_INDEX,
      _source: doc._source,
      _seq_no: doc._seq_no,
      _primary_term: doc._primary_term,
      found: true,
    });
  };

  const mockGetDocumentResponseOnce = (doc: Document) => {
    mockRawEsClient.get.mockResolvedValueOnce({
      _id: doc._id!,
      _index: TEST_CONVERSATION_INDEX,
      _source: doc._source,
      _seq_no: doc._seq_no,
      _primary_term: doc._primary_term,
      found: true,
    });
  };

  const mockGetDocumentNotFound = () => {
    mockRawEsClient.get.mockRejectedValue(
      Object.assign(new Error('not found'), { meta: { statusCode: 404 } })
    );
  };

  const expectNoReadBy = (conversation: unknown) => {
    expect(conversation).not.toHaveProperty('read_by');
    expect(conversation).not.toHaveProperty('pinned_by');
  };

  const expectNoReadByInList = (conversations: unknown[]) => {
    conversations.forEach(expectNoReadBy);
  };

  const expectOwnerPermissions = (conversation: { permissions?: unknown }) => {
    expect(conversation.permissions).toEqual({
      rename: true,
      delete: true,
      update_access_control: true,
    });
  };

  const expectParticipantPermissions = (conversation: { permissions?: unknown }) => {
    expect(conversation.permissions).toEqual({
      rename: false,
      delete: false,
      update_access_control: false,
    });
  };

  const expectOwnerPermissionsInList = (conversations: Array<{ permissions?: unknown }>) => {
    conversations.forEach(expectOwnerPermissions);
  };

  const expectNoRoundsInList = (conversations: unknown[]) => {
    conversations.forEach((conversation) => {
      expect(conversation).not.toHaveProperty('rounds');
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRawEsClient.get.mockReset();

    agentRegistry = {
      get: jest.fn().mockResolvedValue({ id: 'agent-1' }),
      getIds: jest.fn().mockResolvedValue(['agent-1']),
    };

    getTemplateMock.mockReset();

    client = createClient({
      space: testSpace,
      logger: loggerMock.create(),
      esClient: mockRawEsClient as unknown as ElasticsearchClient,
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

      const { results: result } = await client.list();

      expectNoReadByInList(result);
      expectOwnerPermissionsInList(result);
      expectNoRoundsInList(result);
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          seq_no_primary_term: true,
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

      const { results: result } = await client.list();

      expectNoReadByInList(result);
      expectOwnerPermissionsInList(result);
      expectNoRoundsInList(result);
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
                // Hide sub-agent conversations from the nav list
                { bool: { must_not: [{ exists: { field: 'parent_conversation' } }] } },
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

      const { results: result } = await client.list({ agentId: 'agent-2' });

      expectNoReadByInList(result);
      expectOwnerPermissionsInList(result);
      expectNoRoundsInList(result);
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

      await expect(client.list({ agentId: 'agent-2' })).resolves.toEqual({ results: [], total: 0 });

      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('returns an empty list when the user cannot access any underlying agents', async () => {
      agentRegistry.getIds.mockResolvedValue([]);

      await expect(client.list()).resolves.toEqual({ results: [], total: 0 });

      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    // --- pagination ---

    it('sends from=0, size=1000, descending sort, and track_total_hits=10000 by default', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      await client.list();

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 0,
          size: 1000,
          sort: [{ updated_at: { order: 'desc' } }, { created_at: { order: 'desc' } }],
          track_total_hits: 10_000,
        })
      );
    });

    it('computes from = (page - 1) * perPage', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      await client.list({ page: 3, perPage: 10 });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ from: 20, size: 10 })
      );
    });

    it('passes sortOrder: asc to both sort fields', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      await client.list({ sortOrder: 'asc' });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ updated_at: { order: 'asc' } }, { created_at: { order: 'asc' } }],
        })
      );
    });

    // --- total count ---

    it('returns total when hits.total is a plain number', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [], total: 7 } });

      const result = await client.list();

      expect(result.total).toBe(7);
    });

    it('returns total from hits.total.value when ES returns the object form', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 42, relation: 'eq' } },
      });

      const result = await client.list();

      expect(result.total).toBe(42);
    });

    it('caps total at 10000 when ES reports more via track_total_hits', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 99_999, relation: 'gte' } },
      });

      const result = await client.list();

      expect(result.total).toBe(10_000);
    });

    // --- pinned filter ---

    const listFilter = async (options?: { pinned?: boolean }) => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.list(options);

      return mockEsClient.search.mock.calls[0][0].query.bool.filter as unknown[];
    };

    // Shape is covered in access_control/query.test.ts; here we only assert list() applies it.
    const pinnedByCurrentUser = buildPinnedFilter({
      user: { id: 'user-1', username: 'test-user' },
      pinned: true,
    })[0];

    it('omits the pinned filter when pinned is undefined', async () => {
      const filterArray = await listFilter();

      expect(filterArray).not.toContainEqual(pinnedByCurrentUser);
      expect(filterArray).not.toContainEqual({ bool: { must_not: pinnedByCurrentUser } });
    });

    it('matches only conversations the calling user pinned when pinned is true', async () => {
      expect(await listFilter({ pinned: true })).toContainEqual(pinnedByCurrentUser);
    });

    it('negates the per-user match for pinned: false to include pre-field documents', async () => {
      const filterArray = await listFilter({ pinned: false });

      expect(filterArray).toContainEqual({ bool: { must_not: pinnedByCurrentUser } });
      // A plain term: { pinned: false } would silently exclude documents created
      // before the pinned field was added; must never be used.
      expect(filterArray).not.toContainEqual({ term: { pinned: false } });
    });
  });

  describe('get', () => {
    it('returns a public non-owner conversation when the user can use the agent', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Public,
        })
      );

      const result = await client.get('conversation-1');

      expectNoReadBy(result);
      expectParticipantPermissions(result);
      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
      expect(result.id).toBe('conversation-1');
    });

    it('returns not found when conversation access passes but agent use access fails', async () => {
      agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'agent-1' }));
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Public,
        })
      );

      await expect(client.get('conversation-1')).rejects.toMatchObject({
        message: 'Conversation conversation-1 not found',
      });
    });

    it('returns not found for owned conversations when agent use access fails', async () => {
      agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'agent-1' }));
      mockGetDocumentResponse(createConversationDocument());

      await expect(client.get('conversation-1')).rejects.toMatchObject({
        message: 'Conversation conversation-1 not found',
      });

      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
    });

    it('returns not found when the underlying agent is unavailable', async () => {
      agentRegistry.get.mockRejectedValue(createAgentUnavailableError({ agentId: 'agent-1' }));
      mockGetDocumentResponse(createConversationDocument());

      await expect(client.get('conversation-1')).rejects.toMatchObject({
        message: 'Conversation conversation-1 not found',
      });
    });
  });

  describe('exists', () => {
    it('returns true when the document exists, even when owned by another user and private', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Private,
        })
      );

      await expect(client.exists('conversation-1')).resolves.toBe(true);
      expect(mockRawEsClient.get).toHaveBeenCalledWith({
        index: TEST_CONVERSATION_INDEX,
        id: 'conversation-1',
      });
    });

    it('returns true when the document exists but agent use access fails', async () => {
      agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'agent-1' }));
      mockGetDocumentResponse(createConversationDocument());

      await expect(client.exists('conversation-1')).resolves.toBe(true);
    });

    it('returns false when no document exists', async () => {
      mockGetDocumentNotFound();

      await expect(client.exists('conversation-1')).resolves.toBe(false);
    });

    it('propagates Elasticsearch read failures', async () => {
      const error = new Error('read timeout');
      mockRawEsClient.get.mockRejectedValue(error);

      await expect(client.exists('conversation-1')).rejects.toBe(error);
    });
  });

  // Reads-by-id go through `esClient.get` (no space filter), so cross-space isolation is enforced
  // in application code inside `getDocument`. These tests lock in that guarantee, which used to
  // come for free from the DSL `createSpaceDslFilter`.
  describe('space isolation for reads-by-id', () => {
    const createClientInSpace = (space: string) =>
      createClient({
        space,
        logger: loggerMock.create(),
        esClient: mockRawEsClient as unknown as ElasticsearchClient,
        agentRegistry: agentRegistry as unknown as AgentRegistry,
        user: { id: 'user-1', username: 'test-user', isAdmin: false },
      });

    it('treats a doc from a different space as not-found for a non-default-space client', async () => {
      const otherSpaceClient = createClientInSpace('team-a');
      mockGetDocumentResponse(createConversationDocument({ space: 'team-b' }));

      await expect(otherSpaceClient.get('conversation-1')).rejects.toMatchObject({
        message: 'Conversation conversation-1 not found',
      });
      await expect(otherSpaceClient.exists('conversation-1')).resolves.toBe(false);
    });

    it('treats a doc without a space field as not-found for a non-default-space client', async () => {
      const otherSpaceClient = createClientInSpace('team-a');
      mockGetDocumentResponse(createConversationDocument({ hasSpace: false }));

      await expect(otherSpaceClient.get('conversation-1')).rejects.toMatchObject({
        message: 'Conversation conversation-1 not found',
      });
      await expect(otherSpaceClient.exists('conversation-1')).resolves.toBe(false);
    });

    it('treats a doc from a non-default space as not-found for a default-space client', async () => {
      mockGetDocumentResponse(createConversationDocument({ space: 'team-a' }));

      await expect(client.get('conversation-1')).rejects.toMatchObject({
        message: 'Conversation conversation-1 not found',
      });
      await expect(client.exists('conversation-1')).resolves.toBe(false);
    });

    it('accepts a doc without a space field for a default-space client (legacy pre-space docs)', async () => {
      mockGetDocumentResponse(createConversationDocument({ hasSpace: false }));

      await expect(client.exists('conversation-1')).resolves.toBe(true);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      mockEsClient.index.mockResolvedValue({ result: 'created' });
      mockGetDocumentResponse(createConversationDocument());
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
      expectNoReadBy(result);
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
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: [document],
        },
      });
      mockGetDocumentResponseOnce(document);

      const result = await client.getByOrigin({
        external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      });

      expectNoReadBy(result);
      expect(result?.id).toBe('conversation-1');
      expect(mockEsClient.search).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          seq_no_primary_term: true,
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
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Public,
        })
      );

      await expect(client.update({ id: 'conversation-1', title: 'Updated title' })).rejects.toThrow(
        'Conversation conversation-1 not found'
      );

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('allows the owner to rename with rename access', async () => {
      mockGetDocumentResponse(createConversationDocument());

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
      expectNoReadBy(result);
      expect(result.title).toBe('Renamed');
    });

    it('preserves legacy owner read state when renaming before read_by exists', async () => {
      mockGetDocumentResponse(createConversationDocument({ read: true, hasReadBy: false }));

      const result = await client.update(
        { id: 'conversation-1', title: 'Renamed' },
        { access: 'rename' }
      );

      const { document } = mockEsClient.index.mock.calls[0][0];
      expect(document.read).toBeUndefined();
      expect(document.read_by).toEqual([{ userId: 'user-1' }]);
      expectNoReadBy(result);
      expect(result.read).toBe(true);
    });

    it('denies rename access to a public non-owner conversation', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Public,
        })
      );

      await expect(
        client.update({ id: 'conversation-1', title: 'Renamed' }, { access: 'rename' })
      ).rejects.toThrow('Conversation conversation-1 not found');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('preserves the original owner when a non-owner writes with converse access', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Public,
        })
      );

      await client.update({ id: 'conversation-1', title: 'Updated title' }, { access: 'converse' });

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
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Public,
        })
      );

      await expect(
        client.update({ id: 'conversation-1', title: 'Updated title' }, { access: 'converse' })
      ).rejects.toThrow('Conversation conversation-1 not found');

      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('returns not found for owned converse updates when agent use access fails', async () => {
      agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'agent-1' }));
      mockGetDocumentResponse(createConversationDocument());

      await expect(
        client.update({ id: 'conversation-1', title: 'Updated title' }, { access: 'converse' })
      ).rejects.toThrow('Conversation conversation-1 not found');

      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });
  });

  describe('optimistic concurrency control', () => {
    it('reads the document by id via the raw ES get API', async () => {
      mockGetDocumentResponse(createConversationDocument());

      await client.update({ id: 'conversation-1', title: 'Updated title' });

      expect(mockRawEsClient.get).toHaveBeenCalledWith({
        index: TEST_CONVERSATION_INDEX,
        id: 'conversation-1',
      });
    });

    it('passes the version read from the document to the write', async () => {
      mockGetDocumentResponse(createConversationDocument({ seqNo: 42, primaryTerm: 7 }));

      await client.update({ id: 'conversation-1', title: 'Updated title' });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({ if_seq_no: 42, if_primary_term: 7 })
      );
    });

    it('refuses to write when the read returned no version metadata', async () => {
      mockGetDocumentResponse(createConversationDocument({ versioned: false }));

      await expect(client.update({ id: 'conversation-1', title: 'x' })).rejects.toThrow(
        /read without version metadata/
      );
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('surfaces a write conflict as a conversation write conflict error', async () => {
      mockGetDocumentResponse(createConversationDocument());
      mockEsClient.index.mockRejectedValue(createConflictError());

      const error = await client.update({ id: 'conversation-1', title: 'x' }).catch((e) => e);

      expect(isConversationWriteConflictError(error)).toBe(true);
      expect(error.meta.statusCode).toBe(409);
    });

    it('does not retry by default, so a payload built from a stale read is not re-applied', async () => {
      mockGetDocumentResponse(createConversationDocument());
      mockEsClient.index.mockRejectedValue(createConflictError());

      await expect(client.update({ id: 'conversation-1', title: 'x' })).rejects.toThrow();

      expect(mockEsClient.index).toHaveBeenCalledTimes(1);
    });

    it('re-applies the requested read state over the fresh document when retrying after conflict', async () => {
      mockGetDocumentResponseOnce(createConversationDocument());
      // a round landed first, adding a round and marking the conversation unread
      mockGetDocumentResponse(
        createConversationDocument({
          seqNo: 2,
          read: false,
          readBy: [],
          rounds: [createRound({ id: 'round-concurrent' })],
        })
      );
      mockEsClient.index.mockRejectedValueOnce(createConflictError());
      mockEsClient.index.mockResolvedValue({ _seq_no: 3, _primary_term: 1 });

      const result = await client.markRead('conversation-1', true);

      expect(mockEsClient.index).toHaveBeenCalledTimes(2);

      const { document } = mockEsClient.index.mock.calls[1][0];
      expect(document.read_by).toEqual([{ userId: 'user-1' }]);
      // the concurrently written round is preserved
      expect(document.conversation_rounds).toHaveLength(1);
      expectNoReadBy(result);
      expect(result.read).toBe(true);
    });
  });

  describe('markRead', () => {
    it('adds only the calling user to read_by', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Public,
          readBy: [],
        })
      );

      const result = await client.markRead('conversation-1', true);

      const { document } = mockEsClient.index.mock.calls[0][0];
      expect(document.read_by).toEqual([{ userId: 'user-1' }]);
      expectNoReadBy(result);
      expect(result.read).toBe(true);
    });

    it('does not clobber read_by entries written by another user', async () => {
      mockGetDocumentResponseOnce(createConversationDocument());
      // another user marked it read concurrently
      mockGetDocumentResponse(
        createConversationDocument({
          seqNo: 2,
          readBy: [{ userId: 'other-user-id' }],
        })
      );
      mockEsClient.index.mockRejectedValueOnce(createConflictError());
      mockEsClient.index.mockResolvedValue({ _seq_no: 3, _primary_term: 1 });

      await client.markRead('conversation-1', true);

      const { document } = mockEsClient.index.mock.calls[1][0];
      expect(document.read_by).toEqual(
        expect.arrayContaining([{ userId: 'other-user-id' }, { userId: 'user-1' }])
      );
    });

    it('removes only the calling user when marking unread', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          readBy: [{ userId: 'user-1' }, { userId: 'other-id' }],
        })
      );

      await client.markRead('conversation-1', false);

      const { document } = mockEsClient.index.mock.calls[0][0];
      expect(document.read_by).toEqual([{ userId: 'other-id' }]);
    });

    it('is a no-op when the calling user has no stable id', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          readBy: [],
          accessMode: ConversationAccessControlMode.Public,
        })
      );

      client = createClient({
        space: testSpace,
        logger: loggerMock.create(),
        esClient: mockRawEsClient as unknown as ElasticsearchClient,
        agentRegistry: agentRegistry as unknown as AgentRegistry,
        user: { username: 'no-profile-user', isAdmin: false },
      });

      const result = await client.markRead('conversation-1', true);

      expectNoReadBy(result);
      const { document } = mockEsClient.index.mock.calls[0][0];
      expect(document.read_by).toEqual([]);
      expect(result.read).toBe(false);
    });
  });

  describe('setPinned', () => {
    it('adds only the calling user to pinned_by', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Public,
          pinnedBy: [],
        })
      );

      const result = await client.setPinned('conversation-1', true);

      const { document } = mockEsClient.index.mock.calls[0][0];
      expect(document.pinned_by).toEqual([{ userId: 'user-1' }]);
      expectNoReadBy(result);
      expect(result.pinned).toBe(true);
    });

    it('does not clobber pinned_by entries written by another user', async () => {
      mockGetDocumentResponseOnce(createConversationDocument({ pinnedBy: [] }));
      // another user pinned it concurrently
      mockGetDocumentResponse(
        createConversationDocument({
          seqNo: 2,
          pinnedBy: [{ userId: 'other-user-id' }],
        })
      );
      mockEsClient.index.mockRejectedValueOnce(createConflictError());
      mockEsClient.index.mockResolvedValue({ _seq_no: 3, _primary_term: 1 });

      await client.setPinned('conversation-1', true);

      const { document } = mockEsClient.index.mock.calls[1][0];
      expect(document.pinned_by).toEqual(
        expect.arrayContaining([{ userId: 'other-user-id' }, { userId: 'user-1' }])
      );
    });

    it('removes only the calling user when unpinning', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          pinnedBy: [{ userId: 'user-1' }, { userId: 'other-id' }],
        })
      );

      await client.setPinned('conversation-1', false);

      const { document } = mockEsClient.index.mock.calls[0][0];
      expect(document.pinned_by).toEqual([{ userId: 'other-id' }]);
    });

    it('is a no-op when the calling user has no stable id', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          pinnedBy: [],
          accessMode: ConversationAccessControlMode.Public,
        })
      );

      client = createClient({
        space: testSpace,
        logger: loggerMock.create(),
        esClient: mockRawEsClient as unknown as ElasticsearchClient,
        agentRegistry: agentRegistry as unknown as AgentRegistry,
        user: { username: 'no-profile-user', isAdmin: false },
      });

      const result = await client.setPinned('conversation-1', true);

      expectNoReadBy(result);
      const { document } = mockEsClient.index.mock.calls[0][0];
      expect(document.pinned_by).toEqual([]);
      expect(result.pinned).toBe(false);
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
      mockGetDocumentResponse(
        createConversationDocument({ rounds: [createRound({ id: 'round-1' })] })
      );

      await client.upsertRound({ id: 'conversation-1', round });

      expect(persistedRounds().map(({ id }) => id)).toEqual(['round-1', 'round-2']);
    });

    it('re-reads and keeps a round written concurrently after a conflict', async () => {
      mockGetDocumentResponseOnce(
        createConversationDocument({ rounds: [createRound({ id: 'round-1' })] })
      );
      // the winning writer's round is now present in the stored document
      mockGetDocumentResponse(
        createConversationDocument({
          seqNo: 2,
          rounds: [createRound({ id: 'round-1' }), createRound({ id: 'round-concurrent' })],
        })
      );
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
      mockGetDocumentResponse(createConversationDocument());
      mockEsClient.index.mockRejectedValue(createConflictError());

      const error = await client.upsertRound({ id: 'conversation-1', round }).catch((e) => e);

      expect(isConversationWriteConflictError(error)).toBe(true);
      expect(error.meta.statusCode).toBe(409);
    });

    it('preserves a title renamed while the round was running', async () => {
      mockGetDocumentResponse(createConversationDocument({ title: 'Renamed by user' }));

      const result = await client.upsertRound({ id: 'conversation-1', round });

      expectNoReadBy(result);
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

      mockGetDocumentResponse(createConversationDocument({ attachments: [concurrent] }));

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

      mockGetDocumentResponse(createConversationDocument({ attachments: [stored] }));

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
      mockGetDocumentResponse(createConversationDocument({ workspaceId: 'workspace-existing' }));

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
      mockGetDocumentResponse(createConversationDocument());

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
      mockGetDocumentResponse(
        createConversationDocument({
          rounds: [createRound({ id: 'round-1' }), createRound({ id: 'round-2' })],
        })
      );

      await client.addAttachmentsToLastRound(request);

      const [first, last] = persistedRounds();
      expect(first.input.attachment_refs).toBeUndefined();
      expect(last.input.attachment_refs).toEqual(refs);
    });

    it('applies the refs to a round appended concurrently after a conflict', async () => {
      mockGetDocumentResponseOnce(
        createConversationDocument({ rounds: [createRound({ id: 'round-1' })] })
      );
      mockGetDocumentResponse(
        createConversationDocument({
          seqNo: 2,
          rounds: [createRound({ id: 'round-1' }), createRound({ id: 'round-concurrent' })],
        })
      );
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

      mockGetDocumentResponse(
        createConversationDocument({
          rounds: [createRound({ id: 'round-1' })],
          attachments: [concurrent],
        })
      );

      await client.addAttachmentsToLastRound(request);

      const { attachments } = mockEsClient.index.mock.calls[0][0].document;
      expect(attachments.map(({ id }: { id: string }) => id).sort()).toEqual([
        'attachment-1',
        'attachment-concurrent',
      ]);
    });

    it('throws a bad request error when the stored conversation has no rounds', async () => {
      mockGetDocumentResponse(createConversationDocument());

      await expect(client.addAttachmentsToLastRound(request)).rejects.toThrow(
        'Conversation conversation-1 has no rounds to attach to'
      );

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('throws a write conflict error once retries are exhausted', async () => {
      mockGetDocumentResponse(
        createConversationDocument({ rounds: [createRound({ id: 'round-1' })] })
      );
      mockEsClient.index.mockRejectedValue(createConflictError());

      const error = await client.addAttachmentsToLastRound(request).catch((e) => e);

      expect(isConversationWriteConflictError(error)).toBe(true);
      expect(error.meta.statusCode).toBe(409);
    });

    it('remains owner-only by default for public conversations', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Public,
          rounds: [createRound({ id: 'round-1' })],
        })
      );

      await expect(client.addAttachmentsToLastRound(request)).rejects.toThrow(
        'Conversation conversation-1 not found'
      );

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });
  });

  describe('updateRoundFeedback', () => {
    const round = createRound({ id: 'round-1' });

    beforeEach(() => {
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
    });

    it('persists a vote with chips and comment, stamping connector and model from model_usage', async () => {
      const roundWithModel = createRound({
        id: 'round-1',
        model_usage: {
          connector_id: 'connector-abc',
          model: 'claude-4.6-sonnet',
          input_tokens: 10,
          output_tokens: 5,
          llm_calls: 1,
        },
      });
      mockGetDocumentResponse(createConversationDocument({ rounds: [roundWithModel] }));

      await client.updateRoundFeedback('conversation-1', 'round-1', {
        vote: 'up',
        chips: ['useful'],
        comment: 'great answer',
      });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'conversation-1',
          if_seq_no: 1,
          if_primary_term: 1,
          document: expect.objectContaining({
            conversation_rounds: [
              expect.objectContaining({
                id: 'round-1',
                feedback: expect.objectContaining({
                  vote: 'up',
                  chips: ['useful'],
                  comment: 'great answer',
                  connector_id: 'connector-abc',
                  model: 'claude-4.6-sonnet',
                }),
              }),
            ],
          }),
        })
      );
    });

    it('removes the feedback sub-object entirely on retract (vote: null)', async () => {
      const roundWithFeedback = {
        ...round,
        feedback: {
          vote: 'up' as const,
          chips: [],
          comment: '',
          submitted_at: '2025-01-01T00:00:00.000Z',
        },
      };
      mockGetDocumentResponse(createConversationDocument({ rounds: [roundWithFeedback] }));

      await client.updateRoundFeedback('conversation-1', 'round-1', { vote: null });

      const persistedRounds = mockEsClient.index.mock.calls[0][0].document
        .conversation_rounds as Array<Record<string, unknown>>;
      expect(persistedRounds[0]).not.toHaveProperty('feedback');
    });

    it('throws not found when the round does not exist in the conversation', async () => {
      mockGetDocumentResponse(createConversationDocument({ rounds: [round] }));

      await expect(
        client.updateRoundFeedback('conversation-1', 'nonexistent-round', { vote: 'up' })
      ).rejects.toMatchObject({ message: 'Conversation conversation-1 not found' });

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('retries on a 409 conflict, re-reading the document with the updated sequence', async () => {
      mockGetDocumentResponseOnce(createConversationDocument({ seqNo: 1, rounds: [round] }));
      mockGetDocumentResponse(createConversationDocument({ seqNo: 2, rounds: [round] }));
      mockEsClient.index.mockRejectedValueOnce(createConflictError()).mockResolvedValue({});

      await client.updateRoundFeedback('conversation-1', 'round-1', { vote: 'down' });

      expect(mockEsClient.index).toHaveBeenCalledTimes(2);
      expect(mockEsClient.index).toHaveBeenLastCalledWith(
        expect.objectContaining({ if_seq_no: 2, if_primary_term: 1 })
      );
    });

    it('throws a write conflict error once retries are exhausted', async () => {
      mockGetDocumentResponse(createConversationDocument({ rounds: [round] }));
      mockEsClient.index.mockRejectedValue(createConflictError());

      const error = await client
        .updateRoundFeedback('conversation-1', 'round-1', { vote: 'up' })
        .catch((e) => e);

      expect(isConversationWriteConflictError(error)).toBe(true);
      expect(error.meta.statusCode).toBe(409);
    });

    it('is restricted to the conversation owner', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Private,
          rounds: [round],
        })
      );

      await expect(
        client.updateRoundFeedback('conversation-1', 'round-1', { vote: 'up' })
      ).rejects.toMatchObject({ message: 'Conversation conversation-1 not found' });

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('remains owner-only for public conversations when the caller is not an admin', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Public,
        })
      );

      await expect(client.delete('conversation-1')).rejects.toThrow(
        'Conversation conversation-1 not found'
      );

      expect(mockEsClient.delete).not.toHaveBeenCalled();
    });

    it('returns true when the document was already deleted (404)', async () => {
      mockGetDocumentResponse(createConversationDocument());
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
      const notFoundError = Object.assign(new Error('not found'), { statusCode: 404 });
      mockEsClient.delete.mockRejectedValue(notFoundError);

      await expect(client.delete('conversation-1')).resolves.toBe(true);
    });

    it('rethrows non-404 errors from the delete call', async () => {
      mockGetDocumentResponse(createConversationDocument());
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
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
      mockGetDocumentResponse(
        createConversationDocumentWithTemplate({
          templateId: template.id,
          metadata: { enabled: 'true' },
        })
      );

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

      await expect(client.list()).resolves.toMatchObject({
        results: [{ metadata: { enabled: true } }],
      });
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
      mockGetDocumentResponse(createConversationDocumentWithTemplate());

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
      mockGetDocumentResponse(createConversationDocumentWithTemplate());

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

      mockGetDocumentResponse(
        createConversationDocumentWithTemplate({
          templateId: 'tmpl-a',
          metadata: { old_key: 'old_value' },
        })
      );

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

      mockGetDocumentResponse(
        createConversationDocumentWithTemplate({
          templateId: 'tmpl-a',
          metadata: {
            tmpl_a_key: 'set_by_user',
            user_custom_key: 'stays',
          },
        })
      );

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
      mockGetDocumentResponse(
        createConversationDocumentWithTemplate({
          templateId: 'tmpl-a',
          templateVersion: 1,
          metadata: {
            kept_field: 'user_value',
            dropped_field: 'old_value',
          },
        })
      );

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
      mockGetDocumentResponse(createConversationDocumentWithTemplate());

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
      mockGetDocumentResponse(createConversationDocumentWithTemplate());

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
      mockGetDocumentResponse(
        createConversationDocument({ userId: 'other-user', username: 'other' })
      );

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
      mockGetDocumentResponse(createConversationDocumentWithTemplate());

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

      mockGetDocumentResponse(
        createConversationDocumentWithTemplate({
          templateId: 'tmpl-a',
          metadata: { status: 'open' },
        })
      );

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
      mockGetDocumentResponse(
        createConversationDocumentWithTemplate({
          templateId: 'tmpl-a',
          metadata: { status: 'closed' },
        })
      );

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

      mockGetDocumentResponse(createConversationDocumentWithTemplate({ templateId: 'tmpl-a' }));

      await expect(
        client.patchMetadata('conversation-1', { unknown_field: 'value' })
      ).rejects.toMatchObject({
        message: expect.stringContaining('unknown_field'),
      });
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('enforces owner access — throws for conversations owned by another user', async () => {
      getTemplateMock.mockReturnValue(makeTemplate('tmpl-a', { x: { input_type: 'TEXT' } }));
      mockGetDocumentResponse(
        createConversationDocument({ userId: 'other-user', username: 'other' })
      );

      await expect(client.patchMetadata('conversation-1', { x: 'value' })).rejects.toMatchObject({
        message: expect.stringContaining('conversation-1'),
      });
    });

    describe('onMetadataPatched callback', () => {
      const template = makeTemplate('tmpl-cb', {
        status: {
          input_type: 'SELECT',
          description: 'Status',
          options: ['open', 'closed'],
        },
        severity: { input_type: 'SELECT', description: 'Sev', options: ['low', 'high'] },
      });

      beforeEach(() => {
        getTemplateMock.mockReturnValue(template);
        mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
      });

      it('calls onMetadataPatched with changed fields after a successful write', async () => {
        const onMetadataPatched = jest.fn();
        const clientWithCb = createClient({
          space: testSpace,
          logger: loggerMock.create(),
          esClient: mockRawEsClient as unknown as ElasticsearchClient,
          agentRegistry: agentRegistry as unknown as AgentRegistry,
          user: { id: 'user-1', username: 'test-user', isAdmin: false },
          onMetadataPatched,
        });

        mockGetDocumentResponse(
          createConversationDocumentWithTemplate({
            templateId: template.id,
            metadata: { status: 'open' },
          })
        );

        await clientWithCb.patchMetadata('conversation-1', { severity: 'high' });

        expect(onMetadataPatched).toHaveBeenCalledWith({
          conversationId: 'conversation-1',
          templateId: template.id,
          parentId: undefined,
          changedFields: ['severity'],
        });
      });

      it('includes parentId when the conversation has a parent_conversation', async () => {
        const onMetadataPatched = jest.fn();
        const clientWithCb = createClient({
          space: testSpace,
          logger: loggerMock.create(),
          esClient: mockRawEsClient as unknown as ElasticsearchClient,
          agentRegistry: agentRegistry as unknown as AgentRegistry,
          user: { id: 'user-1', username: 'test-user', isAdmin: false },
          onMetadataPatched,
        });

        const docWithParent = {
          ...createConversationDocumentWithTemplate({
            templateId: template.id,
          }),
        };
        (docWithParent._source as unknown as Record<string, unknown>).parent_conversation = {
          id: 'parent-conv-1',
          relation: 'subagent',
        };

        mockGetDocumentResponse(docWithParent);

        await clientWithCb.patchMetadata('conversation-1', { status: 'closed' });

        expect(onMetadataPatched).toHaveBeenCalledWith(
          expect.objectContaining({ parentId: 'parent-conv-1' })
        );
      });

      it('does not call onMetadataPatched when all values are identical (no-op suppression)', async () => {
        const onMetadataPatched = jest.fn();
        const clientWithCb = createClient({
          space: testSpace,
          logger: loggerMock.create(),
          esClient: mockRawEsClient as unknown as ElasticsearchClient,
          agentRegistry: agentRegistry as unknown as AgentRegistry,
          user: { id: 'user-1', username: 'test-user', isAdmin: false },
          onMetadataPatched,
        });

        mockGetDocumentResponse(
          createConversationDocumentWithTemplate({
            templateId: template.id,
            // status is already 'open' — writing the same value is a no-op
            metadata: { status: 'open' },
          })
        );

        await clientWithCb.patchMetadata('conversation-1', { status: 'open' });

        expect(onMetadataPatched).not.toHaveBeenCalled();
      });

      it('does not call onMetadataPatched when the write fails', async () => {
        const onMetadataPatched = jest.fn();
        const clientWithCb = createClient({
          space: testSpace,
          logger: loggerMock.create(),
          esClient: mockRawEsClient as unknown as ElasticsearchClient,
          agentRegistry: agentRegistry as unknown as AgentRegistry,
          user: { id: 'user-1', username: 'test-user', isAdmin: false },
          onMetadataPatched,
        });

        mockGetDocumentResponse(
          createConversationDocumentWithTemplate({ templateId: template.id })
        );
        mockEsClient.index.mockRejectedValue(new Error('disk full'));

        await expect(
          clientWithCb.patchMetadata('conversation-1', { severity: 'high' })
        ).rejects.toThrow('disk full');

        expect(onMetadataPatched).not.toHaveBeenCalled();
      });
    });
  });

  describe('create with template', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockEsClient.index.mockResolvedValue({ result: 'created' });
      mockGetDocumentResponse(createConversationDocumentWithTemplate());
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
      mockGetDocumentResponse(createConversationDocument());

      const result = await client.get('conversation-1');

      expectNoReadBy(result);
      expectOwnerPermissions(result);
    });

    it('returns public participant permissions with conversations from get', async () => {
      mockGetDocumentResponse(publicConversationOwnedByAnotherUser());

      const result = await client.get('conversation-1');

      expectNoReadBy(result);
      expectParticipantPermissions(result);
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

      const { results } = await client.list();

      expectNoReadByInList(results);
      expectNoRoundsInList(results);
      expect(results.map(({ permissions }) => permissions)).toEqual([
        { rename: true, delete: true, update_access_control: true },
        { rename: false, delete: false, update_access_control: false },
      ]);
      expect(results.map(({ id }) => id)).toEqual(['owned', 'participating']);
    });

    it('enforces delete denial for public participants', async () => {
      mockGetDocumentResponse(publicConversationOwnedByAnotherUser());

      const result = await client.get('conversation-1');

      expectNoReadBy(result);
      expectParticipantPermissions(result);
      await expect(client.delete('conversation-1')).rejects.toThrow(
        'Conversation conversation-1 not found'
      );
    });

    it('enforces rename denial for public participants', async () => {
      mockGetDocumentResponse(publicConversationOwnedByAnotherUser());

      const result = await client.get('conversation-1');

      expectNoReadBy(result);
      expectParticipantPermissions(result);
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
      mockGetDocumentResponse(createConversationDocument());

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
      mockGetDocumentResponse(createConversationDocument());

      await expect(
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Public,
          entries: [newMember],
        })
      ).rejects.toThrow('ACL entries are not supported when access_mode is "public"');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('allows publishing the conversation with an empty entries list', async () => {
      mockGetDocumentResponse(createConversationDocument());

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
      mockGetDocumentResponse(createConversationDocument({ entries: [existing] }));

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
      mockGetDocumentResponse(createConversationDocument());

      const result = await client.updateAccessControl('conversation-1', {
        access_mode: ConversationAccessControlMode.Private,
        entries: [{ ...newMember, id: 'user-1' }, newMember],
      });

      expect(result.entries).toEqual([{ ...newMember, added_at: '2026-08-11T10:00:00.000Z' }]);
    });

    it('rejects repeated ids with a bad request error', async () => {
      mockGetDocumentResponse(createConversationDocument());

      await expect(
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Private,
          entries: [newMember, newMember],
        })
      ).rejects.toThrow('Duplicate ACL entry for user "user-2"');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('rejects an invalid role with a bad request error', async () => {
      mockGetDocumentResponse(createConversationDocument());

      await expect(
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Private,
          entries: [{ ...newMember, role: 'manager' as ConversationAccessControlRole }],
        })
      ).rejects.toThrow('Unknown ACL role: manager');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('rejects more entries than the maximum', async () => {
      mockGetDocumentResponse(createConversationDocument());

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
      mockGetDocumentResponse(createConversationDocument());

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
      mockGetDocumentResponse(createConversationDocument());

      await expect(
        client.updateAccessControl('conversation-1', {
          access_mode: ConversationAccessControlMode.Private,
          entries: [{ ...newMember, id: '' }],
        })
      ).rejects.toThrow('Each ACL entry requires a non-empty id');

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('rejects an id longer than the maximum', async () => {
      mockGetDocumentResponse(createConversationDocument());

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
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Public,
        })
      );

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
        esClient: mockRawEsClient as unknown as ElasticsearchClient,
        agentRegistry: agentRegistry as unknown as AgentRegistry,
        user: {
          id: 'admin-user-id',
          username: 'admin-user',
          isAdmin: true,
        },
      });
    });

    it('deletes a public conversation owned by another user', async () => {
      mockGetDocumentResponse(conversationOwnedByAnotherUser(ConversationAccessControlMode.Public));
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
      mockEsClient.delete.mockResolvedValue({ result: 'deleted' });

      await expect(adminClient.delete('conversation-1')).resolves.toBe(true);

      expect(mockEsClient.delete).toHaveBeenCalledWith({ id: 'conversation-1' });
    });

    it('renames a public conversation owned by another user', async () => {
      mockGetDocumentResponse(conversationOwnedByAnotherUser(ConversationAccessControlMode.Public));
      mockEsClient.index.mockResolvedValue({ result: 'updated' });

      const updated = await adminClient.update(
        { id: 'conversation-1', title: 'renamed by admin' },
        { access: 'rename' }
      );

      expect(updated.title).toBe('renamed by admin');
    });

    it('cannot rename or delete a private conversation owned by another user', async () => {
      mockGetDocumentResponse(
        conversationOwnedByAnotherUser(ConversationAccessControlMode.Private)
      );

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
      mockGetDocumentResponse(
        conversationOwnedByAnotherUser(ConversationAccessControlMode.Private)
      );

      await expect(adminClient.get('conversation-1')).rejects.toThrow(
        'Conversation conversation-1 not found'
      );
    });

    it('does not gain owner access to a public conversation owned by another user', async () => {
      mockGetDocumentResponse(conversationOwnedByAnotherUser(ConversationAccessControlMode.Public));

      await expect(
        adminClient.update({ id: 'conversation-1', title: 'renamed by admin' })
      ).rejects.toThrow('Conversation conversation-1 not found');
    });
  });

  describe('events persistence', () => {
    beforeEach(() => {
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
    });

    it('promotes new conversations to events-native on create (schema_version + events written atomically)', async () => {
      mockGetDocumentResponse(createConversationDocument({ schemaVersion: 1 }));

      await client.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [createRound({ id: 'round-1', status: ConversationRoundStatus.completed })],
      });

      const { document: indexed } = mockEsClient.index.mock.calls[0][0] as {
        document: {
          schema_version?: number;
          events?: Array<{ id: string; type: string }>;
          conversation_rounds: Array<{ id: string }>;
        };
      };
      expect(indexed.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
      expect(indexed.events?.map((event) => event.id)).toEqual([
        'round-1::user_message',
        'round-1::execution_started',
        'round-1::execution_terminated',
      ]);
      expect(indexed.conversation_rounds).toHaveLength(1);
      expect(mockEsClient.index).toHaveBeenCalledTimes(1);
    });

    it('round-trips attachment_refs through the stored events projection', async () => {
      const attachmentRefs = [
        { attachment_id: 'attachment-a', version: 1 },
        { attachment_id: 'attachment-b', version: 2 },
      ];

      const written = createConversationDocument({
        schemaVersion: 1,
        rounds: [
          {
            ...createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
            input: { message: 'hi', attachment_refs: attachmentRefs },
          },
        ],
      });
      mockGetDocumentResponse(written);

      const created = await client.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [
          {
            ...createRound({ id: 'round-1', status: ConversationRoundStatus.completed }),
            input: { message: 'hi', attachment_refs: attachmentRefs },
          },
        ],
      });

      const { document: indexed } = mockEsClient.index.mock.calls[0][0] as {
        document: { events?: Array<{ data: { attachment_refs?: unknown[] } }> };
      };
      expect(indexed.events?.[0]?.data.attachment_refs).toEqual(attachmentRefs);

      expect(created.events?.[0]?.data).toMatchObject({ attachment_refs: attachmentRefs });
      expect(created.rounds[0].input.attachment_refs).toEqual(attachmentRefs);
    });

    it('reconciles stored events when a round completes (crash-recovery: in_progress → completed = exactly one terminal)', async () => {
      const inProgressRound = createRound({
        id: 'round-crash',
        status: ConversationRoundStatus.inProgress,
      });
      const stalePartialEvents: TimelineEvent[] = [
        {
          id: 'round-crash::user_message',
          type: TimelineEventType.userMessage,
          created_at: '2025-08-04T07:42:20.789Z',
          actor: { type: EventActorType.user, id: 'user-1', username: 'test-user' },
          data: inProgressRound.input,
        },
        {
          id: 'round-crash::execution_started',
          type: TimelineEventType.executionStarted,
          created_at: '2025-08-04T07:42:20.789Z',
          actor: { type: EventActorType.agent, id: 'agent-1' },
          execution_id: 'round-crash::execution',
          trigger_event_id: 'round-crash::user_message',
          data: { trigger_type: TimelineTriggerType.userMessage },
        },
      ];
      mockGetDocumentResponse(
        createConversationDocument({
          schemaVersion: 1,
          rounds: [inProgressRound],
          events: stalePartialEvents,
        })
      );

      await client.upsertRound({
        id: 'conversation-1',
        round: {
          ...inProgressRound,
          status: ConversationRoundStatus.completed,
          response: { message: 'now finished' },
        },
      });

      const { document: indexed } = mockEsClient.index.mock.calls[0][0] as {
        document: { events?: Array<{ id: string; type: string }> };
      };
      const terminals = indexed.events?.filter(
        (event) => event.type === TimelineEventType.executionTerminated
      );
      expect(terminals).toHaveLength(1);
      expect(terminals?.[0]?.id).toBe('round-crash::execution_terminated');
      expect(indexed.events?.map((event) => event.id)).toEqual([
        'round-crash::user_message',
        'round-crash::execution_started',
        'round-crash::execution_terminated',
      ]);
    });

    // Minimal round-derived timeline events for concurrency tests. The runs are unfinished
    // (no terminal event), matching what step flushes append mid-round.
    const startTimelineEvents = (roundId: string): TimelineEvent[] => [
      {
        id: `${roundId}::user_message`,
        type: TimelineEventType.userMessage,
        created_at: '2025-08-04T07:42:20.789Z',
        actor: { type: EventActorType.user, id: 'user-1', username: 'test-user' },
        data: { message: 'hello' },
      },
      {
        id: `${roundId}::execution_started`,
        type: TimelineEventType.executionStarted,
        created_at: '2025-08-04T07:42:20.789Z',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        execution_id: `${roundId}::execution`,
        trigger_event_id: `${roundId}::user_message`,
        data: { trigger_type: TimelineTriggerType.userMessage },
      },
    ];

    const stepTimelineEvent = (roundId: string, sequence: number): TimelineEvent =>
      ({
        id: `${roundId}::step::${sequence}`,
        type: TimelineEventType.executionStep,
        created_at: '2025-08-04T07:42:20.789Z',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        execution_id: `${roundId}::execution`,
        trigger_event_id: `${roundId}::user_message`,
        data: { step: { type: 'reasoning', reasoning: `step ${sequence}` }, sequence },
      } as TimelineEvent);

    it('merges concurrent appendEvents flushes on OCC conflict so no events are lost and none duplicate', async () => {
      const start = startTimelineEvents('round-1');
      const step0 = stepTimelineEvent('round-1', 0);
      const step1 = stepTimelineEvent('round-1', 1);

      // First OCC read: only the start events are stored.
      mockGetDocumentResponseOnce(createConversationDocument({ schemaVersion: 1, events: start }));
      // Retry read: a concurrent flush won the race and landed step::0 in the meantime.
      mockGetDocumentResponse(
        createConversationDocument({ schemaVersion: 1, seqNo: 2, events: [...start, step0] })
      );
      mockEsClient.index.mockRejectedValueOnce(createConflictError());
      mockEsClient.index.mockResolvedValue({ _seq_no: 3, _primary_term: 1 });

      // This flush carries step::0 (already persisted concurrently) and step::1 (new).
      await client.appendEvents({ id: 'conversation-1', events: [step0, step1] });

      expect(mockEsClient.index).toHaveBeenCalledTimes(2);
      const { document: indexed } = mockEsClient.index.mock.calls[1][0] as {
        document: { events?: Array<{ id: string }> };
      };
      // The concurrent writer's step::0 is kept exactly once, and step::1 is appended.
      expect(indexed.events?.map((event) => event.id)).toEqual([
        'round-1::user_message',
        'round-1::execution_started',
        'round-1::step::0',
        'round-1::step::1',
      ]);
    });

    it('replaceRoundEvents drops every stored event for the round (including stale live-streamed steps) and appends the fresh batch, leaving other rounds and additive events untouched', async () => {
      const storedRound1UserMessage = {
        id: 'round-1::user_message',
        type: TimelineEventType.userMessage,
        created_at: '2025-08-04T07:42:00.000Z',
        actor: { type: EventActorType.user, id: 'user-1', username: 'test-user' },
        data: { message: 'raw input' },
      } as TimelineEvent;
      const storedRound1ExecutionStarted = {
        id: 'round-1::execution_started',
        type: TimelineEventType.executionStarted,
        created_at: '2025-08-04T07:42:01.000Z',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        execution_id: 'round-1::execution',
        trigger_event_id: 'round-1::user_message',
        data: { trigger_type: 'user_message' },
      } as TimelineEvent;
      const storedRound1Step0 = stepTimelineEvent('round-1', 0);
      const storedRound1Step1 = stepTimelineEvent('round-1', 1);
      // Stale live-streamed step that is NOT in the canonical projection — must be dropped.
      const staleRound1Step2 = stepTimelineEvent('round-1', 2);
      const additiveEvent = {
        id: 'additive-error-1',
        type: TimelineEventType.executionTerminated,
        created_at: '2025-08-04T07:42:02.000Z',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        data: {},
      } as TimelineEvent;
      const round2UserMessage = {
        id: 'round-2::user_message',
        type: TimelineEventType.userMessage,
        created_at: '2025-08-04T07:43:00.000Z',
        actor: { type: EventActorType.user, id: 'user-1', username: 'test-user' },
        data: { message: 'round two input' },
      } as TimelineEvent;

      mockGetDocumentResponse(
        createConversationDocument({
          schemaVersion: 1,
          events: [
            storedRound1UserMessage,
            storedRound1ExecutionStarted,
            storedRound1Step0,
            storedRound1Step1,
            staleRound1Step2,
            additiveEvent,
            round2UserMessage,
          ],
        })
      );
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });

      const canonicalUserMessage = {
        ...storedRound1UserMessage,
        data: { message: 'processed input', attachment_refs: [] },
      } as TimelineEvent;
      const canonicalStep0: TimelineEvent = {
        ...storedRound1Step0,
        created_at: 'CANONICAL_TS_0',
      };
      const canonicalStep1: TimelineEvent = {
        ...storedRound1Step1,
        created_at: 'CANONICAL_TS_1',
      };
      const terminated = {
        id: 'round-1::execution_terminated',
        type: TimelineEventType.executionTerminated,
        created_at: '2025-08-04T07:42:10.000Z',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        execution_id: 'round-1::execution',
        trigger_event_id: 'round-1::user_message',
        data: {
          outcome: { type: 'responded', response: { message: 'done' } },
          model_usage: { connector_id: 'c', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
          time_to_first_token: 1,
          time_to_last_token: 2,
        },
      } as TimelineEvent;

      await client.replaceRoundEvents({
        id: 'conversation-1',
        roundId: 'round-1',
        events: [
          canonicalUserMessage,
          storedRound1ExecutionStarted,
          canonicalStep0,
          canonicalStep1,
          terminated,
        ],
      });

      const { document: indexed } = mockEsClient.index.mock.calls[0][0] as {
        document: {
          events?: Array<{ id: string; created_at?: string; data?: { message?: string } }>;
        };
      };
      // Round-1 events replaced wholesale; stale step::2 dropped; additive event and round-2
      // event survive untouched.
      expect(indexed.events?.map((event) => event.id)).toEqual([
        'additive-error-1',
        'round-2::user_message',
        'round-1::user_message',
        'round-1::execution_started',
        'round-1::step::0',
        'round-1::step::1',
        'round-1::execution_terminated',
      ]);
      const replacedUserMessage = indexed.events?.find(
        (event) => event.id === 'round-1::user_message'
      );
      expect(replacedUserMessage?.data?.message).toBe('processed input');
      const replacedStep0 = indexed.events?.find((event) => event.id === 'round-1::step::0');
      expect(replacedStep0?.created_at).toBe('CANONICAL_TS_0');
    });

    it('leaves legacy conversations rounds-only on update (no events / no schema_version written)', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          rounds: [createRound({ id: 'round-1', status: ConversationRoundStatus.completed })],
        })
      );

      await client.update({ id: 'conversation-1', title: 'Renamed' }, { access: 'rename' });

      const { document: indexed } = mockEsClient.index.mock.calls[0][0] as {
        document: {
          title: string;
          schema_version?: number;
          events?: unknown[];
        };
      };
      expect(indexed.title).toBe('Renamed');
      expect(indexed.schema_version).toBeUndefined();
      expect(indexed.events).toBeUndefined();
    });

    it('keeps events-native docs events-native on update (re-stamps schema_version, regenerates events)', async () => {
      const existingRound = createRound({
        id: 'round-1',
        status: ConversationRoundStatus.completed,
      });
      const storedEvents: TimelineEvent[] = [
        {
          id: 'round-1::user_message',
          type: TimelineEventType.userMessage,
          created_at: existingRound.started_at,
          actor: { type: EventActorType.user, id: 'user-1', username: 'test-user' },
          data: existingRound.input,
        },
      ];
      mockGetDocumentResponse(
        createConversationDocument({
          schemaVersion: 1,
          rounds: [existingRound],
          events: storedEvents,
        })
      );

      await client.update({ id: 'conversation-1', title: 'Renamed' }, { access: 'rename' });

      const { document: indexed } = mockEsClient.index.mock.calls[0][0] as {
        document: {
          schema_version?: number;
          events?: Array<{ id: string; type: string }>;
        };
      };
      expect(indexed.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
      expect(indexed.events?.map((event) => event.id)).toEqual([
        'round-1::user_message',
        'round-1::execution_started',
        'round-1::execution_terminated',
      ]);
    });
  });
});
