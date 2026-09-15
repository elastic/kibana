/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common/chat/access_control';
import type { AgentRegistry } from '../../agents/agent_registry';
import { CONVERSATION_BULK_GET_MAX_IDS } from '../../../../common/constants';
import { createClient, type ConversationClient } from './client';
import type { Document } from './converters';

jest.mock('../templates/registry', () => ({ getTemplate: jest.fn() }));

const mockEsClient = {
  search: jest.fn(),
  index: jest.fn(),
  delete: jest.fn(),
};

jest.mock('./storage', () => ({
  createStorage: jest.fn(() => ({
    getClient: jest.fn(() => mockEsClient),
  })),
  conversationIndexName: '.kibana_agent_builder_conversations',
}));

const testSpace = 'default';

const createConversationDocument = ({
  id = 'conversation-1',
  attachments,
}: { id?: string; attachments?: unknown[] } = {}): Document =>
  ({
    _id: id,
    _seq_no: 1,
    _primary_term: 1,
    _source: {
      agent_id: 'agent-1',
      user_id: 'user-1',
      user_name: 'test-user',
      space: testSpace,
      title: `Conversation ${id}`,
      created_at: '2024-09-04T06:44:17.944Z',
      updated_at: '2025-08-04T06:44:19.123Z',
      read: false,
      read_by: [],
      pinned_by: [],
      conversation_rounds: [],
      ...(attachments ? { attachments } : {}),
      access_control: {
        access_mode: ConversationAccessControlMode.Private,
        entries: [],
      },
    },
  } as Document);

const mockSearchHits = (documents: Document[]) => {
  mockEsClient.search.mockResolvedValue({ hits: { hits: documents } });
};

describe('ConversationClient.bulkGet', () => {
  let client: ConversationClient;
  let agentRegistry: jest.Mocked<Pick<AgentRegistry, 'get' | 'getIds'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    agentRegistry = {
      get: jest.fn().mockResolvedValue({ id: 'agent-1' }),
      getIds: jest.fn().mockResolvedValue(['agent-1']),
    };

    client = createClient({
      space: testSpace,
      logger: loggerMock.create(),
      esClient: {} as ElasticsearchClient,
      agentRegistry: agentRegistry as unknown as AgentRegistry,
      user: { id: 'user-1', username: 'test-user', isAdmin: false },
    });
  });

  it('returns a map keyed by conversation id', async () => {
    mockSearchHits([
      createConversationDocument({ id: 'conversation-1' }),
      createConversationDocument({ id: 'conversation-2' }),
    ]);

    const result = await client.bulkGet(['conversation-1', 'conversation-2']);

    expect([...result.keys()]).toEqual(['conversation-1', 'conversation-2']);
    expect(result.get('conversation-1')?.title).toBe('Conversation conversation-1');
  });

  it('sends a single ids clause alongside the shared access filters', async () => {
    mockSearchHits([]);

    await client.bulkGet(['conversation-1', 'conversation-2']);

    const { query } = mockEsClient.search.mock.calls[0][0];
    expect(query.bool.filter).toContainEqual({
      ids: { values: ['conversation-1', 'conversation-2'] },
    });
    // Space scoping, read access, and the sub-agent exclusion still apply.
    expect(query.bool.filter).toHaveLength(4);
  });

  it('sizes the query to the id count and does not track totals', async () => {
    mockSearchHits([]);

    await client.bulkGet(['conversation-1', 'conversation-2', 'conversation-3']);

    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ size: 3, track_total_hits: false })
    );
    expect(mockEsClient.search.mock.calls[0][0]).not.toHaveProperty('from');
  });

  it('omits ids that did not resolve rather than erroring', async () => {
    mockSearchHits([createConversationDocument({ id: 'conversation-1' })]);

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
    mockSearchHits([
      createConversationDocument({
        id: 'conversation-1',
        attachments: [
          { id: 'att-1', type: 'text' },
          { id: 'att-2', type: 'alert', active: false },
        ],
      }),
    ]);

    const result = await client.bulkGet(['conversation-1']);
    const conversation = result.get('conversation-1');

    expect(conversation).not.toHaveProperty('rounds');
    expect(conversation?.attachments).toEqual([{ id: 'att-1', type: 'text' }]);
  });

  it('requests attachment identity without version content in _source', async () => {
    mockSearchHits([]);

    await client.bulkGet(['conversation-1']);

    const { _source: sourceFields } = mockEsClient.search.mock.calls[0][0];
    expect(sourceFields).toEqual(
      expect.arrayContaining(['attachments.id', 'attachments.type', 'attachments.active'])
    );
    expect(sourceFields).not.toContain('attachments');
    expect(sourceFields).not.toContain('conversation_rounds');
  });
});
