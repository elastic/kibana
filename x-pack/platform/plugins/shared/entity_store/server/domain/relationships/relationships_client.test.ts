/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { RelationshipMetadataDoc } from '../../../common/domain/entity_metadata/relationship_metadata';
import { RELATIONSHIP_KINDS } from '../../../common/domain/entity_metadata/relationship_metadata';
import { ENTITY_METADATA, getEntitiesAlias } from '../../../common/domain/entity_index';
import { RelationshipsClient } from './relationships_client';

const makeDoc = (overrides: Partial<RelationshipMetadataDoc> = {}): RelationshipMetadataDoc =>
  ({
    '@timestamp': '2026-05-15T10:30:00.000Z',
    'event.kind': 'event',
    'event.action': 'relationship_observed',
    'entity.id': 'user:alice@corp',
    'entity.source': 'elastic_defend',
    'entity.relationships.accesses_frequently.target': 'host:laptopA',
    Maintainer: {
      kind: 'accesses_frequently_and_infrequently',
      scan_id: 'scan-1',
      lookback_window: 'now-30d',
    },
    ...overrides,
  } as RelationshipMetadataDoc);

describe('RelationshipsClient', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;
  let client: RelationshipsClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    client = new RelationshipsClient({ esClient, logger, namespace: 'default' });
  });

  describe('listRelationshipMetadata', () => {
    const EMPTY_HITS = {
      hits: { hits: [], total: { value: 0, relation: 'eq' as const } },
    };

    const mockEmptySearch = () => {
      esClient.search.mockResolvedValueOnce(EMPTY_HITS as never);
    };

    const getSearchBody = () => {
      const [call] = esClient.search.mock.calls;
      return call[0] as {
        index: string;
        query: { bool?: { filter?: Array<Record<string, unknown>> } };
        from?: number;
        size?: number;
        sort?: unknown;
      };
    };

    const getFilters = () => getSearchBody().query.bool?.filter ?? [];

    it('queries the metadata alias with required filters and defaults', async () => {
      mockEmptySearch();
      const result = await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });

      const body = getSearchBody();
      expect(body.index).toBe(getEntitiesAlias(ENTITY_METADATA, 'default'));
      expect(body.from).toBe(0);
      expect(body.size).toBe(10);
      expect(body.sort).toEqual([{ '@timestamp': 'desc' }]);
      expect(getFilters()).toEqual(
        expect.arrayContaining([
          { term: { 'event.action': 'relationship_observed' } },
          { term: { 'entity.id': 'user:alice@corp' } },
        ])
      );
      expect(result).toEqual({ records: [], total: 0, page: 1, perPage: 10 });
    });

    it('scopes the index alias to the client namespace', async () => {
      const otherClient = new RelationshipsClient({ esClient, logger, namespace: 'tenant-x' });
      mockEmptySearch();
      await otherClient.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      expect(getSearchBody().index).toBe(getEntitiesAlias(ENTITY_METADATA, 'tenant-x'));
    });

    it('filters by kind via exists on the flat .target field', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({
        entityId: 'user:alice@corp',
        kind: 'communicates_with',
      });
      expect(getFilters()).toContainEqual({
        exists: { field: 'entity.relationships.communicates_with.target' },
      });
    });

    it('filters by kind+target with an exact term (not exists)', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({
        entityId: 'user:alice@corp',
        kind: 'accesses_frequently',
        target: 'host:laptopA',
      });
      const filters = getFilters();
      expect(filters).toContainEqual({
        term: { 'entity.relationships.accesses_frequently.target': 'host:laptopA' },
      });
      expect(filters.some((f) => 'exists' in f)).toBe(false);
    });

    it('filters by target alone with a should across every RELATIONSHIP_KINDS', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({
        entityId: 'user:alice@corp',
        target: 'host:laptopA',
      });

      const targetBool = getFilters()
        .map((f) => f.bool as { should?: unknown[]; minimum_should_match?: number } | undefined)
        .find((b) => b?.minimum_should_match === 1);

      expect(targetBool?.should).toHaveLength(RELATIONSHIP_KINDS.length);
      for (const kind of RELATIONSHIP_KINDS) {
        expect(targetBool?.should).toContainEqual({
          term: { [`entity.relationships.${kind}.target`]: 'host:laptopA' },
        });
      }
    });

    it('applies an @timestamp range when from/to are set', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({
        entityId: 'user:alice@corp',
        from: '2026-04-27T00:00:00.000Z',
        to: '2026-05-27T00:00:00.000Z',
      });
      expect(getFilters()).toContainEqual({
        range: {
          '@timestamp': {
            gte: '2026-04-27T00:00:00.000Z',
            lte: '2026-05-27T00:00:00.000Z',
          },
        },
      });
    });

    it('translates page/perPage into from/size and honors sort overrides', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({
        entityId: 'user:alice@corp',
        page: 3,
        perPage: 25,
        sortField: 'event.ingested',
        sortOrder: 'asc',
      });
      const body = getSearchBody();
      expect(body.from).toBe(50);
      expect(body.size).toBe(25);
      expect(body.sort).toEqual([{ 'event.ingested': 'asc' }]);
    });

    it('returns mapped records and total from hits', async () => {
      const doc1 = makeDoc({ '@timestamp': '2026-05-01T10:00:00.000Z' });
      const doc2 = makeDoc({ '@timestamp': '2026-05-02T10:00:00.000Z' });
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: doc1, _index: 'x', _id: '1' },
            { _source: undefined, _index: 'x', _id: 'missing' },
            { _source: doc2, _index: 'x', _id: '2' },
          ],
          total: { value: 3, relation: 'eq' as const },
        },
      } as never);

      const result = await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      expect(result.records).toEqual([doc1, doc2]);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
    });

    it('handles a numeric hits.total from Elasticsearch', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeDoc(), _index: 'x', _id: '1' }],
          total: 1,
        },
      } as never);

      const result = await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      expect(result.total).toBe(1);
    });
  });

  describe('getEarliestObservationByTarget', () => {
    it('returns an empty map without querying when no targets are given', async () => {
      const result = await client.getEarliestObservationByTarget({
        entityId: 'user:alice@corp',
        kind: 'administers',
        targets: [],
      });

      expect(result.size).toBe(0);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('returns an empty map when there are no aggregation buckets', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0, relation: 'eq' as const } },
        aggregations: { by_target: { buckets: [] } },
      } as never);

      const result = await client.getEarliestObservationByTarget({
        entityId: 'user:alice@corp',
        kind: 'administers',
        targets: ['host:dc-01', 'host:dc-02'],
      });

      expect(result.size).toBe(0);
    });

    it('returns a target -> earliest ms map, skipping targets without history', async () => {
      const earliest = 1_746_057_600_000;
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0, relation: 'eq' as const } },
        aggregations: {
          by_target: {
            buckets: [
              {
                key: 'host:dc-01',
                earliest: { value: earliest, value_as_string: '2025-05-01T00:00:00.000Z' },
              },
              { key: 'host:dc-02', earliest: { value: null } },
            ],
          },
        },
      } as never);

      const result = await client.getEarliestObservationByTarget({
        entityId: 'user:alice@corp',
        kind: 'administers',
        targets: ['host:dc-01', 'host:dc-02'],
      });

      expect(result.get('host:dc-01')).toBe(earliest);
      expect(result.has('host:dc-02')).toBe(false);
    });
  });
});
