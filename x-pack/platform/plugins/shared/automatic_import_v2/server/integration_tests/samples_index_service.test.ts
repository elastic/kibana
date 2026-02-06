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
import { AutomaticImportSamplesIndexService, AutomaticImportSamplesIndexName } from '../services';
import type { AddSamplesToDataStreamParams } from '../services/samples_index/index_service';

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

  beforeEach(() => {
    mockUser = {
      username: 'test-user',
      roles: ['admin'],
      profile_uid: 'test-profile-uid',
    } as unknown as AuthenticatedUser;

    samplesIndexService = new AutomaticImportSamplesIndexService(kbnRoot.logger);
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
    it('should create multiple sample documents from rawSamples array', async () => {
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-multi-123',
        dataStreamId: 'data-stream-multi-456',
        rawSamples: ['Sample log line 1', 'Sample log line 2', 'Sample log line 3'],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      const result = await samplesIndexService.addSamplesToDataStream(params);

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
      expect(docs[0].original_source).toEqual({
        source_type: 'file',
        source_value: 'logs.txt',
      });
      expect(docs[0].metadata.created_at).toBeDefined();

      // Check that all three log lines are present
      const logData = docs.map((doc) => doc.log_data).sort();
      expect(logData).toEqual(['Sample log line 1', 'Sample log line 2', 'Sample log line 3']);
    });

    it('should create a single sample document', async () => {
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-single-999',
        dataStreamId: 'data-stream-single-888',
        rawSamples: ['Sample log line 1'],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      const result = await samplesIndexService.addSamplesToDataStream(params);

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
      const adminUser = {
        username: 'admin-user',
        roles: ['admin'],
        profile_uid: 'admin-profile',
      } as unknown as AuthenticatedUser;

      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-auth-777',
        dataStreamId: 'data-stream-auth-666',
        rawSamples: ['Sample log'],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        authenticatedUser: adminUser,
        esClient,
      };

      await samplesIndexService.addSamplesToDataStream(params);

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
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-special-555',
        dataStreamId: 'data-stream-special-444',
        rawSamples: ['Log with "quotes" and \\backslashes\\ and \nnewlines'],
        originalSource: { sourceType: 'file', sourceValue: 'logs with spaces.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      const result = await samplesIndexService.addSamplesToDataStream(params);

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
      expect(doc.original_source).toEqual({
        source_type: 'file',
        source_value: 'logs with spaces.txt',
      });
    });

    it('should create documents with proper timestamp', async () => {
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-time-333',
        dataStreamId: 'data-stream-time-222',
        rawSamples: ['Sample log'],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      const beforeTime = new Date();
      await samplesIndexService.addSamplesToDataStream(params);
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
      const rawSamples = Array.from({ length: 100 }, (_, i) => `Log data for document ${i}`);

      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-batch-111',
        dataStreamId: 'data-stream-batch-000',
        rawSamples,
        originalSource: { sourceType: 'file', sourceValue: 'batch.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      const result = await samplesIndexService.addSamplesToDataStream(params);

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

    it('should handle empty rawSamples array', async () => {
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-empty-543',
        dataStreamId: 'data-stream-empty-987',
        rawSamples: [],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      const result = await samplesIndexService.addSamplesToDataStream(params);

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
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-mapping-654',
        dataStreamId: 'data-stream-mapping-321',
        rawSamples: ['Sample log'],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      await samplesIndexService.addSamplesToDataStream(params);

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
      expect(mapping?.properties?.original_source).toBeDefined();
      expect(mapping?.properties?.log_data).toBeDefined();
      expect(mapping?.properties?.metadata).toBeDefined();
    });
  });

  describe('getSamplesForDataStream', () => {
    it('should retrieve samples for a specific data stream', async () => {
      // Add samples first
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-test',
        dataStreamId: 'data-stream-test',
        rawSamples: ['Log line 1', 'Log line 2', 'Log line 3'],
        originalSource: { sourceType: 'file', sourceValue: 'test.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      await samplesIndexService.addSamplesToDataStream(params);
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      // Retrieve samples
      const samples = await samplesIndexService.getSamplesForDataStream(
        'integration-test',
        'data-stream-test',
        esClient
      );

      expect(samples).toHaveLength(3);
      expect(samples).toContain('Log line 1');
      expect(samples).toContain('Log line 2');
      expect(samples).toContain('Log line 3');
    });

    it('should return empty array when no samples exist', async () => {
      const samples = await samplesIndexService.getSamplesForDataStream(
        'non-existent-integration',
        'non-existent-datastream',
        esClient
      );

      expect(samples).toEqual([]);
    });

    it('should isolate samples between different data streams', async () => {
      // Add samples to first data stream
      const params1: AddSamplesToDataStreamParams = {
        integrationId: 'integration-1',
        dataStreamId: 'data-stream-1',
        rawSamples: ['Log 1 for DS1', 'Log 2 for DS1'],
        originalSource: { sourceType: 'file', sourceValue: 'ds1.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      // Add samples to second data stream
      const params2: AddSamplesToDataStreamParams = {
        integrationId: 'integration-1',
        dataStreamId: 'data-stream-2',
        rawSamples: ['Log 1 for DS2', 'Log 2 for DS2', 'Log 3 for DS2'],
        originalSource: { sourceType: 'file', sourceValue: 'ds2.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      await samplesIndexService.addSamplesToDataStream(params1);
      await samplesIndexService.addSamplesToDataStream(params2);
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      // Retrieve samples for each data stream separately
      const samples1 = await samplesIndexService.getSamplesForDataStream(
        'integration-1',
        'data-stream-1',
        esClient
      );
      const samples2 = await samplesIndexService.getSamplesForDataStream(
        'integration-1',
        'data-stream-2',
        esClient
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
      const rawSamples = Array.from({ length: 600 }, (_, i) => `Log line ${i}`);
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-large',
        dataStreamId: 'data-stream-large',
        rawSamples,
        originalSource: { sourceType: 'file', sourceValue: 'large.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      await samplesIndexService.addSamplesToDataStream(params);
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      // Retrieve samples - should be limited to 500
      const samples = await samplesIndexService.getSamplesForDataStream(
        'integration-large',
        'data-stream-large',
        esClient
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
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-lifecycle-147',
        dataStreamId: 'data-stream-lifecycle-258',
        rawSamples: ['Sample log'],
        originalSource: { sourceType: 'file', sourceValue: 'logs.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      const result = await samplesIndexService.addSamplesToDataStream(params);
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

  describe('deleteSamplesForDataStream', () => {
    it('should delete all samples for a specific data stream', async () => {
      // Add samples first
      const params: AddSamplesToDataStreamParams = {
        integrationId: 'integration-delete-1',
        dataStreamId: 'data-stream-delete-1',
        rawSamples: ['Log line 1', 'Log line 2', 'Log line 3'],
        originalSource: { sourceType: 'file', sourceValue: 'test.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      await samplesIndexService.addSamplesToDataStream(params);
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      // Verify samples exist
      const beforeDelete = await samplesIndexService.getSamplesForDataStream(
        'integration-delete-1',
        'data-stream-delete-1',
        esClient
      );
      expect(beforeDelete).toHaveLength(3);

      // Delete samples
      const result = await samplesIndexService.deleteSamplesForDataStream(
        'integration-delete-1',
        'data-stream-delete-1',
        esClient
      );

      expect(result.deleted).toBe(3);

      // Verify samples are deleted
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });
      const afterDelete = await samplesIndexService.getSamplesForDataStream(
        'integration-delete-1',
        'data-stream-delete-1',
        esClient
      );
      expect(afterDelete).toHaveLength(0);
    });

    it('should return zero when no samples exist', async () => {
      const result = await samplesIndexService.deleteSamplesForDataStream(
        'non-existent-integration',
        'non-existent-datastream',
        esClient
      );

      expect(result.deleted).toBe(0);
    });

    it('should only delete samples for the specified data stream', async () => {
      // Add samples to first data stream
      const params1: AddSamplesToDataStreamParams = {
        integrationId: 'integration-isolate-1',
        dataStreamId: 'data-stream-isolate-1',
        rawSamples: ['Log 1 for DS1', 'Log 2 for DS1'],
        originalSource: { sourceType: 'file', sourceValue: 'ds1.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      // Add samples to second data stream
      const params2: AddSamplesToDataStreamParams = {
        integrationId: 'integration-isolate-1',
        dataStreamId: 'data-stream-isolate-2',
        rawSamples: ['Log 1 for DS2', 'Log 2 for DS2', 'Log 3 for DS2'],
        originalSource: { sourceType: 'file', sourceValue: 'ds2.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      await samplesIndexService.addSamplesToDataStream(params1);
      await samplesIndexService.addSamplesToDataStream(params2);
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      // Delete samples from first data stream only
      const result = await samplesIndexService.deleteSamplesForDataStream(
        'integration-isolate-1',
        'data-stream-isolate-1',
        esClient
      );

      expect(result.deleted).toBe(2);

      // Verify first data stream is empty
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });
      const samples1 = await samplesIndexService.getSamplesForDataStream(
        'integration-isolate-1',
        'data-stream-isolate-1',
        esClient
      );
      expect(samples1).toHaveLength(0);

      // Verify second data stream still has samples
      const samples2 = await samplesIndexService.getSamplesForDataStream(
        'integration-isolate-1',
        'data-stream-isolate-2',
        esClient
      );
      expect(samples2).toHaveLength(3);
      expect(samples2).toContain('Log 1 for DS2');
      expect(samples2).toContain('Log 2 for DS2');
      expect(samples2).toContain('Log 3 for DS2');
    });

    it('should isolate samples between different integrations', async () => {
      // Add samples to first integration
      const params1: AddSamplesToDataStreamParams = {
        integrationId: 'integration-iso-1',
        dataStreamId: 'data-stream-iso',
        rawSamples: ['Log 1 for Int1', 'Log 2 for Int1'],
        originalSource: { sourceType: 'file', sourceValue: 'int1.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      // Add samples to second integration with same data stream ID
      const params2: AddSamplesToDataStreamParams = {
        integrationId: 'integration-iso-2',
        dataStreamId: 'data-stream-iso',
        rawSamples: ['Log 1 for Int2', 'Log 2 for Int2', 'Log 3 for Int2'],
        originalSource: { sourceType: 'file', sourceValue: 'int2.txt' },
        authenticatedUser: mockUser,
        esClient,
      };

      await samplesIndexService.addSamplesToDataStream(params1);
      await samplesIndexService.addSamplesToDataStream(params2);
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });

      // Delete samples from first integration only
      const result = await samplesIndexService.deleteSamplesForDataStream(
        'integration-iso-1',
        'data-stream-iso',
        esClient
      );

      expect(result.deleted).toBe(2);

      // Verify first integration's samples are deleted
      await esClient.indices.refresh({ index: `${AutomaticImportSamplesIndexName}*` });
      const samples1 = await samplesIndexService.getSamplesForDataStream(
        'integration-iso-1',
        'data-stream-iso',
        esClient
      );
      expect(samples1).toHaveLength(0);

      // Verify second integration's samples still exist
      const samples2 = await samplesIndexService.getSamplesForDataStream(
        'integration-iso-2',
        'data-stream-iso',
        esClient
      );
      expect(samples2).toHaveLength(3);
    });
  });
});
