/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { nodeBuilder } from '@kbn/es-query';
import { z } from '@kbn/zod/v4';
import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationParentRelation,
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
  ConversationSearchOptions,
  ConversationParentLink,
  ConversationTemplate,
  SerializedMetadataValue,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import type { AgentRegistry } from '../../agents/agent_registry';
import { CONVERSATION_BULK_GET_MAX_IDS } from '../../../../common/constants';
import { createRound } from '../../../test_utils';
import { buildPinnedFilter } from '../access_control/query';
import { createClient, type ConversationClient } from './client';
import type { Document } from './converters';
import type { ConversationEventsServiceStart } from '../../conversation_events';

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

const mockConversationEvents: ConversationEventsServiceStart = {
  getDefinition: jest.fn(),
  list: jest.fn().mockReturnValue([]),
};

jest.mock('./storage', () => ({
  createStorage: jest.fn(() => ({
    getClient: jest.fn(() => mockEsClient),
  })),
  conversationIndexName: '.kibana_agent_builder_conversations',
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
    parentConversation,
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
    parentConversation?: ConversationParentLink;
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
        ...(parentConversation ? { parent_conversation: parentConversation } : {}),
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

  const mockGetReturnsIndexedDocument = () => {
    mockRawEsClient.get.mockImplementation(async ({ id }: { id: string }) => {
      const { calls, results } = mockEsClient.index.mock;
      let callIndex = -1;
      for (let i = calls.length - 1; i >= 0; i--) {
        if (calls[i][0].id === id) {
          callIndex = i;
          break;
        }
      }
      if (callIndex === -1) {
        throw Object.assign(new Error('not found'), { meta: { statusCode: 404 } });
      }

      const { document } = calls[callIndex][0] as { document: Document['_source'] };
      const indexed = (await results[callIndex].value) as {
        _seq_no?: number;
        _primary_term?: number;
      };

      return {
        _id: id,
        _index: TEST_CONVERSATION_INDEX,
        _source: document,
        _seq_no: indexed._seq_no,
        _primary_term: indexed._primary_term,
        found: true,
      };
    });
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
    // `clearAllMocks` only clears call history — queued `mockResolvedValueOnce` /
    // `mockRejectedValueOnce` implementations survive it. Reset the ES client mocks fully so a
    // once-queued 409 left behind by a conflict test cannot leak into the next test (#289049).
    mockRawEsClient.get.mockReset();
    mockEsClient.search.mockReset();
    mockEsClient.delete.mockReset();
    mockEsClient.index.mockReset();
    // Default OCC-style index response; describes that need something else override it.
    mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });

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
      conversationEvents: mockConversationEvents,
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

  describe('search', () => {
    it('sends a match_bool_prefix on title as a must clause', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.search({ query: 'sales rep' });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: expect.arrayContaining([
                {
                  bool: {
                    should: [
                      { match_bool_prefix: { title: { query: 'sales rep', operator: 'and' } } },
                      {
                        prefix: {
                          'title.keyword': { value: 'sales rep', boost: 2, case_insensitive: true },
                        },
                      },
                      {
                        prefix: {
                          'title.keyword': {
                            value: 'sales rep ',
                            boost: 5,
                            case_insensitive: true,
                          },
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

    it('omits the must clause for a whitespace-only query', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.search({ query: '   ' });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({ must: [] }),
          }),
        })
      );
    });

    it('shares the same space, read-access, and sub-agent filters as list', async () => {
      agentRegistry.getIds.mockResolvedValue(['agent-1', 'agent-2']);
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.list();
      const listFilter = mockEsClient.search.mock.calls[0][0].query.bool.filter;

      mockEsClient.search.mockClear();
      await client.search({ query: 'anything' });
      const searchFilter = mockEsClient.search.mock.calls[0][0].query.bool.filter;

      expect(searchFilter).toEqual(listFilter);
    });

    it('never sends a pinned filter', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.search({ query: 'anything' });

      const filterArray: unknown[] = mockEsClient.search.mock.calls[0][0].query.bool.filter;
      expect(filterArray).not.toContainEqual({ term: { pinned: true } });
      expect(filterArray).not.toContainEqual({ bool: { must_not: { term: { pinned: true } } } });
    });

    it('sorts by _score, then updated_at, then created_at, all descending', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.search({ query: 'anything' });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [
            { _score: { order: 'desc' } },
            { updated_at: { order: 'desc' } },
            { created_at: { order: 'desc' } },
          ],
        })
      );
    });

    it('sends from=0, size=50, and track_total_hits=10000 by default', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      await client.search({ query: 'anything' });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 0,
          size: 50,
          track_total_hits: 10_000,
          seq_no_primary_term: true,
        })
      );
    });

    it('computes from = (page - 1) * perPage', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      await client.search({ query: 'anything', page: 3, perPage: 10 });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ from: 20, size: 10 })
      );
    });

    it('returns total when hits.total is a plain number', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [], total: 7 } });

      const result = await client.search({ query: 'anything' });

      expect(result.total).toBe(7);
    });

    it('returns total from hits.total.value when ES returns the object form', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 42, relation: 'eq' } },
      });

      const result = await client.search({ query: 'anything' });

      expect(result.total).toBe(42);
    });

    it('caps total at 10000 when ES reports more via track_total_hits', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 99_999, relation: 'gte' } },
      });

      const result = await client.search({ query: 'anything' });

      expect(result.total).toBe(10_000);
    });

    it('returns an empty result without querying conversations when the requested agent is inaccessible', async () => {
      agentRegistry.getIds.mockResolvedValue(['agent-1']);

      await expect(client.search({ query: 'anything', agentId: 'agent-2' })).resolves.toEqual({
        results: [],
        total: 0,
      });

      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('returns an empty result when the user cannot access any underlying agents', async () => {
      agentRegistry.getIds.mockResolvedValue([]);

      await expect(client.search({ query: 'anything' })).resolves.toEqual({
        results: [],
        total: 0,
      });

      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('maps hits to conversations with permissions, and no rounds or read_by', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument()], total: { value: 1, relation: 'eq' } },
      });

      const { results } = await client.search({ query: 'anything' });

      expectNoReadByInList(results);
      expectOwnerPermissionsInList(results);
      expectNoRoundsInList(results);
    });

    // --- filter ---

    const searchFilterClauses = async (options: ConversationSearchOptions): Promise<unknown[]> => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.search(options);

      return mockEsClient.search.mock.calls[0][0].query.bool.filter;
    };

    it('appends the compiled filter to the access filters', async () => {
      const withoutFilter = await searchFilterClauses({ query: 'anything' });

      mockEsClient.search.mockClear();
      const withFilter = await searchFilterClauses({
        query: 'anything',
        filter: 'attachment_type: alert',
      });

      expect(withFilter).toEqual([
        ...withoutFilter,
        {
          bool: {
            should: [{ term: { 'attachments.type': { value: 'alert' } } }],
            minimum_should_match: 1,
          },
        },
      ]);
    });

    it('accepts a pre-built filter AST as well as a KQL string', async () => {
      const fromString = await searchFilterClauses({ filter: 'attachment_type: alert' });

      mockEsClient.search.mockClear();
      const fromNode = await searchFilterClauses({
        filter: nodeBuilder.is('attachment_type', 'alert'),
      });

      expect(fromNode).toEqual(fromString);
    });

    it('searches by filter alone, with no query', async () => {
      const filterClauses = await searchFilterClauses({ filter: 'status: completed' });

      expect(filterClauses).toContainEqual({
        bool: {
          should: [{ term: { status: { value: 'completed' } } }],
          minimum_should_match: 1,
        },
      });
      expect(mockEsClient.search.mock.calls[0][0].query.bool.must).toEqual([]);
    });

    it('sorts by the requested field alone when no query narrows relevance', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.search({ filter: 'status: completed' });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ updated_at: { order: 'desc' } }, { created_at: { order: 'desc' } }],
        })
      );
    });

    it('applies an explicit sort instead of relevance when a query is present', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.search({ query: 'anything', sort: { field: 'created_at', order: 'asc' } });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ created_at: { order: 'asc' } }],
        })
      );
    });

    it('rejects an invalid filter before touching Elasticsearch', async () => {
      await expect(client.search({ filter: 'space: default' })).rejects.toThrow(
        /Invalid filter field "space"/
      );

      expect(agentRegistry.getIds).not.toHaveBeenCalled();
      expect(mockEsClient.search).not.toHaveBeenCalled();
    });
  });

  describe('bulkGet', () => {
    it('keys results by conversation id, independently of the order hits come back in', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({ id: 'conversation-2', title: 'Second' }),
            createConversationDocument({ id: 'conversation-1', title: 'First' }),
          ],
        },
      });

      const result = await client.bulkGet(['conversation-1', 'conversation-2']);

      expect(result.size).toBe(2);
      expect(result.get('conversation-1')?.title).toBe('First');
      expect(result.get('conversation-2')?.title).toBe('Second');
    });

    it('sends a single ids clause alongside the shared access filters', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.bulkGet(['conversation-1', 'conversation-2']);

      const { query } = mockEsClient.search.mock.calls[0][0];
      expect(query.bool.filter).toContainEqual({
        ids: { values: ['conversation-1', 'conversation-2'] },
      });
      // Space scoping and read access still apply, on top of the ids clause.
      expect(query.bool.filter).toHaveLength(3);
    });

    it('resolves sub-agent conversations, unlike the list surfaces', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.bulkGet(['conversation-1']);

      const { query } = mockEsClient.search.mock.calls[0][0];
      expect(query.bool.filter).not.toContainEqual({
        bool: { must_not: [{ exists: { field: 'parent_conversation' } }] },
      });
    });

    it('returns the parent link so callers can tell sub-agent conversations apart', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({ id: 'conversation-parent' }),
            createConversationDocument({
              id: 'conversation-child',
              parentConversation: {
                id: 'conversation-parent',
                relation: ConversationParentRelation.subagent,
              },
            }),
          ],
        },
      });

      const result = await client.bulkGet(['conversation-parent', 'conversation-child']);

      expect(mockEsClient.search.mock.calls[0][0]._source).toContain('parent_conversation');
      expect(result.get('conversation-child')?.parent_conversation).toEqual({
        id: 'conversation-parent',
        relation: ConversationParentRelation.subagent,
      });
      expect(result.get('conversation-parent')?.parent_conversation).toBeUndefined();
    });

    it('sizes the query to the id count and does not track totals', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.bulkGet(['conversation-1', 'conversation-2', 'conversation-3']);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ size: 3, track_total_hits: false })
      );
      expect(mockEsClient.search.mock.calls[0][0]).not.toHaveProperty('from');
    });

    it('omits ids that did not resolve rather than erroring', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createConversationDocument({ id: 'conversation-1' })] },
      });

      const result = await client.bulkGet(['conversation-1', 'missing']);

      expect(result.size).toBe(1);
      expect(result.has('missing')).toBe(false);
    });

    it('returns an empty map for an empty id array without querying Elasticsearch', async () => {
      await expect(client.bulkGet([])).resolves.toEqual(new Map());

      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('returns an empty map when the user cannot access any underlying agents', async () => {
      agentRegistry.getIds.mockResolvedValue([]);

      await expect(client.bulkGet(['conversation-1'])).resolves.toEqual(new Map());

      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('rejects more ids than the maximum before touching Elasticsearch', async () => {
      const ids = Array.from(
        { length: CONVERSATION_BULK_GET_MAX_IDS + 1 },
        (_, index) => `conversation-${index}`
      );

      await expect(client.bulkGet(ids)).rejects.toThrow(/Too many conversation ids/);

      expect(agentRegistry.getIds).not.toHaveBeenCalled();
      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('returns rounds-less rows carrying active attachment summaries', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createConversationDocument({
              id: 'conversation-1',
              attachments: [
                { id: 'att-1', type: 'text', versions: [], current_version: 1 },
                { id: 'att-2', type: 'esql', versions: [], current_version: 1, active: false },
              ],
            }),
          ],
        },
      });

      const result = await client.bulkGet(['conversation-1']);
      const conversation = result.get('conversation-1');

      expectNoRoundsInList([conversation]);
      expect(conversation?.attachments).toEqual([{ id: 'att-1', type: 'text' }]);
    });

    it('requests attachment identity without version content in _source', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.bulkGet(['conversation-1']);

      const { _source: sourceFields } = mockEsClient.search.mock.calls[0][0];
      expect(sourceFields).toEqual(
        expect.arrayContaining(['attachments.id', 'attachments.type', 'attachments.active'])
      );
      expect(sourceFields).not.toContain('attachments');
      expect(sourceFields).not.toContain('conversation_rounds');
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
        conversationEvents: mockConversationEvents,
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
      mockEsClient.index.mockResolvedValue({ result: 'created', _seq_no: 0, _primary_term: 1 });
      mockGetReturnsIndexedDocument();
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

    it('forces an immediate refresh instead of waiting for the scheduled one', async () => {
      await client.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [],
      });

      expect(mockEsClient.index).toHaveBeenCalledWith(expect.objectContaining({ refresh: true }));
    });

    it('reads the created conversation back by id through the converse access gate', async () => {
      const result = await client.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [],
      });

      // The response is built from a read-after-write, not from the request payload, so it goes
      // through the same raw `get` and agent `use` check as `client.get`.
      expect(mockRawEsClient.get).toHaveBeenCalledWith({
        index: TEST_CONVERSATION_INDEX,
        id: 'conversation-1',
      });
      expect(agentRegistry.get).toHaveBeenCalledWith('agent-1', { access: 'use' });
      expect(result).toMatchObject({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        user: { id: 'user-1', username: 'test-user' },
        rounds: [],
        events: [],
        schema_version: CONVERSATION_SCHEMA_VERSION,
        read: false,
        pinned: false,
        read_only: false,
      });
      expect(result.created_at).toBe(result.updated_at);
      expectOwnerPermissions(result);
      expectNoReadBy(result);
    });

    it('returns the same shape as get for the created conversation', async () => {
      const created = await client.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [],
      });

      const { document: indexedDoc } = mockEsClient.index.mock.calls[0][0] as {
        document: Document['_source'];
      };
      mockGetDocumentResponse({
        _id: 'conversation-1',
        _seq_no: 0,
        _primary_term: 1,
        _source: indexedDoc,
      });

      await expect(client.get('conversation-1')).resolves.toEqual(created);
    });

    it('fails when the index response carries no version metadata', async () => {
      mockEsClient.index.mockResolvedValueOnce({ result: 'created' });

      await expect(
        client.create({
          id: 'conversation-1',
          title: 'Conversation 1',
          agent_id: 'agent-1',
          rounds: [],
        })
      ).rejects.toThrow('Conversation conversation-1 was indexed without version metadata');
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
        conversationEvents: mockConversationEvents,
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
        conversationEvents: mockConversationEvents,
        user: { username: 'no-profile-user', isAdmin: false },
      });

      const result = await client.setPinned('conversation-1', true);

      expectNoReadBy(result);
      const { document } = mockEsClient.index.mock.calls[0][0];
      expect(document.pinned_by).toEqual([]);
      expect(result.pinned).toBe(false);
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

    it('default (owner) denies a non-owner on a public conversation', async () => {
      getTemplateMock.mockReturnValue(makeTemplate('tmpl-a', { x: { input_type: 'TEXT' } }));
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user',
          username: 'other',
          accessMode: ConversationAccessControlMode.Public,
        })
      );

      await expect(client.patchMetadata('conversation-1', { x: 'value' })).rejects.toMatchObject({
        message: expect.stringContaining('conversation-1'),
      });
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('explicit { access: converse } allows a non-owner on a public conversation', async () => {
      const template = makeTemplate('tmpl-a', { x: { input_type: 'TEXT' } });
      getTemplateMock.mockReturnValue(template);
      // The document must carry a template_id so patchMetadata can resolve the template.
      const doc = createConversationDocumentWithTemplate({
        templateId: 'tmpl-a',
        // Override user and access_mode to simulate a public conversation owned by someone else.
      });
      // Patch the access_control to be Public and userId to be a different user.
      const publicOtherDoc = {
        ...doc,
        _source: {
          ...doc._source,
          user_id: 'other-user',
          user_name: 'other',
          access_control: { access_mode: ConversationAccessControlMode.Public },
        },
      };
      mockGetDocumentResponse(publicOtherDoc as Document);
      mockEsClient.index.mockResolvedValue({ _seq_no: 3, _primary_term: 1 });
      mockGetDocumentResponseOnce(publicOtherDoc as Document);

      const { changedFields } = await client.patchMetadata(
        'conversation-1',
        { x: 'value' },
        { access: 'converse' }
      );
      expect(changedFields).toEqual(['x']);
      expect(mockEsClient.index).toHaveBeenCalledTimes(1);
    });

    describe('emitMetadataPatched via event emitter', () => {
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

      const buildEventEmitter = () => ({
        emitMetadataPatched: jest.fn(),
        emitAttachmentEvents: jest.fn(),
      });

      it('emits emitMetadataPatched with changed fields after a successful write', async () => {
        const eventEmitter = buildEventEmitter();
        const clientWithCb = createClient({
          space: testSpace,
          logger: loggerMock.create(),
          esClient: mockRawEsClient as unknown as ElasticsearchClient,
          agentRegistry: agentRegistry as unknown as AgentRegistry,
          conversationEvents: mockConversationEvents,
          user: { id: 'user-1', username: 'test-user', isAdmin: false },
          eventEmitter,
        });

        mockGetDocumentResponse(
          createConversationDocumentWithTemplate({
            templateId: template.id,
            metadata: { status: 'open' },
          })
        );

        await clientWithCb.patchMetadata('conversation-1', { severity: 'high' });

        expect(eventEmitter.emitMetadataPatched).toHaveBeenCalledWith({
          conversationId: 'conversation-1',
          templateId: template.id,
          parentId: undefined,
          changedFields: ['severity'],
        });
      });

      it('includes parentId when the conversation has a parent_conversation', async () => {
        const eventEmitter = buildEventEmitter();
        const clientWithCb = createClient({
          space: testSpace,
          logger: loggerMock.create(),
          esClient: mockRawEsClient as unknown as ElasticsearchClient,
          agentRegistry: agentRegistry as unknown as AgentRegistry,
          conversationEvents: mockConversationEvents,
          user: { id: 'user-1', username: 'test-user', isAdmin: false },
          eventEmitter,
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

        expect(eventEmitter.emitMetadataPatched).toHaveBeenCalledWith(
          expect.objectContaining({ parentId: 'parent-conv-1' })
        );
      });

      it('does not emit when all values are identical (no-op suppression)', async () => {
        const eventEmitter = buildEventEmitter();
        const clientWithCb = createClient({
          space: testSpace,
          logger: loggerMock.create(),
          esClient: mockRawEsClient as unknown as ElasticsearchClient,
          agentRegistry: agentRegistry as unknown as AgentRegistry,
          conversationEvents: mockConversationEvents,
          user: { id: 'user-1', username: 'test-user', isAdmin: false },
          eventEmitter,
        });

        mockGetDocumentResponse(
          createConversationDocumentWithTemplate({
            templateId: template.id,
            // status is already 'open' — writing the same value is a no-op
            metadata: { status: 'open' },
          })
        );

        await clientWithCb.patchMetadata('conversation-1', { status: 'open' });

        expect(eventEmitter.emitMetadataPatched).not.toHaveBeenCalled();
      });

      it('does not emit when the write fails', async () => {
        const eventEmitter = buildEventEmitter();
        const clientWithCb = createClient({
          space: testSpace,
          logger: loggerMock.create(),
          esClient: mockRawEsClient as unknown as ElasticsearchClient,
          agentRegistry: agentRegistry as unknown as AgentRegistry,
          conversationEvents: mockConversationEvents,
          user: { id: 'user-1', username: 'test-user', isAdmin: false },
          eventEmitter,
        });

        mockGetDocumentResponse(
          createConversationDocumentWithTemplate({ templateId: template.id })
        );
        mockEsClient.index.mockRejectedValue(new Error('disk full'));

        await expect(
          clientWithCb.patchMetadata('conversation-1', { severity: 'high' })
        ).rejects.toThrow('disk full');

        expect(eventEmitter.emitMetadataPatched).not.toHaveBeenCalled();
      });
    });
  });

  describe('create with template', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockEsClient.index.mockResolvedValue({ result: 'created', _seq_no: 0, _primary_term: 1 });
      mockGetReturnsIndexedDocument();
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

  describe('addAccessControlEntries', () => {
    beforeEach(() => {
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
      jest.useFakeTimers().setSystemTime(new Date('2026-08-11T10:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('adds new entries on a private conversation, stamping added_at', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          accessMode: ConversationAccessControlMode.Private,
          entries: [],
        })
      );

      await client.addAccessControlEntries('conversation-1', [
        { type: 'user', id: 'user-2', role: ConversationAccessControlRole.Member },
      ]);

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            access_control: {
              access_mode: ConversationAccessControlMode.Private,
              entries: [
                {
                  type: 'user',
                  id: 'user-2',
                  role: ConversationAccessControlRole.Member,
                  added_at: '2026-08-11T10:00:00.000Z',
                },
              ],
            },
          }),
        })
      );
    });

    it("writes the role from the caller's entry, not a hardcoded Member", async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          accessMode: ConversationAccessControlMode.Private,
          entries: [],
        })
      );

      // Add with the only currently valid role — but the role comes from the caller, not hardcoded
      await client.addAccessControlEntries('conversation-1', [
        { type: 'user', id: 'user-2', role: ConversationAccessControlRole.Member },
      ]);

      const { access_control } = mockEsClient.index.mock.calls[0][0].document;
      expect(access_control.entries[0].role).toBe(ConversationAccessControlRole.Member);
    });

    it('is a no-op for a public conversation — does not index and returns the existing conversation', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          accessMode: ConversationAccessControlMode.Public,
          entries: [],
        })
      );

      await client.addAccessControlEntries('conversation-1', [
        { type: 'user', id: 'user-2', role: ConversationAccessControlRole.Member },
      ]);

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('is a no-op when every principal is already a member', async () => {
      const existing: ConversationAccessControlEntry = {
        type: 'user',
        id: 'user-2',
        role: ConversationAccessControlRole.Member,
        added_at: '2025-01-01T00:00:00.000Z',
      };
      mockGetDocumentResponse(createConversationDocument({ entries: [existing] }));

      await client.addAccessControlEntries('conversation-1', [
        { type: 'user', id: 'user-2', role: ConversationAccessControlRole.Member },
      ]);

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('leaves an existing entry unchanged even when a different role is requested, and skips the write when nothing new remains', async () => {
      const existing: ConversationAccessControlEntry = {
        type: 'user',
        id: 'user-2',
        role: ConversationAccessControlRole.Member,
        added_at: '2025-01-01T00:00:00.000Z',
      };
      mockGetDocumentResponse(createConversationDocument({ entries: [existing] }));

      // Request the same principal again — entry already exists, so skip the write regardless of role
      await client.addAccessControlEntries('conversation-1', [
        { type: 'user', id: 'user-2', role: ConversationAccessControlRole.Member },
      ]);

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('deduplicates principals within the request — same principal twice becomes one entry', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          accessMode: ConversationAccessControlMode.Private,
          entries: [],
        })
      );

      await client.addAccessControlEntries('conversation-1', [
        { type: 'user', id: 'user-2', role: ConversationAccessControlRole.Member },
        { type: 'user', id: 'user-2', role: ConversationAccessControlRole.Member },
      ]);

      const { access_control } = mockEsClient.index.mock.calls[0][0].document;
      expect(access_control.entries).toHaveLength(1);
      expect(access_control.entries[0].id).toBe('user-2');
    });

    it('preserves added_at for principals that are already members when new ones are also given', async () => {
      const existing: ConversationAccessControlEntry = {
        type: 'user',
        id: 'user-2',
        role: ConversationAccessControlRole.Member,
        added_at: '2025-01-01T00:00:00.000Z',
      };
      mockGetDocumentResponse(createConversationDocument({ entries: [existing] }));

      await client.addAccessControlEntries('conversation-1', [
        { type: 'user', id: 'user-2', role: ConversationAccessControlRole.Member },
        { type: 'user', id: 'user-3', role: ConversationAccessControlRole.Member },
      ]);

      const { access_control } = mockEsClient.index.mock.calls[0][0].document;
      const entry2 = access_control.entries.find(
        (e: ConversationAccessControlEntry) => e.id === 'user-2'
      );
      const entry3 = access_control.entries.find(
        (e: ConversationAccessControlEntry) => e.id === 'user-3'
      );
      // user-2 was already a member — original added_at is kept
      expect(entry2.added_at).toBe('2025-01-01T00:00:00.000Z');
      // user-3 is new — added_at is stamped now
      expect(entry3.added_at).toBe('2026-08-11T10:00:00.000Z');
    });

    it('silently skips the owner entry — adding the owner to entries would be inert', async () => {
      mockGetDocumentResponse(createConversationDocument({ userId: 'user-1', entries: [] }));

      await client.addAccessControlEntries('conversation-1', [
        { type: 'user', id: 'user-1', role: ConversationAccessControlRole.Member },
      ]);

      // no-op because the only entry is the owner
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('rejects when total entries (existing + new) would exceed CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES', async () => {
      const existing: ConversationAccessControlEntry[] = Array.from(
        { length: CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES },
        (_, i) => ({
          type: 'user',
          id: `existing-user-${i}`,
          role: ConversationAccessControlRole.Member,
          added_at: '2025-01-01T00:00:00.000Z',
        })
      );
      mockGetDocumentResponse(createConversationDocument({ entries: existing }));

      await expect(
        client.addAccessControlEntries('conversation-1', [
          { type: 'user', id: 'new-user-1', role: ConversationAccessControlRole.Member },
        ])
      ).rejects.toThrow(`ACL entries exceed maximum of ${CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES}`);
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('masks non-members (converse access) as not found on a private conversation', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Private,
          entries: [],
        })
      );

      await expect(
        client.addAccessControlEntries('conversation-1', [
          { type: 'user', id: 'user-2', role: ConversationAccessControlRole.Member },
        ])
      ).rejects.toThrow('Conversation conversation-1 not found');
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('allows a member (non-owner) to add new members using default converse access', async () => {
      const existingMember: ConversationAccessControlEntry = {
        type: 'user',
        id: 'user-1', // this is the test client's user
        role: ConversationAccessControlRole.Member,
        added_at: '2025-01-01T00:00:00.000Z',
      };
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'owner-user-id',
          username: 'owner-user',
          entries: [existingMember],
        })
      );

      await client.addAccessControlEntries('conversation-1', [
        { type: 'user', id: 'user-3', role: ConversationAccessControlRole.Member },
      ]);

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            access_control: expect.objectContaining({
              entries: expect.arrayContaining([expect.objectContaining({ id: 'user-3' })]),
            }),
          }),
        })
      );
    });
  });

  describe('removeAccessControlEntries', () => {
    beforeEach(() => {
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
      jest.useFakeTimers().setSystemTime(new Date('2026-08-11T10:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('removes the given principal and keeps others with their original added_at', async () => {
      const keep: ConversationAccessControlEntry = {
        type: 'user',
        id: 'user-2',
        role: ConversationAccessControlRole.Member,
        added_at: '2025-01-01T00:00:00.000Z',
      };
      const toRemove: ConversationAccessControlEntry = {
        type: 'user',
        id: 'user-3',
        role: ConversationAccessControlRole.Member,
        added_at: '2025-06-01T00:00:00.000Z',
      };
      mockGetDocumentResponse(createConversationDocument({ entries: [keep, toRemove] }));

      await client.removeAccessControlEntries('conversation-1', [{ type: 'user', id: 'user-3' }]);

      const { access_control } = mockEsClient.index.mock.calls[0][0].document;
      expect(access_control.entries).toHaveLength(1);
      expect(access_control.entries[0].id).toBe('user-2');
      expect(access_control.entries[0].added_at).toBe('2025-01-01T00:00:00.000Z');
    });

    it('is a no-op for a public conversation — does not index', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          accessMode: ConversationAccessControlMode.Public,
          entries: [],
        })
      );

      await client.removeAccessControlEntries('conversation-1', [{ type: 'user', id: 'user-2' }]);

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('is a no-op when none of the requested principals are members', async () => {
      const existing: ConversationAccessControlEntry = {
        type: 'user',
        id: 'user-2',
        role: ConversationAccessControlRole.Member,
        added_at: '2025-01-01T00:00:00.000Z',
      };
      mockGetDocumentResponse(createConversationDocument({ entries: [existing] }));

      await client.removeAccessControlEntries('conversation-1', [{ type: 'user', id: 'user-99' }]);

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('ignores the owner principal — owner cannot appear in entries', async () => {
      const member: ConversationAccessControlEntry = {
        type: 'user',
        id: 'user-2',
        role: ConversationAccessControlRole.Member,
        added_at: '2025-01-01T00:00:00.000Z',
      };
      // The document is owned by 'user-1' (default in createConversationDocument)
      mockGetDocumentResponse(createConversationDocument({ userId: 'user-1', entries: [member] }));

      // Trying to remove the owner — no entries match, so it's a no-op
      await client.removeAccessControlEntries('conversation-1', [{ type: 'user', id: 'user-1' }]);

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('keeps access_mode as Private when the last entry is removed', async () => {
      const entry: ConversationAccessControlEntry = {
        type: 'user',
        id: 'user-2',
        role: ConversationAccessControlRole.Member,
        added_at: '2025-01-01T00:00:00.000Z',
      };
      mockGetDocumentResponse(createConversationDocument({ entries: [entry] }));

      await client.removeAccessControlEntries('conversation-1', [{ type: 'user', id: 'user-2' }]);

      const { access_control } = mockEsClient.index.mock.calls[0][0].document;
      expect(access_control.access_mode).toBe(ConversationAccessControlMode.Private);
      expect(access_control.entries).toHaveLength(0);
    });

    it('masks non-members (converse access) as not found on a private conversation', async () => {
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'other-user-id',
          username: 'other-user',
          accessMode: ConversationAccessControlMode.Private,
          entries: [],
        })
      );

      await expect(
        client.removeAccessControlEntries('conversation-1', [{ type: 'user', id: 'user-2' }])
      ).rejects.toThrow('Conversation conversation-1 not found');
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });

    it('allows a member (non-owner) to remove other members using default converse access', async () => {
      const caller: ConversationAccessControlEntry = {
        type: 'user',
        id: 'user-1', // test client's user
        role: ConversationAccessControlRole.Member,
        added_at: '2025-01-01T00:00:00.000Z',
      };
      const target: ConversationAccessControlEntry = {
        type: 'user',
        id: 'user-3',
        role: ConversationAccessControlRole.Member,
        added_at: '2025-01-01T00:00:00.000Z',
      };
      mockGetDocumentResponse(
        createConversationDocument({
          userId: 'owner-user-id',
          username: 'owner-user',
          entries: [caller, target],
        })
      );

      await client.removeAccessControlEntries('conversation-1', [{ type: 'user', id: 'user-3' }]);

      const { access_control } = mockEsClient.index.mock.calls[0][0].document;
      expect(access_control.entries.map((e: ConversationAccessControlEntry) => e.id)).toEqual([
        'user-1',
      ]);
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
        conversationEvents: mockConversationEvents,
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

  describe('emitAttachmentEvents callback', () => {
    const attachmentAddedEvent = (id: string): TimelineEvent =>
      ({
        id,
        type: TimelineEventType.attachmentAdded,
        created_at: '2026-09-16T10:00:00.000Z',
        actor: { type: EventActorType.system, id: 'system' },
        data: {
          attachment_id: 'att-1',
          attachment_type: 'text',
          current_version: 1,
          render_inline: false,
          source: 'http_api',
        },
      } as TimelineEvent);

    const userMessageEvent = (id: string): TimelineEvent => ({
      id,
      type: TimelineEventType.userMessage,
      created_at: '2026-09-16T10:00:00.000Z',
      actor: { type: EventActorType.user, id: 'user-1', username: 'test-user' },
      data: { message: 'hello' },
    });

    let emitAttachmentEvents: jest.Mock;
    let clientWithCb: ConversationClient;

    beforeEach(() => {
      emitAttachmentEvents = jest.fn();
      clientWithCb = createClient({
        space: testSpace,
        logger: loggerMock.create(),
        esClient: mockRawEsClient as unknown as ElasticsearchClient,
        agentRegistry: agentRegistry as unknown as AgentRegistry,
        user: { id: 'user-1', username: 'test-user', isAdmin: false },
        conversationEvents: mockConversationEvents,
        eventEmitter: { emitMetadataPatched: jest.fn(), emitAttachmentEvents },
      });
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
    });

    it('appendEvents fires with only the attachment events after the write', async () => {
      mockGetDocumentResponse(createConversationDocument({ schemaVersion: 1, events: [] }));
      const added = attachmentAddedEvent('evt-att-1');

      await clientWithCb.appendEvents({
        id: 'conversation-1',
        events: [userMessageEvent('r1::user_message'), added],
      });

      expect(mockEsClient.index).toHaveBeenCalledTimes(1);
      expect(emitAttachmentEvents).toHaveBeenCalledTimes(1);
      expect(emitAttachmentEvents).toHaveBeenCalledWith({
        conversationId: 'conversation-1',
        events: [added],
      });
    });

    it('appendEvents does not fire for an event id that was already stored (dedup)', async () => {
      const added = attachmentAddedEvent('evt-att-1');
      mockGetDocumentResponse(createConversationDocument({ schemaVersion: 1, events: [added] }));

      await clientWithCb.appendEvents({ id: 'conversation-1', events: [added] });

      expect(emitAttachmentEvents).not.toHaveBeenCalled();
    });

    it('appendEvents does not fire when there are no attachment events', async () => {
      mockGetDocumentResponse(createConversationDocument({ schemaVersion: 1, events: [] }));

      await clientWithCb.appendEvents({
        id: 'conversation-1',
        events: [userMessageEvent('r1::user_message')],
      });

      expect(emitAttachmentEvents).not.toHaveBeenCalled();
    });

    it('replaceRoundEvents fires with the attachment events of the new batch', async () => {
      mockGetDocumentResponse(createConversationDocument({ schemaVersion: 1, events: [] }));
      const added = attachmentAddedEvent('evt-att-2');

      await clientWithCb.replaceRoundEvents({
        id: 'conversation-1',
        roundId: 'r1',
        events: [userMessageEvent('r1::user_message'), added],
      });

      expect(emitAttachmentEvents).toHaveBeenCalledWith({
        conversationId: 'conversation-1',
        events: [added],
      });
    });

    it('create fires with the attachment events of the initial batch', async () => {
      mockEsClient.index.mockResolvedValue({ result: 'created', _seq_no: 0, _primary_term: 1 });
      mockGetReturnsIndexedDocument();
      const added = attachmentAddedEvent('evt-att-3');

      await clientWithCb.create({
        id: 'conversation-1',
        title: 'Conversation 1',
        agent_id: 'agent-1',
        rounds: [],
        events: [userMessageEvent('r1::user_message'), added],
      });

      expect(emitAttachmentEvents).toHaveBeenCalledWith({
        conversationId: 'conversation-1',
        events: [added],
      });
    });

    it('update never fires', async () => {
      mockGetDocumentResponse(createConversationDocument({ schemaVersion: 1, events: [] }));

      await clientWithCb.update({ id: 'conversation-1', title: 'renamed' });

      expect(emitAttachmentEvents).not.toHaveBeenCalled();
    });

    it('does not fire when the write fails', async () => {
      mockGetDocumentResponse(createConversationDocument({ schemaVersion: 1, events: [] }));
      mockEsClient.index.mockRejectedValue(new Error('disk full'));

      await expect(
        clientWithCb.appendEvents({
          id: 'conversation-1',
          events: [attachmentAddedEvent('evt-att-4')],
        })
      ).rejects.toThrow('disk full');

      expect(emitAttachmentEvents).not.toHaveBeenCalled();
    });

    it('a throwing callback does not fail the write', async () => {
      mockGetDocumentResponse(createConversationDocument({ schemaVersion: 1, events: [] }));
      emitAttachmentEvents.mockImplementation(() => {
        throw new Error('listener exploded');
      });

      await expect(
        clientWithCb.appendEvents({
          id: 'conversation-1',
          events: [attachmentAddedEvent('evt-att-5')],
        })
      ).resolves.toBeDefined();
    });
  });

  describe('events persistence', () => {
    beforeEach(() => {
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
    });

    it('promotes new conversations to events-native on create (schema_version + events written atomically)', async () => {
      mockGetReturnsIndexedDocument();

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
      mockGetReturnsIndexedDocument();
      const attachmentRefs = [
        { attachment_id: 'attachment-a', version: 1 },
        { attachment_id: 'attachment-b', version: 2 },
      ];

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

    describe('skipIfTerminalExistsFor (atomic terminal guard)', () => {
      const terminated = (roundId: string): TimelineEvent =>
        ({
          id: `${roundId}::execution_terminated`,
          type: TimelineEventType.executionTerminated,
          created_at: '2025-08-04T07:42:30.000Z',
          actor: { type: EventActorType.agent, id: 'agent-1' },
          execution_id: `${roundId}::execution`,
          trigger_event_id: `${roundId}::user_message`,
          data: {
            model_usage: { connector_id: 'c', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
            time_to_first_token: 1,
            time_to_last_token: 1,
            outcome: { type: 'responded', response: { message: 'ok' } },
          },
        } as TimelineEvent);
      const failed = (roundId: string): TimelineEvent =>
        ({
          id: `${roundId}::execution_failed`,
          type: TimelineEventType.executionFailed,
          created_at: '2025-08-04T07:42:31.000Z',
          actor: { type: EventActorType.agent, id: 'agent-1' },
          execution_id: `${roundId}::execution`,
          trigger_event_id: `${roundId}::user_message`,
          data: { time_to_last_token: 1, error: { code: 'internalError', message: 'boom' } },
        } as TimelineEvent);

      it('replaceRoundEvents skips the write and returns the stored document when a terminal exists for the execution', async () => {
        const stored = [...startTimelineEvents('round-1'), terminated('round-1')];
        mockGetDocumentResponse(createConversationDocument({ schemaVersion: 1, events: stored }));

        const result = await client.replaceRoundEvents({
          id: 'conversation-1',
          roundId: 'round-1',
          events: [...startTimelineEvents('round-1'), failed('round-1')],
          skipIfTerminalExistsFor: 'round-1::execution',
        });

        expect(mockEsClient.index).not.toHaveBeenCalled();
        expect(result.events?.map((event) => event.id)).toEqual(stored.map((event) => event.id));
      });

      it('appendEvents skips the write when a terminal exists for the execution', async () => {
        const stored = [...startTimelineEvents('round-1'), terminated('round-1')];
        mockGetDocumentResponse(createConversationDocument({ schemaVersion: 1, events: stored }));

        const result = await client.appendEvents({
          id: 'conversation-1',
          events: [failed('round-1')],
          skipIfTerminalExistsFor: 'round-1::execution',
        });

        expect(mockEsClient.index).not.toHaveBeenCalled();
        expect(result.events?.map((event) => event.id)).toEqual(stored.map((event) => event.id));
      });

      it('writes when no terminal exists for the execution', async () => {
        mockGetDocumentResponse(
          createConversationDocument({ schemaVersion: 1, events: startTimelineEvents('round-1') })
        );

        await client.appendEvents({
          id: 'conversation-1',
          events: [failed('round-1')],
          skipIfTerminalExistsFor: 'round-1::execution',
        });

        expect(mockEsClient.index).toHaveBeenCalledTimes(1);
        const { document: indexed } = mockEsClient.index.mock.calls[0][0] as {
          document: { events?: Array<{ id: string }> };
        };
        expect(indexed.events?.map((event) => event.id)).toContain('round-1::execution_failed');
      });

      it("another execution's terminal does not block the write", async () => {
        mockGetDocumentResponse(
          createConversationDocument({
            schemaVersion: 1,
            events: [...startTimelineEvents('round-1'), terminated('round-1')],
          })
        );

        await client.appendEvents({
          id: 'conversation-1',
          events: [failed('round-2')],
          skipIfTerminalExistsFor: 'round-2::execution',
        });

        expect(mockEsClient.index).toHaveBeenCalledTimes(1);
      });

      it('does not notify attachment events on a skipped write', async () => {
        const onAttachmentEvents = jest.fn();
        const clientWithCb = createClient({
          space: testSpace,
          logger: loggerMock.create(),
          esClient: mockRawEsClient as unknown as ElasticsearchClient,
          agentRegistry: agentRegistry as unknown as AgentRegistry,
          user: { id: 'user-1', username: 'test-user', isAdmin: false },
          conversationEvents: mockConversationEvents,
          eventEmitter: {
            emitMetadataPatched: jest.fn(),
            emitAttachmentEvents: onAttachmentEvents,
          },
        });
        mockGetDocumentResponse(
          createConversationDocument({
            schemaVersion: 1,
            events: [...startTimelineEvents('round-1'), terminated('round-1')],
          })
        );

        await clientWithCb.appendEvents({
          id: 'conversation-1',
          events: [
            {
              id: 'att-evt-1',
              type: TimelineEventType.attachmentAdded,
              created_at: '2025-08-04T07:42:32.000Z',
              actor: { type: EventActorType.user, id: 'user-1' },
              execution_id: 'round-1::execution',
              data: { attachment_id: 'a1', attachment_type: 'text', current_version: 1 },
            } as TimelineEvent,
          ],
          skipIfTerminalExistsFor: 'round-1::execution',
        });

        expect(onAttachmentEvents).not.toHaveBeenCalled();
      });
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

    it('keeps events-native docs events-native on update (keeps schema_version, preserves stored events verbatim)', async () => {
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
      expect(indexed.events).toEqual(storedEvents);
    });
  });

  describe('addCustomEvents', () => {
    const mockEventType = {
      type: 'text_note',
      payloadSchema: z.object({
        title: z.string().min(1).max(256).optional(),
        text: z.string().min(1).max(1000),
      }),
    };
    beforeEach(() => {
      (mockConversationEvents.getDefinition as jest.Mock).mockReturnValue(mockEventType);
    });

    it('calls appendEvents with access converse and returns materialized events', async () => {
      mockGetDocumentResponse(createConversationDocument({ schemaVersion: 1, events: [] }));
      mockEsClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });

      const result = await client.addCustomEvents({
        id: 'conversation-1',
        events: [{ type: 'text_note', data: { text: 'hello' } }],
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text_note');
      expect(result[0].actor.type).toBe(EventActorType.user);
      expect(result[0].actor.id).toBe('user-1');
    });
  });
});
