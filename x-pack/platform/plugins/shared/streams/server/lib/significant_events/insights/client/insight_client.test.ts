/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { Insight } from '@kbn/streams-schema';
import { InsightClient } from './insight_client';
import {
  INSIGHT_IMPACT,
  INSIGHT_IMPACT_LEVEL,
  INSIGHT_GENERATED_AT,
  INSIGHT_USER_EVALUATION,
} from './fields';
import { StatusError } from '../../../streams/errors/status_error';

describe('InsightClient', () => {
  const createMockStorageClient = () => ({
    index: jest.fn(),
    get: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
    bulk: jest.fn(),
    clean: jest.fn(),
  });

  const defaultGeneratedAt = '2024-01-15T12:00:00.000Z';

  const createInsight = (overrides?: Partial<Insight>): Insight => ({
    id: 'test-id',
    title: 'Test Insight',
    description: 'This is a test insight',
    impact: 'high',
    impactLevel: 1,
    evidence: [
      {
        streamName: 'logs',
        queryTitle: 'Error rate spike',
        eventCount: 100,
      },
    ],
    recommendations: ['Check the logs', 'Restart the service'],
    generatedAt: defaultGeneratedAt,
    ...overrides,
  });

  describe('upsert', () => {
    it('indexes the insight and returns it', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      mockStorageClient.index.mockResolvedValue({});

      const insight = createInsight({ id: 'consumer-provided-id' });
      const result = await client.upsert(insight);

      expect(mockStorageClient.index).toHaveBeenCalledTimes(1);
      expect(mockStorageClient.index).toHaveBeenCalledWith({
        id: 'consumer-provided-id',
        document: insight,
      });
      expect(result).toEqual(insight);
    });
  });

  describe('get', () => {
    it('returns an insight by id', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      const insight = createInsight();
      mockStorageClient.get.mockResolvedValue({ _source: insight });

      const result = await client.get('test-id');

      expect(mockStorageClient.get).toHaveBeenCalledWith({ id: 'test-id' });
      expect(result.id).toEqual('test-id');
      expect(result.title).toEqual('Test Insight');
    });

    it('throws StatusError when insight not found', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      const notFoundError = new Error('Not found');
      (notFoundError as any).meta = { statusCode: 404 };
      Object.defineProperty(notFoundError, 'name', { value: 'ResponseError' });
      mockStorageClient.get.mockRejectedValue(notFoundError);

      await expect(client.get('non-existent-id')).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('returns all insights without filters', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: [{ _source: createInsight() }],
          total: { value: 1 },
        },
      });

      const result = await client.list();

      expect(mockStorageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { match_all: {} },
          sort: [
            { [INSIGHT_IMPACT_LEVEL]: 'asc' },
            { [INSIGHT_GENERATED_AT]: 'desc' },
          ],
        })
      );
      expect(result.insights).toHaveLength(1);
      expect(result.total).toEqual(1);
    });

    it('returns insights sorted by impact severity', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      // Client requests ES sort by impactLevel asc, generatedAt desc; mock returns pre-sorted hits
      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: [
            { _source: createInsight({ id: '2', impact: 'critical', impactLevel: 0 }) },
            { _source: createInsight({ id: '4', impact: 'high', impactLevel: 1 }) },
            { _source: createInsight({ id: '3', impact: 'medium', impactLevel: 2 }) },
            { _source: createInsight({ id: '1', impact: 'low', impactLevel: 3 }) },
          ],
          total: { value: 4 },
        },
      });

      const result = await client.list();

      expect(result.insights.map((h) => h.impact)).toEqual(['critical', 'high', 'medium', 'low']);
      expect(result.insights.map((h) => h.id)).toEqual(['2', '4', '3', '1']);
    });

    it('sorts by freshness when impact is equal (newer first)', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      const older = '2024-01-01T10:00:00.000Z';
      const newer = '2024-01-02T10:00:00.000Z';
      // Client requests sort by impactLevel asc, generatedAt desc; mock returns hits in that order
      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: [
            { _source: createInsight({ id: 'new', impact: 'high', impactLevel: 1, generatedAt: newer }) },
            { _source: createInsight({ id: 'old', impact: 'high', impactLevel: 1, generatedAt: older }) },
          ],
          total: { value: 2 },
        },
      });

      const result = await client.list();

      expect(result.insights.map((h) => h.id)).toEqual(['new', 'old']);
      expect(result.insights[0].generatedAt).toBe(newer);
      expect(result.insights[1].generatedAt).toBe(older);
    });

    it('filters by impact levels', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0 },
        },
      });

      await client.list({ impact: ['critical', 'high'] });

      expect(mockStorageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [{ terms: { [INSIGHT_IMPACT]: ['critical', 'high'] } }],
            },
          },
        })
      );
    });
  });

  describe('upsert (additional)', () => {
    it('overwrites existing when upserting with same id', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      mockStorageClient.index.mockResolvedValue({});

      const insight = createInsight({ id: 'test-id', title: 'Updated Title' });
      const result = await client.upsert(insight);

      expect(mockStorageClient.index).toHaveBeenCalledWith({
        id: 'test-id',
        document: insight,
      });
      expect(result.title).toEqual('Updated Title');
    });

    it('persists and returns userEvaluation when provided', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      mockStorageClient.index.mockResolvedValue({});

      const insight = createInsight({ userEvaluation: 'helpful' });
      const result = await client.upsert(insight);

      expect(mockStorageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            [INSIGHT_USER_EVALUATION]: 'helpful',
          }),
        })
      );
      expect(result.userEvaluation).toBe('helpful');
    });
  });

  describe('delete', () => {
    it('deletes an existing insight', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      const storedInsight = createInsight();
      mockStorageClient.get.mockResolvedValue({ _source: storedInsight });
      mockStorageClient.delete.mockResolvedValue({});

      const result = await client.delete('test-id');

      expect(mockStorageClient.get).toHaveBeenCalledWith({ id: 'test-id' });
      expect(mockStorageClient.delete).toHaveBeenCalledWith({ id: 'test-id' });
      expect(result).toEqual({ acknowledged: true });
    });
  });

  describe('bulk', () => {
    it('performs bulk index operations', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      mockStorageClient.bulk.mockResolvedValue({});

      const result = await client.bulk([
        { index: createInsight({ id: 'id-1' }) },
        { index: createInsight({ id: 'id-2', title: 'Another insight' }) },
      ]);

      expect(mockStorageClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          throwOnFail: true,
        })
      );
      expect(result).toEqual({ acknowledged: true });
    });

    it('performs bulk delete operations', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'test-id' }],
          total: { value: 1 },
        },
      });
      mockStorageClient.bulk.mockResolvedValue({});

      const result = await client.bulk([{ delete: { id: 'test-id' } }]);

      expect(mockStorageClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: [{ delete: { _id: 'test-id' } }],
        })
      );
      expect(result).toEqual({ acknowledged: true });
    });

    it('throws error when delete targets non-existent documents', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0 },
        },
      });

      await expect(client.bulk([{ delete: { id: 'non-existent' } }])).rejects.toThrow(StatusError);
    });
  });

  describe('clean', () => {
    it('delegates to storage client clean', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      mockStorageClient.clean.mockResolvedValue({});

      await client.clean();

      expect(mockStorageClient.clean).toHaveBeenCalledTimes(1);
    });
  });
});
