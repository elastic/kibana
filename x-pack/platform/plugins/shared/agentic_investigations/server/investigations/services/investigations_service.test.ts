/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import type { InvestigationStorageDoc, InvestigationsStorageClient } from '../storage';
import type {
  InvestigationsConversationsClient,
  ListInvestigationsQuery,
} from './investigations_service';
import { InvestigationsService } from './investigations_service';

const SPACE_ID = 'default';

const baseDoc = (overrides: Partial<InvestigationStorageDoc> = {}): InvestigationStorageDoc => ({
  spaceId: SPACE_ID,
  conversationId: 'conv-1',
  solution: 'observability',
  subjectType: 'alert',
  subjectId: 'alert-1',
  status: 'running',
  severity: '60-high',
  title: 'Test investigation',
  summary: 'Summary text',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  impactedEntities: [],
  hypotheses: [],
  recommendations: [],
  blindSpots: [],
  ...overrides,
});

const listQuery = (overrides: Partial<ListInvestigationsQuery> = {}): ListInvestigationsQuery => ({
  size: 20,
  from: 0,
  ...overrides,
});

const searchHit = (doc: InvestigationStorageDoc, id = 'inv-1') => ({
  _id: id,
  _source: doc,
  _seq_no: 1,
  _primary_term: 1,
});

const createStorage = (doc?: InvestigationStorageDoc): jest.Mocked<InvestigationsStorageClient> => {
  const hits = doc ? [searchHit(doc)] : [];
  return {
    index: jest.fn().mockResolvedValue({ _id: 'inv-1' }),
    search: jest.fn().mockResolvedValue({
      hits: { hits, total: { value: hits.length } },
      aggregations: {
        severity_counts: {
          buckets: [],
        },
      },
    }),
    bulk: jest.fn(),
    delete: jest.fn(),
    clean: jest.fn(),
    get: jest.fn(),
    existsIndex: jest.fn(),
    esql: jest.fn(),
    reconcileMappings: jest.fn(),
  } as unknown as jest.Mocked<InvestigationsStorageClient>;
};

const createConversationsClient = (): jest.Mocked<InvestigationsConversationsClient> => ({
  patchMetadata: jest.fn().mockResolvedValue(undefined),
  bulkGet: jest.fn().mockResolvedValue([]),
});

describe('InvestigationsService', () => {
  describe('list()', () => {
    it('leg 1 ES query body always contains a spaceId term filter', async () => {
      const storage = createStorage();
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);

      await service.list(SPACE_ID, listQuery());

      const [mainCall] = (storage.search as jest.Mock).mock.calls;
      const mainQuery = mainCall[0];
      const filter: Array<Record<string, unknown>> = mainQuery.query?.bool?.filter ?? [];

      expect(filter).toContainEqual({ term: { spaceId: SPACE_ID } });
    });

    it('leg 1 adds a nested query for impactedEntityName when supplied', async () => {
      const storage = createStorage();
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);

      await service.list(SPACE_ID, listQuery({ impactedEntityName: 'my-host' }));

      const [mainCall] = (storage.search as jest.Mock).mock.calls;
      const mainQuery = mainCall[0];
      const filter: Array<Record<string, unknown>> = mainQuery.query?.bool?.filter ?? [];

      expect(filter).toContainEqual({
        nested: {
          path: 'impactedEntities',
          query: { term: { 'impactedEntities.name': 'my-host' } },
        },
      });
    });

    it('leg 1b omits the severity clause from the facet filter', async () => {
      const storage = createStorage();
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);

      await service.list(SPACE_ID, listQuery({ severity: '60-high' }));

      // storage.search is called twice: leg 1 (main) and leg 1b (facets).
      const calls = (storage.search as jest.Mock).mock.calls;
      expect(calls).toHaveLength(2);

      const [mainCall, facetCall] = calls;
      const mainFilter: Array<Record<string, unknown>> = mainCall[0].query?.bool?.filter ?? [];
      const facetFilter: Array<Record<string, unknown>> = facetCall[0].query?.bool?.filter ?? [];

      // Leg 1 includes the severity filter.
      expect(mainFilter).toContainEqual({ term: { severity: '60-high' } });

      // Leg 1b must NOT include the severity filter (counts over full set).
      expect(facetFilter).not.toContainEqual({ term: { severity: '60-high' } });

      // Leg 1b must still include the spaceId filter.
      expect(facetFilter).toContainEqual({ term: { spaceId: SPACE_ID } });

      // Leg 1b is a facet-only request (size: 0).
      expect(facetCall[0].size).toBe(0);
    });

    it('leg 1b aggregation uses the severity field', async () => {
      const storage = createStorage();
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);

      await service.list(SPACE_ID, listQuery());

      const calls = (storage.search as jest.Mock).mock.calls;
      const facetCall = calls[1];
      const aggs = facetCall[0].aggs;

      expect(aggs).toHaveProperty('severity_counts');
      expect(aggs.severity_counts).toHaveProperty('terms');
      expect(aggs.severity_counts.terms).toMatchObject({ field: 'severity' });
    });
  });

  describe('getSeverityCounts()', () => {
    it('zero-fills missing severity values so every SEVERITY_OPTIONS key is present', async () => {
      // Storage returns only one bucket (high); others must be zero-filled.
      const storage = createStorage();
      (storage.search as jest.Mock).mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
        aggregations: {
          severity_counts: {
            buckets: [{ key: '60-high', doc_count: 5 }],
          },
        },
      });
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);

      const counts = await service.getSeverityCounts(SPACE_ID, {});

      // Every SEVERITY_OPTIONS key must appear.
      for (const sev of SEVERITY_OPTIONS) {
        expect(counts).toHaveProperty(sev);
      }
      expect(counts['60-high']).toBe(5);
      expect(counts['80-critical']).toBe(0);
      expect(counts['40-medium']).toBe(0);
      expect(counts['20-low']).toBe(0);
    });

    it('returns a complete map even when no documents match', async () => {
      const storage = createStorage();
      (storage.search as jest.Mock).mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
        aggregations: { severity_counts: { buckets: [] } },
      });
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);

      const counts = await service.getSeverityCounts(SPACE_ID, {});

      expect(Object.keys(counts)).toEqual(
        expect.arrayContaining(SEVERITY_OPTIONS as unknown as string[])
      );
      for (const count of Object.values(counts)) {
        expect(count).toBe(0);
      }
    });
  });

  describe('upsert()', () => {
    it('calls patchMetadata on the conversations client after indexing', async () => {
      const storage = createStorage();
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);
      const doc = baseDoc();

      await service.upsert(SPACE_ID, doc);

      // patchMetadata must be called after the index call.
      expect(storage.index).toHaveBeenCalledTimes(1);
      expect(conversations.patchMetadata).toHaveBeenCalledTimes(1);
      expect(conversations.patchMetadata).toHaveBeenCalledWith(
        doc.conversationId,
        expect.objectContaining({
          status: doc.status,
        })
      );
    });

    it('does not call patchMetadata when the investigation has no conversationId', async () => {
      const storage = createStorage();
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);
      const doc = baseDoc({ conversationId: undefined });

      await service.upsert(SPACE_ID, doc);

      expect(conversations.patchMetadata).not.toHaveBeenCalled();
    });

    it('computes severityRank from severity before indexing', async () => {
      const storage = createStorage();
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);

      // '80-critical' is index 0 in SEVERITY_OPTIONS (most severe, lowest rank).
      await service.upsert(SPACE_ID, baseDoc({ severity: '80-critical' }));

      const indexed = (storage.index as jest.Mock).mock.calls[0][0];
      expect(indexed.document.severityRank).toBe(0);
    });

    it('strips severityRank from the returned investigation', async () => {
      const storage = createStorage();
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);

      const result = await service.upsert(SPACE_ID, baseDoc({ severity: '60-high' }));

      expect(result).not.toHaveProperty('severityRank');
    });
  });

  describe('get()', () => {
    it('returns null when the document does not exist', async () => {
      const storage = createStorage();
      // Override: empty hit set.
      (storage.search as jest.Mock).mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
      });
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);

      const result = await service.get(SPACE_ID, 'nonexistent-id');

      expect(result).toBeNull();
    });

    it('searches with both ids and spaceId filter so space isolation holds', async () => {
      const doc = baseDoc();
      const storage = createStorage(doc);
      const conversations = createConversationsClient();
      const service = new InvestigationsService(storage, conversations);

      await service.get(SPACE_ID, 'inv-1');

      const call = (storage.search as jest.Mock).mock.calls[0][0];
      const filter: Array<Record<string, unknown>> = call.query?.bool?.filter ?? [];

      expect(filter).toContainEqual({ ids: { values: ['inv-1'] } });
      expect(filter).toContainEqual({ term: { spaceId: SPACE_ID } });
    });
  });
});
