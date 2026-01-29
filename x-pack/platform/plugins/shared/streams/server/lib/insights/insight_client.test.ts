/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { InsightClient } from './insight_client';
import type { InsightInput, StoredInsight } from './stored_insight';
import {
  INSIGHT_ID,
  INSIGHT_TITLE,
  INSIGHT_DESCRIPTION,
  INSIGHT_IMPACT,
  INSIGHT_EVIDENCE,
  INSIGHT_RECOMMENDATIONS,
  INSIGHT_STATUS,
  INSIGHT_CREATED_AT,
  INSIGHT_UPDATED_AT,
} from './fields';
import { StatusError } from '../streams/errors/status_error';

describe('InsightClient', () => {
  const createMockStorageClient = () => ({
    index: jest.fn(),
    get: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
    bulk: jest.fn(),
    clean: jest.fn(),
  });

  const sampleInsightInput: InsightInput = {
    title: 'Test Insight',
    description: 'This is a test insight',
    impact: 'high',
    evidence: [
      {
        streamName: 'logs',
        queryTitle: 'Error rate spike',
        eventCount: 100,
      },
    ],
    recommendations: ['Check the logs', 'Restart the service'],
  };

  const createStoredInsight = (overrides?: Partial<StoredInsight>): StoredInsight => ({
    [INSIGHT_ID]: 'test-id',
    [INSIGHT_TITLE]: 'Test Insight',
    [INSIGHT_DESCRIPTION]: 'This is a test insight',
    [INSIGHT_IMPACT]: 'high',
    [INSIGHT_EVIDENCE]: [
      {
        streamName: 'logs',
        queryTitle: 'Error rate spike',
        eventCount: 100,
      },
    ],
    [INSIGHT_RECOMMENDATIONS]: ['Check the logs', 'Restart the service'],
    [INSIGHT_STATUS]: 'active',
    [INSIGHT_CREATED_AT]: '2024-01-01T00:00:00.000Z',
    [INSIGHT_UPDATED_AT]: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  describe('create', () => {
    it('creates a new insight with generated id and timestamps', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      mockStorageClient.index.mockResolvedValue({});

      const result = await client.create(sampleInsightInput);

      expect(mockStorageClient.index).toHaveBeenCalledTimes(1);
      expect(result.title).toEqual(sampleInsightInput.title);
      expect(result.description).toEqual(sampleInsightInput.description);
      expect(result.impact).toEqual(sampleInsightInput.impact);
      expect(result.status).toEqual('active');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });
  });

  describe('get', () => {
    it('returns an insight by id', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      const storedInsight = createStoredInsight();
      mockStorageClient.get.mockResolvedValue({ _source: storedInsight });

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
          hits: [{ _source: createStoredInsight() }],
          total: { value: 1 },
        },
      });

      const result = await client.list();

      expect(mockStorageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { match_all: {} },
        })
      );
      expect(result.hits).toHaveLength(1);
      expect(result.total).toEqual(1);
    });

    it('filters by status', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0 },
        },
      });

      await client.list({ status: 'dismissed' });

      expect(mockStorageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [{ term: { [INSIGHT_STATUS]: 'dismissed' } }],
            },
          },
        })
      );
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
              filter: [
                {
                  bool: {
                    should: [
                      { term: { [INSIGHT_IMPACT]: 'critical' } },
                      { term: { [INSIGHT_IMPACT]: 'high' } },
                    ],
                    minimum_should_match: 1,
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
    it('updates an existing insight', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      const storedInsight = createStoredInsight();
      mockStorageClient.get.mockResolvedValue({ _source: storedInsight });
      mockStorageClient.index.mockResolvedValue({});

      const result = await client.update('test-id', { title: 'Updated Title' });

      expect(mockStorageClient.get).toHaveBeenCalledWith({ id: 'test-id' });
      expect(mockStorageClient.index).toHaveBeenCalledTimes(1);
      expect(result.title).toEqual('Updated Title');
      expect(result.description).toEqual('This is a test insight'); // unchanged
    });

    it('can update status to dismissed', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      const storedInsight = createStoredInsight();
      mockStorageClient.get.mockResolvedValue({ _source: storedInsight });
      mockStorageClient.index.mockResolvedValue({});

      const result = await client.update('test-id', { status: 'dismissed' });

      expect(result.status).toEqual('dismissed');
    });
  });

  describe('delete', () => {
    it('deletes an existing insight', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      const storedInsight = createStoredInsight();
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

      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0 },
        },
      });
      mockStorageClient.bulk.mockResolvedValue({});

      const result = await client.bulk([
        { index: { insight: sampleInsightInput } },
        { index: { insight: { ...sampleInsightInput, title: 'Another insight' } } },
      ]);

      expect(mockStorageClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          throwOnFail: true,
        })
      );
      expect(result).toEqual({ acknowledged: true });
    });

    it('performs bulk update operations', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient as any });

      const storedInsight = createStoredInsight();
      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'test-id', _source: storedInsight }],
          total: { value: 1 },
        },
      });
      mockStorageClient.get.mockResolvedValue({ _source: storedInsight });
      mockStorageClient.bulk.mockResolvedValue({});

      const result = await client.bulk([
        { update: { id: 'test-id', insight: { title: 'Updated' } } },
      ]);

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

    it('throws error when update/delete targets non-existent documents', async () => {
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
