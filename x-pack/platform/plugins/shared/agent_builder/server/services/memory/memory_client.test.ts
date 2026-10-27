/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ShortTermMemoryNotFoundError } from '@kbn/agent-builder-server';
import { ShortTermMemoryClient } from './memory_client';
import { ShortTermMemorySystemClientImpl } from './memory_system_client';
import { memoryIndexName } from './storage';
import type { ShortTermMemoryKiDocument } from './memory_document';

const NOW = new Date('2026-10-26T12:00:00.000Z');

const storedDoc = (
  overrides: Partial<ShortTermMemoryKiDocument> = {}
): ShortTermMemoryKiDocument => ({
  '@timestamp': '2026-10-20T12:00:00.000Z',
  id: 'memory-1',
  type: 'memory.short_term.session_fact',
  title: 'Duration mapping',
  description: 'duration_ms is a keyword.',
  content: 'Cast it before comparing.',
  tags: ['logs'],
  updated_at: '2026-10-20T12:00:00.000Z',
  expires_at: '2026-11-19T12:00:00.000Z',
  references: [{ uri: 'conversation://conversation-1', relation: 'derived_from' }],
  attributes: {
    'memory.user_id': 'u_alice_0',
    'memory.user_name': 'alice',
    'memory.agent_id': 'agent-1',
    'memory.session_id': 'conversation-1',
    'memory.space': 'default',
    'memory.promotion.status': 'rejected',
    'memory.promotion.reason': 'personal',
  },
  governance: {
    provenance: {
      created_by: { uri: 'user://u_alice_0', metadata: { agent_id: 'agent-1' } },
      updated_by: { uri: 'user://u_alice_0', metadata: { agent_id: 'agent-1' } },
    },
  },
  permissions: {
    kibana: {
      privileges: [{ space: 'default', name: ['ai_index:short_term_memory/read'], count: 1 }],
    },
  },
  ...overrides,
});

const createEsClient = () => ({
  index: jest.fn().mockResolvedValue({}),
  search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
  delete: jest.fn().mockResolvedValue({}),
  deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
  bulk: jest.fn().mockResolvedValue({ items: [] }),
  indices: { exists: jest.fn().mockResolvedValue(true) },
});

const createClient = (esClient: ReturnType<typeof createEsClient>) =>
  new ShortTermMemoryClient({
    esClient: esClient as unknown as ElasticsearchClient,
    ensureIndex: async () => {},
    space: 'default',
    user: { id: 'u_alice_0', username: 'alice' },
    getNow: () => NOW,
    generateId: () => 'memory-1',
  });

describe('ShortTermMemoryClient', () => {
  it('writes a short-term memory KI into the Elastic AI index, hidden by its access action', async () => {
    const esClient = createEsClient();

    const created = await createClient(esClient).create({
      type: 'memory.session_fact',
      title: 'Duration mapping',
      description: 'duration_ms is a keyword.',
      content: 'Cast it before comparing.',
      agentId: 'agent-1',
      sessionId: 'conversation-1',
    });

    expect(esClient.index).toHaveBeenCalledWith({
      index: memoryIndexName,
      id: 'memory-1',
      op_type: 'create',
      refresh: 'wait_for',
      document: {
        '@timestamp': NOW.toISOString(),
        id: 'memory-1',
        type: 'memory.short_term.session_fact',
        title: 'Duration mapping',
        description: 'duration_ms is a keyword.',
        content: 'Cast it before comparing.',
        tags: [],
        updated_at: NOW.toISOString(),
        expires_at: '2026-11-25T12:00:00.000Z',
        references: [{ uri: 'conversation://conversation-1', relation: 'derived_from' }],
        attributes: {
          'memory.user_id': 'u_alice_0',
          'memory.user_name': 'alice',
          'memory.agent_id': 'agent-1',
          'memory.session_id': 'conversation-1',
          'memory.space': 'default',
          'memory.promotion.status': 'pending',
        },
        governance: {
          provenance: {
            created_by: {
              uri: 'user://u_alice_0',
              metadata: { agent_id: 'agent-1', session_id: 'conversation-1' },
            },
            updated_by: {
              uri: 'user://u_alice_0',
              metadata: { agent_id: 'agent-1', session_id: 'conversation-1' },
            },
          },
        },
        permissions: {
          kibana: {
            privileges: [{ space: 'default', name: ['ai_index:short_term_memory/read'], count: 1 }],
          },
        },
      },
    });
    expect(created).toMatchObject({
      id: 'memory-1',
      type: 'memory.session_fact',
      user_id: 'u_alice_0',
      agent_id: 'agent-1',
      promotion: { status: 'pending' },
    });
  });

  it('only ever reads the caller’s own short-term memories in the space', async () => {
    const esClient = createEsClient();

    await createClient(esClient).list({ agentId: 'agent-1' });

    const { filter } = esClient.search.mock.calls[0][0].query.bool;
    expect(filter).toEqual(
      expect.arrayContaining([
        { prefix: { type: 'memory.short_term.' } },
        { term: { 'attributes.memory.space': 'default' } },
        { term: { 'attributes.memory.user_id': 'u_alice_0' } },
        { term: { 'attributes.memory.agent_id': 'agent-1' } },
      ])
    );
  });

  it('treats a memory of another user as not found', async () => {
    const esClient = createEsClient();

    await expect(createClient(esClient).get('someone-elses')).rejects.toBeInstanceOf(
      ShortTermMemoryNotFoundError
    );
    await expect(createClient(esClient).delete('someone-elses')).rejects.toBeInstanceOf(
      ShortTermMemoryNotFoundError
    );
    expect(esClient.delete).not.toHaveBeenCalled();
  });

  it('resets promotion and refreshes the expiry when a memory is revised', async () => {
    const esClient = createEsClient();
    esClient.search.mockResolvedValue({
      hits: { hits: [{ _id: 'memory-1', _source: storedDoc(), _seq_no: 3, _primary_term: 1 }] },
    });

    const revised = await createClient(esClient).update('memory-1', { content: 'Use TO_DOUBLE.' });

    const request = esClient.index.mock.calls[0][0];
    expect(request).toMatchObject({ if_seq_no: 3, if_primary_term: 1 });
    expect(request.document).toMatchObject({
      content: 'Use TO_DOUBLE.',
      title: 'Duration mapping',
      updated_at: NOW.toISOString(),
      expires_at: '2026-11-25T12:00:00.000Z',
    });
    expect(request.document.attributes).toEqual({
      'memory.user_id': 'u_alice_0',
      'memory.user_name': 'alice',
      'memory.agent_id': 'agent-1',
      'memory.session_id': 'conversation-1',
      'memory.space': 'default',
      'memory.promotion.status': 'pending',
    });
    expect(revised.promotion).toEqual({ status: 'pending' });
  });

  it('deletes all of the caller’s memories by query', async () => {
    const esClient = createEsClient();
    esClient.deleteByQuery.mockResolvedValue({ deleted: 2 });

    await expect(createClient(esClient).deleteAll({ agentId: 'agent-1' })).resolves.toEqual({
      deleted: 2,
    });
    expect(esClient.deleteByQuery.mock.calls[0][0].query.bool.filter).toEqual(
      expect.arrayContaining([{ term: { 'attributes.memory.user_id': 'u_alice_0' } }])
    );
  });

  describe('markUsed', () => {
    const memory = (overrides: Record<string, unknown> = {}) => ({
      id: 'memory-1',
      type: 'memory.session_fact' as const,
      title: 't',
      description: 'd',
      content: 'c',
      tags: [],
      user_id: 'u_alice_0',
      user_name: 'alice',
      agent_id: 'agent-1',
      session_id: 'conversation-1',
      space: 'default',
      created_at: '2026-10-20T12:00:00.000Z',
      updated_at: '2026-10-20T12:00:00.000Z',
      promotion: { status: 'pending' as const },
      ...overrides,
    });

    it('stamps last_used_at with a partial update that leaves updated_at alone', async () => {
      const esClient = createEsClient();

      await createClient(esClient).markUsed([memory()]);

      expect(esClient.bulk.mock.calls[0][0].operations).toEqual([
        { update: { _index: memoryIndexName, _id: 'memory-1', retry_on_conflict: 3 } },
        { doc: { attributes: { 'memory.last_used_at': NOW.toISOString() } } },
      ]);
    });

    it('skips memories used within the hour and memories of other owners or spaces', async () => {
      const esClient = createEsClient();

      await createClient(esClient).markUsed([
        memory({ last_used_at: '2026-10-26T11:30:00.000Z' }),
        memory({ id: 'memory-2', user_id: 'u_bob_0' }),
        memory({ id: 'memory-3', space: 'other' }),
      ]);

      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });
});

describe('ShortTermMemorySystemClientImpl', () => {
  const createSystemClient = (esClient: ReturnType<typeof createEsClient>) =>
    new ShortTermMemorySystemClientImpl({
      esClient: esClient as unknown as ElasticsearchClient,
      getNow: () => NOW,
    });

  it('lists pending, unexpired memories across users, oldest first', async () => {
    const esClient = createEsClient();

    await createSystemClient(esClient).listForPromotion({
      spaceId: 'default',
      agentIds: ['agent-1'],
    });

    const request = esClient.search.mock.calls[0][0];
    expect(request.sort).toEqual([{ updated_at: { order: 'asc' } }]);
    expect(request.query.bool.filter).toEqual(
      expect.arrayContaining([
        { prefix: { type: 'memory.short_term.' } },
        { term: { 'attributes.memory.space': 'default' } },
        { terms: { 'attributes.memory.agent_id': ['agent-1'] } },
      ])
    );
    expect(JSON.stringify(request.query)).not.toContain('memory.user_id');
  });

  it('marks promotion with optimistic concurrency, so an owner revision wins', async () => {
    const esClient = createEsClient();
    esClient.search.mockResolvedValue({
      hits: { hits: [{ _id: 'memory-1', _source: storedDoc(), _seq_no: 7, _primary_term: 2 }] },
    });
    esClient.bulk.mockResolvedValue({ items: [{ index: { status: 409 } }] });

    const result = await createSystemClient(esClient).setPromotion({
      spaceId: 'default',
      ids: ['memory-1'],
      promotion: { status: 'promoted', ai_index_id: 'support', ki_id: 'stm/memory-1' },
    });

    const [action, document] = esClient.bulk.mock.calls[0][0].operations;
    expect(action).toEqual({
      index: { _index: memoryIndexName, _id: 'memory-1', if_seq_no: 7, if_primary_term: 2 },
    });
    expect(document.attributes).toMatchObject({
      'memory.promotion.status': 'promoted',
      'memory.promotion.ai_index_id': 'support',
      'memory.promotion.ki_id': 'stm/memory-1',
      'memory.promotion.updated_at': NOW.toISOString(),
    });
    expect(document.attributes).not.toHaveProperty('memory.promotion.reason');
    expect(result).toEqual({ updated: 0 });
  });

  describe('listByOwner', () => {
    it('groups unexpired memories by user and agent, revisiting only owners that changed', async () => {
      const esClient = {
        ...createEsClient(),
        msearch: jest.fn().mockResolvedValue({
          responses: [{ hits: { hits: [{ _source: storedDoc() }] } }],
        }),
      };
      esClient.search.mockResolvedValue({
        hits: { hits: [] },
        aggregations: {
          owners: { buckets: [{ key: { user_id: 'u_alice_0', agent_id: 'agent-1' } }] },
        },
      });

      const owners = await createSystemClient(esClient).listByOwner({
        spaceId: 'default',
        changedWithinHours: 48,
      });

      const ownersRequest = esClient.search.mock.calls[0][0];
      expect(ownersRequest.query.bool.filter).toEqual(
        expect.arrayContaining([{ range: { updated_at: { gte: '2026-10-24T12:00:00.000Z' } } }])
      );
      const [, memoriesRequest] = esClient.msearch.mock.calls[0][0].searches;
      expect(memoriesRequest.query.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'attributes.memory.user_id': 'u_alice_0' } },
          { term: { 'attributes.memory.agent_id': 'agent-1' } },
        ])
      );
      // Every memory of a changed owner is compared, not only the changed ones.
      expect(JSON.stringify(memoriesRequest.query)).not.toContain('2026-10-24');
      expect(owners).toEqual([
        {
          user_id: 'u_alice_0',
          user_name: 'alice',
          agent_id: 'agent-1',
          memories: [expect.objectContaining({ id: 'memory-1' })],
        },
      ]);
    });
  });

  describe('consolidate', () => {
    const writer = { uri: 'workflow://wf-1', metadata: { run_id: 'run-1' } };
    const hit = (id: string, overrides: Partial<ShortTermMemoryKiDocument> = {}, seqNo = 1) => ({
      _id: id,
      _source: storedDoc({ id, ...overrides }),
      _seq_no: seqNo,
      _primary_term: 1,
    });

    it('only reads memories of the given owner and agent', async () => {
      const esClient = createEsClient();

      await createSystemClient(esClient).consolidate({
        spaceId: 'default',
        userId: 'u_alice_0',
        agentId: 'agent-1',
        merges: [],
        remove: [{ id: 'memory-9' }],
        writer,
      });

      expect(esClient.search.mock.calls[0][0].query.bool.filter).toEqual(
        expect.arrayContaining([
          { terms: { _id: ['memory-9'] } },
          { term: { 'attributes.memory.user_id': 'u_alice_0' } },
          { term: { 'attributes.memory.agent_id': 'agent-1' } },
        ])
      );
      // Not this owner's memory, so nothing is deleted.
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('rewrites the kept memory, then deletes its sources and the removed memories', async () => {
      const esClient = createEsClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            hit('keep', {
              expires_at: '2026-11-01T00:00:00.000Z',
              attributes: {
                ...storedDoc().attributes,
                'memory.last_used_at': '2026-10-21T00:00:00.000Z',
              },
            }),
            hit('dup', {
              expires_at: '2026-12-01T00:00:00.000Z',
              references: [{ uri: 'conversation://conversation-2', relation: 'derived_from' }],
              attributes: {
                ...storedDoc().attributes,
                'memory.last_used_at': '2026-10-25T00:00:00.000Z',
              },
            }),
            hit('stale', {}, 4),
          ],
        },
      });
      esClient.bulk
        .mockResolvedValueOnce({ items: [{ index: { status: 200 } }] })
        .mockResolvedValueOnce({
          items: [{ delete: { status: 200 } }, { delete: { status: 200 } }],
        });

      const result = await createSystemClient(esClient).consolidate({
        spaceId: 'default',
        userId: 'u_alice_0',
        agentId: 'agent-1',
        merges: [
          { keep_id: 'keep', source_ids: ['dup'], title: 'T', description: 'D', content: 'C' },
        ],
        remove: [{ id: 'stale', reason: 'contradicted' }],
        writer,
      });

      const [action, document] = esClient.bulk.mock.calls[0][0].operations;
      expect(action).toEqual({
        index: { _index: memoryIndexName, _id: 'keep', if_seq_no: 1, if_primary_term: 1 },
      });
      expect(document).toMatchObject({
        title: 'T',
        content: 'C',
        updated_at: NOW.toISOString(),
        expires_at: '2026-12-01T00:00:00.000Z',
        references: [
          { uri: 'conversation://conversation-1', relation: 'derived_from' },
          { uri: 'conversation://conversation-2', relation: 'derived_from' },
        ],
        attributes: {
          'memory.user_id': 'u_alice_0',
          'memory.last_used_at': '2026-10-25T00:00:00.000Z',
          'memory.promotion.status': 'pending',
        },
        governance: { provenance: { updated_by: writer } },
      });
      expect(document.attributes).not.toHaveProperty('memory.promotion.reason');
      expect(esClient.bulk.mock.calls[1][0].operations).toEqual([
        { delete: { _index: memoryIndexName, _id: 'dup', if_seq_no: 1, if_primary_term: 1 } },
        { delete: { _index: memoryIndexName, _id: 'stale', if_seq_no: 4, if_primary_term: 1 } },
      ]);
      expect(result).toEqual({ merged: 1, deleted: 2, skipped: 0 });
    });

    it('keeps the sources when the kept memory was revised meanwhile', async () => {
      const esClient = createEsClient();
      esClient.search.mockResolvedValue({ hits: { hits: [hit('keep'), hit('dup')] } });
      esClient.bulk.mockResolvedValueOnce({ items: [{ index: { status: 409 } }] });

      const result = await createSystemClient(esClient).consolidate({
        spaceId: 'default',
        userId: 'u_alice_0',
        agentId: 'agent-1',
        merges: [
          { keep_id: 'keep', source_ids: ['dup'], title: 'T', description: 'D', content: 'C' },
        ],
        remove: [],
        writer,
      });

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ merged: 0, deleted: 0, skipped: 1 });
    });

    it('never removes a memory that is part of a merge, and skips a memory merged twice', async () => {
      const esClient = createEsClient();
      esClient.search.mockResolvedValue({
        hits: { hits: [hit('a'), hit('b'), hit('c')] },
      });
      esClient.bulk
        .mockResolvedValueOnce({ items: [{ index: { status: 200 } }] })
        .mockResolvedValueOnce({ items: [{ delete: { status: 200 } }] });

      const result = await createSystemClient(esClient).consolidate({
        spaceId: 'default',
        userId: 'u_alice_0',
        agentId: 'agent-1',
        merges: [
          { keep_id: 'a', source_ids: ['b'], title: 'T', description: 'D', content: 'C' },
          { keep_id: 'c', source_ids: ['b'], title: 'T', description: 'D', content: 'C' },
        ],
        remove: [{ id: 'a' }],
        writer,
      });

      expect(esClient.bulk.mock.calls[1][0].operations).toEqual([
        { delete: { _index: memoryIndexName, _id: 'b', if_seq_no: 1, if_primary_term: 1 } },
      ]);
      expect(result).toEqual({ merged: 1, deleted: 1, skipped: 1 });
    });
  });

  describe('decay', () => {
    it('deletes expired memories, then expiring memories neither written nor used since the cutoff', async () => {
      const esClient = createEsClient();
      esClient.deleteByQuery
        .mockResolvedValueOnce({ deleted: 3 })
        .mockResolvedValueOnce({ deleted: 2 });

      const result = await createSystemClient(esClient).decay({
        spaceId: 'default',
        agentIds: ['agent-1'],
        unusedDays: 14,
      });

      const [expired, unused] = esClient.deleteByQuery.mock.calls.map(([request]) => request);
      expect(expired.query.bool.filter).toEqual(
        expect.arrayContaining([{ range: { expires_at: { lte: NOW.toISOString() } } }])
      );
      expect(unused.query.bool).toEqual({
        filter: expect.arrayContaining([
          { terms: { 'attributes.memory.agent_id': ['agent-1'] } },
          { exists: { field: 'expires_at' } },
          { range: { updated_at: { lt: '2026-10-12T12:00:00.000Z' } } },
        ]),
        must_not: [
          { range: { 'attributes.memory.last_used_at': { gte: '2026-10-12T12:00:00.000Z' } } },
        ],
      });
      expect(result).toEqual({ expired: 3, unused: 2 });
    });

    it('does nothing before the index exists', async () => {
      const esClient = createEsClient();
      esClient.indices.exists.mockResolvedValue(false);

      await expect(
        createSystemClient(esClient).decay({ spaceId: 'default', unusedDays: 14 })
      ).resolves.toEqual({ expired: 0, unused: 0 });
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });
  });
});
