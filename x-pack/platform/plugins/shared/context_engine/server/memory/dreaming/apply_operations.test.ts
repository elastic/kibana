/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { LONG_TERM_MEMORY_INDEX } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import { applyDreamOperations } from './apply_operations';
import { ENTITY_MEMORY_TYPE } from './entity_type';
import { FACT_MEMORY_TYPE } from './fact_type';
import type { DreamOperation, LongTermMemoryTypeDefinition } from './long_term_types';
import { RELATIONSHIP_MEMORY_TYPE } from './relationship_type';

const NOW = '2026-10-02T00:00:00.000Z';
const writer = { uri: 'task://contextEngine:memoryDreaming', metadata: {} };

const shortTerm = (id: string, timestamp: string): StoredMemoryDocument => ({
  '@timestamp': timestamp,
  id,
  type: 'memory.session_fact',
  title: id,
  description: '',
  content: '',
  updated_at: timestamp,
});

const fact = (overrides: Partial<StoredMemoryDocument> = {}): StoredMemoryDocument => ({
  '@timestamp': '2026-09-01T00:00:00.000Z',
  id: 'fact-1',
  type: 'memory.fact',
  title: 'Orders use @timestamp',
  description: 'Time field',
  content: 'The orders index uses @timestamp as its time field.',
  updated_at: '2026-09-01T00:00:00.000Z',
  references: [{ uri: 'ki://short-term-memory/old', relation: 'derived_from' }],
  attributes: {
    'memory.key': 'orders.timestamp',
    'memory.last_seen_at': '2026-09-01T00:00:00.000Z',
    'fact.verification.status': 'unverified',
  },
  governance: { lifecycle: { status: 'active' } },
  permissions: { kibana: { privileges: [{ space: 'team-a', name: [], count: 0 }] } },
  ...overrides,
});

const responseError = (statusCode: number) =>
  new errors.ResponseError(elasticsearchClientMock.createApiResponse({ statusCode, body: {} }));

describe('applyDreamOperations', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let ids: string[];
  const sources = new Map([
    ['s1', shortTerm('s1', '2026-10-01T01:00:00.000Z')],
    ['s2', shortTerm('s2', '2026-10-01T02:00:00.000Z')],
  ]);

  const mockTarget = (document?: StoredMemoryDocument) => {
    if (!document) {
      esClient.get.mockRejectedValue(responseError(404));
      return;
    }
    esClient.get.mockResolvedValue({
      _index: LONG_TERM_MEMORY_INDEX,
      _id: document.id,
      _seq_no: 3,
      _primary_term: 1,
      found: true,
      _source: document,
    });
  };

  const mockKeyMatch = (id?: string) => {
    esClient.search.mockResolvedValue({
      hits: { hits: id ? [{ _index: LONG_TERM_MEMORY_INDEX, _id: id }] : [] },
    } as unknown as Awaited<ReturnType<typeof esClient.search>>);
  };

  const apply = (
    operations: DreamOperation[],
    definition: LongTermMemoryTypeDefinition = FACT_MEMORY_TYPE
  ) =>
    applyDreamOperations({
      esClient,
      spaceId: 'team-a',
      definition,
      operations,
      sources,
      context: { now: NOW, writer },
      logger: loggerMock.create(),
      generateId: () => ids.shift() ?? 'generated-x',
    });

  const indexedDocuments = () =>
    esClient.index.mock.calls.map(([request]) => request.document as StoredMemoryDocument);

  beforeEach(() => {
    esClient = elasticsearchClientMock.createElasticsearchClient();
    ids = ['new-1', 'new-2'];
    mockKeyMatch();
    mockTarget(fact());
  });

  it('creates a new fact with provenance and an unverified status', async () => {
    const result = await apply([
      {
        op: 'create',
        key: 'orders.timestamp',
        title: 'Orders use @timestamp',
        description: 'Time field',
        content: 'The orders index uses @timestamp.',
        source_ids: ['s2', 's1'],
      },
    ]);

    expect(result).toEqual({ applied: 1, skipped: 0 });
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ index: LONG_TERM_MEMORY_INDEX, id: 'new-1', op_type: 'create' })
    );
    expect(indexedDocuments()[0]).toMatchObject({
      id: 'new-1',
      type: 'memory.fact',
      references: [
        { uri: 'ki://short-term-memory/s2', relation: 'derived_from' },
        { uri: 'ki://short-term-memory/s1', relation: 'derived_from' },
      ],
      attributes: {
        'memory.key': 'orders.timestamp',
        'memory.first_seen_at': '2026-10-01T01:00:00.000Z',
        'memory.last_seen_at': '2026-10-01T02:00:00.000Z',
        'fact.verification.status': 'unverified',
        'fact.verification.by': writer.uri,
      },
      governance: {
        provenance: { created_by: writer, updated_by: writer },
        lifecycle: { status: 'active' },
      },
      permissions: { kibana: { privileges: [{ space: 'team-a', name: [], count: 0 }] } },
    });
  });

  it('reinforces a live fact with the same key instead of creating a duplicate', async () => {
    mockKeyMatch('fact-1');

    await apply([
      {
        op: 'create',
        key: 'orders.timestamp',
        title: 't',
        description: 'd',
        content: 'c',
        source_ids: ['s1'],
      },
    ]);

    expect(esClient.index).toHaveBeenCalledTimes(1);
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'fact-1', if_seq_no: 3, if_primary_term: 1 })
    );
    expect(indexedDocuments()[0].references).toEqual([
      { uri: 'ki://short-term-memory/old', relation: 'derived_from' },
      { uri: 'ki://short-term-memory/s1', relation: 'derived_from' },
    ]);
    expect(indexedDocuments()[0].attributes?.['memory.last_seen_at']).toBe(
      '2026-10-01T01:00:00.000Z'
    );
  });

  it.each([
    [
      'an operation the type does not support',
      { op: 'confirm', source_ids: ['s1'] },
      ['create', 'reinforce'] as const,
    ],
    [
      'an operation that cites no memory from this dream',
      { op: 'reinforce', source_ids: ['x'] },
      FACT_MEMORY_TYPE.operations,
    ],
    [
      'a create without content',
      { op: 'create', key: 'k', source_ids: ['s1'] },
      FACT_MEMORY_TYPE.operations,
    ],
    [
      'an update without a target',
      { op: 'reinforce', source_ids: ['s1'] },
      FACT_MEMORY_TYPE.operations,
    ],
  ])('skips %s', async (_name, operation, operations) => {
    const result = await applyDreamOperations({
      esClient,
      spaceId: 'team-a',
      definition: { ...FACT_MEMORY_TYPE, operations },
      operations: [operation as DreamOperation],
      sources,
      context: { now: NOW, writer },
      logger: loggerMock.create(),
      generateId: () => 'new-1',
    });

    expect(result).toEqual({ applied: 0, skipped: 1 });
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    [
      'in another space',
      fact({ permissions: { kibana: { privileges: [{ space: 'other', name: [], count: 0 }] } } }),
    ],
    ['deleted', fact({ governance: { lifecycle: { status: 'deleted' } } })],
    ['expired', fact({ expires_at: '2026-10-01T00:00:00.000Z' })],
  ])('skips a target that is %s', async (_name, target) => {
    mockTarget(target as StoredMemoryDocument | undefined);

    const result = await apply([{ op: 'reinforce', target_id: 'fact-1', source_ids: ['s1'] }]);

    expect(result).toEqual({ applied: 0, skipped: 1 });
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('outdates a fact by expiring it now', async () => {
    await apply([{ op: 'outdate', target_id: 'fact-1', source_ids: ['s1'] }]);

    expect(indexedDocuments()[0]).toMatchObject({ id: 'fact-1', expires_at: NOW });
  });

  it('supersedes a fact with a tombstone and a new fact that points back to it', async () => {
    const result = await apply([
      {
        op: 'supersede',
        target_id: 'fact-1',
        title: 'Orders use event.ingested',
        description: 'Time field',
        content: 'The orders index now uses event.ingested.',
        source_ids: ['s1'],
      },
    ]);

    expect(result).toEqual({ applied: 1, skipped: 0 });
    const [tombstone, created] = indexedDocuments();
    expect(tombstone.governance?.lifecycle?.status).toBe('deleted');
    expect(created).toMatchObject({
      id: 'new-1',
      attributes: { 'memory.key': 'orders.timestamp' },
      references: [
        { uri: 'ki://long-term-memory/fact-1', relation: 'supersedes' },
        { uri: 'ki://short-term-memory/s1', relation: 'derived_from' },
      ],
    });
  });

  it('confirms a fact', async () => {
    await apply([{ op: 'confirm', target_id: 'fact-1', source_ids: ['s1'] }]);

    expect(indexedDocuments()[0].attributes).toMatchObject({
      'fact.verification.status': 'confirmed',
      'fact.verification.updated_at': NOW,
    });
    expect(indexedDocuments()[0].governance?.lifecycle?.status).toBe('active');
  });

  it('refutes a fact by tombstoning it', async () => {
    await apply([{ op: 'refute', target_id: 'fact-1', source_ids: ['s1'] }]);

    expect(indexedDocuments()[0].attributes?.['fact.verification.status']).toBe('refuted');
    expect(indexedDocuments()[0].governance?.lifecycle?.status).toBe('deleted');
  });

  it('retries an update after a version conflict', async () => {
    esClient.index.mockRejectedValueOnce(responseError(409));

    const result = await apply([{ op: 'reinforce', target_id: 'fact-1', source_ids: ['s1'] }]);

    expect(result).toEqual({ applied: 1, skipped: 0 });
    expect(esClient.get).toHaveBeenCalledTimes(2);
    expect(esClient.index).toHaveBeenCalledTimes(2);
  });

  describe('entities, relationships and the links between them', () => {
    const entity = (overrides: Partial<StoredMemoryDocument> = {}) =>
      fact({
        id: 'entity-1',
        type: 'memory.entity',
        title: 'Search team',
        description: 'A team',
        content: 'Owns search.',
        attributes: { 'memory.key': 'team:search-team', 'entity.kind': 'team' },
        ...overrides,
      });

    const link = () =>
      fact({
        id: 'link-1',
        type: 'memory.relationship',
        title: 'Search team owns Orders use @timestamp',
        description: 'The team said so.',
        references: [
          { uri: 'ki://long-term-memory/entity-1', relation: 'relates_to', description: 'from' },
          { uri: 'ki://long-term-memory/fact-1', relation: 'relates_to', description: 'to' },
          { uri: 'ki://short-term-memory/old', relation: 'derived_from' },
        ],
        attributes: {
          'memory.key': 'entity-1|owns|fact-1',
          'relationship.relation': 'owns',
        },
      });

    const mockLive = (...documents: StoredMemoryDocument[]) => {
      esClient.get.mockImplementation(async ({ id }) => {
        const document = documents.find((candidate) => candidate.id === id);
        if (!document) {
          throw responseError(404);
        }
        return {
          _index: LONG_TERM_MEMORY_INDEX,
          _id: id,
          _seq_no: 3,
          _primary_term: 1,
          found: true,
          _source: document,
        };
      });
    };

    const mockLinks = (...links: StoredMemoryDocument[]) => {
      esClient.search.mockImplementation(
        async (request) =>
          ({
            hits: {
              hits: request?.seq_no_primary_term
                ? links.splice(0).map((document) => ({
                    _index: LONG_TERM_MEMORY_INDEX,
                    _id: document.id,
                    _seq_no: 5,
                    _primary_term: 1,
                    _source: document,
                  }))
                : [],
            },
          } as unknown as Awaited<ReturnType<typeof esClient.search>>)
      );
    };

    it('creates an entity under a key built from its kind and name', async () => {
      const result = await apply(
        [
          {
            op: 'create',
            kind: 'team',
            title: 'Search Relevance',
            description: 'A team',
            content: 'Owns ranking.',
            aliases: ['SR', 'search relevance'],
            source_ids: ['s1'],
          },
        ],
        ENTITY_MEMORY_TYPE
      );

      expect(result).toEqual({ applied: 1, skipped: 0 });
      expect(indexedDocuments()[0].attributes).toMatchObject({
        'memory.key': 'team:search-relevance',
        'entity.kind': 'team',
        'entity.aliases': ['SR'],
      });
    });

    it('skips an entity without a valid kind', async () => {
      const result = await apply(
        [
          {
            op: 'create',
            kind: 'pet',
            title: 'Rex',
            description: 'd',
            content: 'c',
            source_ids: ['s1'],
          },
        ],
        ENTITY_MEMORY_TYPE
      );

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('adds aliases to an entity, and skips when none are new', async () => {
      mockLive(entity({ attributes: { 'entity.kind': 'team', 'entity.aliases': ['ST'] } }));

      const result = await apply(
        [
          {
            op: 'add_aliases',
            target_id: 'entity-1',
            aliases: ['st', 'Search'],
            source_ids: ['s1'],
          },
          {
            op: 'add_aliases',
            target_id: 'entity-1',
            aliases: ['Search team'],
            source_ids: ['s1'],
          },
        ],
        ENTITY_MEMORY_TYPE
      );

      expect(result).toEqual({ applied: 1, skipped: 1 });
      expect(indexedDocuments()[0].attributes?.['entity.aliases']).toEqual(['ST', 'Search']);
    });

    it('creates a relationship between two live memories', async () => {
      mockLive(entity(), fact());

      const result = await apply(
        [
          {
            op: 'create',
            from_id: 'fact-1',
            relation: 'About',
            to_id: 'entity-1',
            description: 'The fact is about the team.',
            source_ids: ['s1'],
          },
        ],
        RELATIONSHIP_MEMORY_TYPE
      );

      expect(result).toEqual({ applied: 1, skipped: 0 });
      expect(indexedDocuments()[0]).toMatchObject({
        type: 'memory.relationship',
        title: 'Orders use @timestamp about Search team',
        references: [
          { uri: 'ki://long-term-memory/fact-1', relation: 'relates_to', description: 'from' },
          { uri: 'ki://long-term-memory/entity-1', relation: 'relates_to', description: 'to' },
          { uri: 'ki://short-term-memory/s1', relation: 'derived_from' },
        ],
        attributes: {
          'memory.key': 'fact-1|about|entity-1',
          'relationship.relation': 'about',
        },
      });
      expect(indexedDocuments()[0].attributes).not.toHaveProperty(['relationship.from_id']);
      expect(indexedDocuments()[0].attributes).not.toHaveProperty(['relationship.to_id']);
    });

    it('links any two memories with related_to and a description', async () => {
      mockLive(entity(), fact());

      const result = await apply(
        [
          {
            op: 'create',
            from_id: 'entity-1',
            relation: 'related_to',
            to_id: 'fact-1',
            description: 'The team wrote the convention.',
            source_ids: ['s1'],
          },
        ],
        RELATIONSHIP_MEMORY_TYPE
      );

      expect(result).toEqual({ applied: 1, skipped: 0 });
    });

    it.each([
      ['an end that is missing', { from_id: 'fact-1', to_id: 'gone', relation: 'about' }],
      ['a memory linked to itself', { from_id: 'fact-1', to_id: 'fact-1', relation: 'about' }],
      [
        'a relation that is not allowed',
        { from_id: 'fact-1', to_id: 'entity-1', relation: 'is owned by!' },
      ],
      [
        'a relation that cannot join its ends',
        { from_id: 'entity-1', to_id: 'fact-1', relation: 'owns' },
      ],
      [
        'related_to without a description',
        { from_id: 'entity-1', to_id: 'fact-1', relation: 'related_to' },
      ],
      [
        'an end that is another relationship',
        { from_id: 'fact-1', to_id: 'link-1', relation: 'about' },
      ],
    ])('skips a relationship with %s', async (_name, ends) => {
      mockLive(entity(), fact(), link());

      const result = await apply(
        [{ op: 'create', ...ends, source_ids: ['s1'] }],
        RELATIONSHIP_MEMORY_TYPE
      );

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(esClient.index).not.toHaveBeenCalled();
    });

    it('moves the relationships of a superseded entity to the new entity', async () => {
      mockLive(entity(), fact());
      mockLinks(link());

      const result = await apply(
        [
          {
            op: 'supersede',
            target_id: 'entity-1',
            title: 'Search team',
            description: 'A team',
            content: 'Owns search and ranking.',
            source_ids: ['s1'],
          },
        ],
        ENTITY_MEMORY_TYPE
      );

      expect(result).toEqual({ applied: 1, skipped: 0 });
      const [tombstone, created, moved] = indexedDocuments();
      expect(tombstone.governance?.lifecycle?.status).toBe('deleted');
      expect(created).toMatchObject({ id: 'new-1', attributes: { 'entity.kind': 'team' } });
      expect(moved).toMatchObject({
        id: 'link-1',
        attributes: {
          'memory.key': 'new-1|owns|fact-1',
        },
        references: [
          { uri: 'ki://long-term-memory/new-1', relation: 'relates_to', description: 'from' },
          { uri: 'ki://long-term-memory/fact-1', relation: 'relates_to', description: 'to' },
          { uri: 'ki://short-term-memory/old', relation: 'derived_from' },
        ],
      });
      expect(moved.expires_at).toBeUndefined();
      expect(esClient.index.mock.calls[2][0]).toMatchObject({ if_seq_no: 5, if_primary_term: 1 });
    });

    it('outdates the relationships of an outdated fact', async () => {
      mockLinks(link());

      await apply([{ op: 'outdate', target_id: 'fact-1', source_ids: ['s1'] }]);

      const [outdated, linkOutdated] = indexedDocuments();
      expect(outdated).toMatchObject({ id: 'fact-1', expires_at: NOW });
      expect(linkOutdated).toMatchObject({ id: 'link-1', expires_at: NOW });
    });

    it('leaves relationships alone when a relationship itself changes', async () => {
      mockLive(link());
      mockLinks(link());

      await apply(
        [{ op: 'outdate', target_id: 'link-1', source_ids: ['s1'] }],
        RELATIONSHIP_MEMORY_TYPE
      );

      expect(esClient.index).toHaveBeenCalledTimes(1);
    });
  });
});
