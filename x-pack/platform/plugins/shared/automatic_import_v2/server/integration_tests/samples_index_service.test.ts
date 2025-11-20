/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import type { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { AuthenticatedUser } from '@kbn/security-plugin/server';
import type { DataStreamSamples } from '../../common';
import { AutomaticImportSamplesIndexService } from '../services';
import { AutomaticImportSamplesIndexName } from '../services';

describe('AutomaticImportSamplesIndexService Integration Tests', () => {
  let manageES: TestElasticsearchUtils;
  let kbnRoot: ReturnType<typeof createRootWithCorePlugins>;
  let esClient: ElasticsearchClient;
  let coreStart: InternalCoreStart;
  let samplesIndexService: AutomaticImportSamplesIndexService;
  let mockUser: AuthenticatedUser;

  beforeAll(async () => {
    const { startES, startKibana } = createTestServers({ adjustTimeout: jest.setTimeout });
    const testServers = await Promise.all([startES(), startKibana()]);
    manageES = testServers[0];
    ({ root: kbnRoot, coreStart } = testServers[1]);

    esClient = coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    if (esClient) {
      // Clean up indices created during tests
      try {
        const indices = await esClient.indices.get({
          index: `${AutomaticImportSamplesIndexName}*`,
          ignore_unavailable: true,
        });
        const indexNames = Object.keys(indices);
        if (indexNames.length > 0) {
          for (const indexName of indexNames) {
            await esClient.indices.delete({
              index: indexName,
              ignore_unavailable: true,
            });
          }
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    await kbnRoot?.shutdown();
    await manageES?.stop();
  });

  beforeEach(async () => {
    mockUser = {
      username: 'test-user',
      roles: ['admin'],
      profile_uid: 'test-profile-uid',
    } as unknown as AuthenticatedUser;

    samplesIndexService = new AutomaticImportSamplesIndexService(
      kbnRoot.logger,
      Promise.resolve(esClient)
    );

    // Wait for service initialization
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Clean up test data after each test
    try {
      const indices = await esClient.indices.get({
        index: `${AutomaticImportSamplesIndexName}*`,
        ignore_unavailable: true,
      });
      const indexNames = Object.keys(indices);
      if (indexNames.length > 0) {
        for (const indexName of indexNames) {
          await esClient.indices.delete({
            index: indexName,
            ignore_unavailable: true,
          });
        }
        // Wait a bit to ensure deletion completes
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
  });

  describe('addSamplesToDataStream', () => {
    it('should create multiple sample documents from logData array', async () => {
      const dataStream: DataStreamSamples = {
        integrationId: 'integration-multi-123',
        dataStreamId: 'data-stream-multi-456',
        logData: ['Sample log line 1', 'Sample log line 2', 'Sample log line 3'],
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'logs.txt',
      };

      const result = await samplesIndexService.addSamplesToDataStream(mockUser, dataStream);

      expect(result.errors).toBe(false);
      expect(result.items).toHaveLength(3);

      // Verify the documents were created in ES
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      const searchResult = await esClient.search({
        index: `${AutomaticImportSamplesIndexName}*`,
        query: {
          match: {
            integration_id: 'integration-multi-123',
          },
        },
      });

      expect(searchResult.hits.total).toEqual({ value: 3, relation: 'eq' });
      const docs = searchResult.hits.hits.map((hit) => hit._source) as any[];
      expect(docs[0].integration_id).toBe('integration-multi-123');
      expect(docs[0].data_stream_id).toBe('data-stream-multi-456');
      expect(docs[0].created_by).toBe('test-user');
      expect(docs[0].original_filename).toBe('logs.txt');
      expect(docs[0].metadata.created_at).toBeDefined();

      // Check that all three log lines are present
      const logData = docs.map((doc) => doc.log_data).sort();
      expect(logData).toEqual(['Sample log line 1', 'Sample log line 2', 'Sample log line 3']);
    });

    it('should create a single sample document', async () => {
      const dataStream: DataStreamSamples = {
        integrationId: 'integration-single-999',
        dataStreamId: 'data-stream-single-888',
        logData: ['Sample log line 1'],
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'logs.txt',
      };

      const result = await samplesIndexService.addSamplesToDataStream(mockUser, dataStream);

      expect(result.errors).toBe(false);
      expect(result.items).toHaveLength(1);

      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      const searchResult = await esClient.search({
        index: `${AutomaticImportSamplesIndexName}*`,
        query: {
          match: {
            integration_id: 'integration-single-999',
          },
        },
      });

      expect(searchResult.hits.total).toEqual({ value: 1, relation: 'eq' });
      const doc = searchResult.hits.hits[0]._source as any;
      expect(doc.log_data).toBe('Sample log line 1');
    });

    it('should use authenticated user for created_by field', async () => {
      mockUser = {
        username: 'admin-user',
        roles: ['admin'],
        profile_uid: 'admin-profile',
      } as unknown as AuthenticatedUser;

      const dataStream: DataStreamSamples = {
        integrationId: 'integration-auth-777',
        dataStreamId: 'data-stream-auth-666',
        logData: ['Sample log'],
        createdBy: 'original-user', // Should be overridden
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'logs.txt',
      };

      await samplesIndexService.addSamplesToDataStream(mockUser, dataStream);

      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      const searchResult = await esClient.search({
        index: `${AutomaticImportSamplesIndexName}*`,
        query: {
          match: {
            integration_id: 'integration-auth-777',
          },
        },
      });

      expect(searchResult.hits.total).toEqual({ value: 1, relation: 'eq' });
      const doc = searchResult.hits.hits[0]._source as any;
      expect(doc.created_by).toBe('admin-user');
    });

    it('should handle special characters', async () => {
      const dataStream: DataStreamSamples = {
        integrationId: 'integration-special-555',
        dataStreamId: 'data-stream-special-444',
        logData: ['Log with "quotes" and \\backslashes\\ and \nnewlines'],
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'logs with spaces.txt',
      };

      const result = await samplesIndexService.addSamplesToDataStream(mockUser, dataStream);

      expect(result.errors).toBe(false);

      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      const searchResult = await esClient.search({
        index: `${AutomaticImportSamplesIndexName}*`,
        query: {
          match: {
            integration_id: 'integration-special-555',
          },
        },
      });

      expect(searchResult.hits.total).toEqual({ value: 1, relation: 'eq' });
      const doc = searchResult.hits.hits[0]._source as any;
      expect(doc.log_data).toBe('Log with "quotes" and \\backslashes\\ and \nnewlines');
      expect(doc.original_filename).toBe('logs with spaces.txt');
    });

    it('should create documents with proper timestamp', async () => {
      const dataStream: DataStreamSamples = {
        integrationId: 'integration-time-333',
        dataStreamId: 'data-stream-time-222',
        logData: ['Sample log'],
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'logs.txt',
      };

      const beforeTime = new Date();
      await samplesIndexService.addSamplesToDataStream(mockUser, dataStream);
      const afterTime = new Date();

      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      const searchResult = await esClient.search({
        index: `${AutomaticImportSamplesIndexName}*`,
        query: {
          match: {
            integration_id: 'integration-time-333',
          },
        },
      });

      expect(searchResult.hits.total).toEqual({ value: 1, relation: 'eq' });
      const doc = searchResult.hits.hits[0]._source as any;
      expect(doc.metadata.created_at).toBeDefined();

      const createdAt = new Date(doc.metadata.created_at);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 1000); // Allow 1s tolerance
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000); // Allow 1s tolerance
    });

    it('should handle large batch of log lines', async () => {
      const logData = Array.from({ length: 100 }, (_, i) => `Log data for document ${i}`);

      const dataStream: DataStreamSamples = {
        integrationId: 'integration-batch-111',
        dataStreamId: 'data-stream-batch-000',
        logData,
        createdBy: 'batch-user',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'batch.txt',
      };

      const result = await samplesIndexService.addSamplesToDataStream(mockUser, dataStream);

      expect(result.errors).toBe(false);
      expect(result.items).toHaveLength(100);

      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      const searchResult = await esClient.search({
        index: `${AutomaticImportSamplesIndexName}*`,
        query: {
          match: {
            integration_id: 'integration-batch-111',
          },
        },
        size: 0,
      });

      expect(searchResult.hits.total).toEqual({ value: 100, relation: 'eq' });
    });

    it('should handle empty logData array', async () => {
      const dataStream: DataStreamSamples = {
        integrationId: 'integration-empty-543',
        dataStreamId: 'data-stream-empty-987',
        logData: [],
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'logs.txt',
      };

      const result = await samplesIndexService.addSamplesToDataStream(mockUser, dataStream);

      expect(result.errors).toBe(false);
      expect(result.items).toHaveLength(0);

      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      const searchResult = await esClient.search({
        index: `${AutomaticImportSamplesIndexName}*`,
        query: {
          match: {
            integration_id: 'integration-empty-543',
          },
        },
      });

      expect(searchResult.hits.total).toEqual({ value: 0, relation: 'eq' });
    });

    it('should verify index mapping is created correctly', async () => {
      const dataStream: DataStreamSamples = {
        integrationId: 'integration-mapping-654',
        dataStreamId: 'data-stream-mapping-321',
        logData: ['Sample log'],
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'logs.txt',
      };

      await samplesIndexService.addSamplesToDataStream(mockUser, dataStream);

      // Wait for index to be created
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      const indices = await esClient.indices.get({
        index: `${AutomaticImportSamplesIndexName}*`,
      });

      const indexName = Object.keys(indices)[0];
      const mapping = indices[indexName].mappings;

      expect(mapping?.properties).toBeDefined();
      expect(mapping?.properties?.integration_id).toBeDefined();
      expect(mapping?.properties?.data_stream_id).toBeDefined();
      expect(mapping?.properties?.created_by).toBeDefined();
      expect(mapping?.properties?.original_filename).toBeDefined();
      expect(mapping?.properties?.log_data).toBeDefined();
      expect(mapping?.properties?.metadata).toBeDefined();
    });
  });

  describe('getSamplesForDataStream', () => {
    it('should retrieve samples for a specific data stream', async () => {
      // Add samples first
      const dataStream: DataStreamSamples = {
        integrationId: 'integration-test',
        dataStreamId: 'data-stream-test',
        logData: ['Log line 1', 'Log line 2', 'Log line 3'],
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'test.txt',
      };

      await samplesIndexService.addSamplesToDataStream(mockUser, dataStream);
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      // Retrieve samples
      const samples = await samplesIndexService.getSamplesForDataStream(
        'integration-test',
        'data-stream-test'
      );

      expect(samples).toHaveLength(3);
      expect(samples).toContain('Log line 1');
      expect(samples).toContain('Log line 2');
      expect(samples).toContain('Log line 3');
    });

    it('should return empty array when no samples exist', async () => {
      const samples = await samplesIndexService.getSamplesForDataStream(
        'non-existent-integration',
        'non-existent-datastream'
      );

      expect(samples).toEqual([]);
    });

    it('should isolate samples between different data streams', async () => {
      // Add samples to first data stream
      const dataStream1: DataStreamSamples = {
        integrationId: 'integration-1',
        dataStreamId: 'data-stream-1',
        logData: ['Log 1 for DS1', 'Log 2 for DS1'],
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'ds1.txt',
      };

      // Add samples to second data stream
      const dataStream2: DataStreamSamples = {
        integrationId: 'integration-1',
        dataStreamId: 'data-stream-2',
        logData: ['Log 1 for DS2', 'Log 2 for DS2', 'Log 3 for DS2'],
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'ds2.txt',
      };

      await samplesIndexService.addSamplesToDataStream(mockUser, dataStream1);
      await samplesIndexService.addSamplesToDataStream(mockUser, dataStream2);
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      // Retrieve samples for each data stream separately
      const samples1 = await samplesIndexService.getSamplesForDataStream(
        'integration-1',
        'data-stream-1'
      );
      const samples2 = await samplesIndexService.getSamplesForDataStream(
        'integration-1',
        'data-stream-2'
      );

      // Verify isolation
      expect(samples1).toHaveLength(2);
      expect(samples1).toContain('Log 1 for DS1');
      expect(samples1).toContain('Log 2 for DS1');
      expect(samples1).not.toContain('Log 1 for DS2');

      expect(samples2).toHaveLength(3);
      expect(samples2).toContain('Log 1 for DS2');
      expect(samples2).toContain('Log 2 for DS2');
      expect(samples2).toContain('Log 3 for DS2');
      expect(samples2).not.toContain('Log 1 for DS1');
    });

    it('should respect 500 sample size limit', async () => {
      // Create a data stream with more than 500 log entries
      const logData = Array.from({ length: 600 }, (_, i) => `Log line ${i}`);
      const dataStream: DataStreamSamples = {
        integrationId: 'integration-large',
        dataStreamId: 'data-stream-large',
        logData,
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'large.txt',
      };

      await samplesIndexService.addSamplesToDataStream(mockUser, dataStream);
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      // Retrieve samples - should be limited to 500
      const samples = await samplesIndexService.getSamplesForDataStream(
        'integration-large',
        'data-stream-large'
      );

      expect(samples).toHaveLength(500);
      expect(samples.every((log) => log.startsWith('Log line'))).toBe(true);
    });
  });

  describe('index lifecycle', () => {
    it('should create index on first document insertion', async () => {
      // Clean up any existing index first by getting actual index names
      try {
        const indices = await esClient.indices.get({
          index: `${AutomaticImportSamplesIndexName}*`,
          ignore_unavailable: true,
        });
        const indexNames = Object.keys(indices);
        if (indexNames.length > 0) {
          for (const indexName of indexNames) {
            await esClient.indices.delete({
              index: indexName,
              ignore_unavailable: true,
            });
          }
          // Wait longer for deletion to complete
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (e) {
        // Index doesn't exist, which is fine
      }

      // Verify we can add documents (index will be created automatically)
      const dataStream: DataStreamSamples = {
        integrationId: 'integration-lifecycle-147',
        dataStreamId: 'data-stream-lifecycle-258',
        logData: ['Sample log'],
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        originalFilename: 'logs.txt',
      };

      const result = await samplesIndexService.addSamplesToDataStream(mockUser, dataStream);
      expect(result.errors).toBe(false);
      expect(result.items).toHaveLength(1);

      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      // Verify index now exists
      const indexExistsAfter = await esClient.indices.exists({
        index: `${AutomaticImportSamplesIndexName}*`,
      });
      expect(indexExistsAfter).toBe(true);

      // Verify the document was created
      const searchResult = await esClient.search({
        index: `${AutomaticImportSamplesIndexName}*`,
        query: {
          match: {
            integration_id: 'integration-lifecycle-147',
          },
        },
      });
      expect(searchResult.hits.total).toEqual({ value: 1, relation: 'eq' });
    });
  });
});
