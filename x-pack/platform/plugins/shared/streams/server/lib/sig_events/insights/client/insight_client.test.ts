/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import type {
  IStorageClient,
  StorageClientBulkResponse,
  StorageClientCleanResponse,
  StorageClientDeleteResponse,
  StorageClientIndexResponse,
} from '@kbn/storage-adapter';
import type { Insight } from '@kbn/streams-schema';
import { InsightClient } from './insight_client';
import { INSIGHT_IMPACT, INSIGHT_IMPACT_LEVEL, INSIGHT_GENERATED_AT } from './fields';
import type { InsightStorageSettings } from './storage_settings';
import type { esql } from '@elastic/esql';
import { StatusError } from '../../../streams/errors/status_error';

/** Renders the ES|QL string from a mocked `storageClient.esql` call. */
const renderEsqlCallQuery = (call: { pipeline: ReturnType<typeof esql.from> }): string =>
  renderEsqlCall(call).query;

const renderEsqlCall = (call: {
  pipeline: ReturnType<typeof esql.from>;
}): ReturnType<ReturnType<typeof esql.from>['toRequest']> => {
  return call.pipeline.toRequest();
};

describe('InsightClient', () => {
  const createMockStorageClient = (): jest.Mocked<
    IStorageClient<InsightStorageSettings, Insight>
  > =>
    ({
      index: jest.fn(),
      get: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
      bulk: jest.fn(),
      clean: jest.fn(),
      existsIndex: jest.fn(),
      esql: jest.fn().mockResolvedValue({ columns: [], values: [] }),
      reconcileMappings: jest.fn(),
    } as jest.Mocked<IStorageClient<InsightStorageSettings, Insight>>);

  const defaultGeneratedAt = '2024-01-15T12:00:00.000Z';

  const createInsight = (overrides?: Partial<Insight>): Insight => ({
    id: 'test-id',
    title: 'Test Insight',
    description: 'This is a test insight',
    impact: 'high',
    impact_level: 1,
    evidence: [
      {
        stream_name: 'logs',
        query_title: 'Error rate spike',
        event_count: 100,
      },
    ],
    recommendations: ['Check the logs', 'Restart the service'],
    generated_at: defaultGeneratedAt,
    ...overrides,
  });

  describe('upsert', () => {
    it('indexes the insight and returns it', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient });

      mockStorageClient.index.mockResolvedValue({} as StorageClientIndexResponse);

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
      const client = new InsightClient({ storageClient: mockStorageClient });

      const insight = createInsight();
      mockStorageClient.esql.mockResolvedValueOnce({
        columns: [
          { name: '_id', type: 'keyword' },
          { name: '_source', type: 'object' },
        ],
        values: [['test-id', insight]],
      });

      const result = await client.get('test-id');

      const { query, params } = renderEsqlCall(mockStorageClient.esql.mock.calls[0][0]);
      // ID is passed via a named param hole rather than baked into the query string.
      expect(query).toContain('?id');
      expect(params).toContainEqual({ id: 'test-id' });
      expect(result.id).toEqual('test-id');
      expect(result.title).toEqual('Test Insight');
    });

    it('throws when insight not found', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient });

      // default esql mock returns empty response — no rows → not found
      await expect(client.get('non-existent-id')).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('returns all insights without filters sorted by impact level and generated at', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient });

      const insight = createInsight();
      mockStorageClient.esql.mockResolvedValueOnce({
        columns: [
          { name: '_id', type: 'keyword' },
          { name: '_source', type: 'object' },
        ],
        values: [['test-id', insight]],
      });

      const result = await client.list();

      const rendered = renderEsqlCallQuery(mockStorageClient.esql.mock.calls[0][0]);
      expect(rendered).toContain(`SORT ${INSIGHT_IMPACT_LEVEL} ASC, ${INSIGHT_GENERATED_AT} DESC`);
      expect(mockStorageClient.search).not.toHaveBeenCalled();
      expect(result.insights).toHaveLength(1);
      expect(result.total).toEqual(1);
    });

    it('filters by impact levels', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient });

      // default esql mock returns empty response
      await client.list({ impact: ['critical', 'high'] });

      expect(mockStorageClient.esql).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: {
            bool: {
              filter: [{ terms: { [INSIGHT_IMPACT]: ['critical', 'high'] } }],
            },
          },
        })
      );
    });
  });

  describe('delete', () => {
    it('deletes an existing insight', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient });

      const storedInsight = createInsight();
      mockStorageClient.esql.mockResolvedValueOnce({
        columns: [
          { name: '_id', type: 'keyword' },
          { name: '_source', type: 'object' },
        ],
        values: [['test-id', storedInsight]],
      });
      mockStorageClient.delete.mockResolvedValue({} as StorageClientDeleteResponse);

      const result = await client.delete('test-id');

      const { query, params } = renderEsqlCall(mockStorageClient.esql.mock.calls[0][0]);
      expect(query).toContain('?id');
      expect(params).toContainEqual({ id: 'test-id' });
      expect(mockStorageClient.delete).toHaveBeenCalledWith({ id: 'test-id' });
      expect(result).toEqual({ acknowledged: true });
    });
  });

  describe('bulk', () => {
    it('performs bulk index operations', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient });

      mockStorageClient.bulk.mockResolvedValue({} as StorageClientBulkResponse);

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
      const client = new InsightClient({ storageClient: mockStorageClient });

      mockStorageClient.esql.mockResolvedValueOnce({
        columns: [
          { name: '_id', type: 'keyword' },
          { name: '_source', type: 'object' },
        ],
        values: [['test-id', createInsight()]],
      });
      mockStorageClient.bulk.mockResolvedValue({} as StorageClientBulkResponse);

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
      const client = new InsightClient({ storageClient: mockStorageClient });

      // default esql mock returns empty response — no matching id → missing
      await expect(client.bulk([{ delete: { id: 'non-existent' } }])).rejects.toThrow(StatusError);
    });
  });

  describe('clean', () => {
    it('delegates to storage client clean', async () => {
      const mockStorageClient = createMockStorageClient();
      const client = new InsightClient({ storageClient: mockStorageClient });

      mockStorageClient.clean.mockResolvedValue({} as StorageClientCleanResponse);

      await client.clean();

      expect(mockStorageClient.clean).toHaveBeenCalledTimes(1);
    });
  });
});
