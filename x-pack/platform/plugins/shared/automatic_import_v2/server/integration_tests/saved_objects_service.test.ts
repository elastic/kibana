/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  AuthenticatedUser,
  SavedObjectsClient,
} from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AutomaticImportSavedObjectService } from '../services/saved_objects/saved_objects_service';
import {
  DATA_STREAM_SAVED_OBJECT_TYPE,
  INTEGRATION_SAVED_OBJECT_TYPE,
  TASK_STATUSES,
} from '../services/saved_objects/constants';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import type { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import { integrationSavedObjectType } from '../services/saved_objects/integration';
import { dataStreamSavedObjectType } from '../services/saved_objects/data_stream';
import {
  mockAuthenticatedUser,
  mockIntegrationParams,
  mockDataStreamParams,
} from '../__mocks__/saved_objects';
import type { IntegrationParams, DataStreamParams } from '../routes/types';

describe('AutomaticImportSavedObjectService', () => {
  let authenticatedUser: AuthenticatedUser;
  let manageES: TestElasticsearchUtils;
  let coreStart: InternalCoreStart;
  let kbnRoot: ReturnType<typeof createRootWithCorePlugins>;

  beforeAll(async () => {
    try {
      const { startES } = createTestServers({
        adjustTimeout: jest.setTimeout,
      });
      manageES = await startES();
      kbnRoot = createRootWithCorePlugins({}, { oss: false });
      await kbnRoot.preboot();
      const coreSetup = await kbnRoot.setup();
      coreSetup.savedObjects.registerType(integrationSavedObjectType);
      coreSetup.savedObjects.registerType(dataStreamSavedObjectType);
      coreStart = await kbnRoot.start();
    } catch (error) {
      if (kbnRoot) {
        await kbnRoot.shutdown().catch(() => {});
      }
      if (manageES) {
        await manageES.stop().catch(() => {});
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (kbnRoot) {
      await kbnRoot.shutdown().catch(() => {});
    }
    if (manageES) {
      await manageES.stop().catch(() => {});
    }
  });

  beforeEach(() => {
    authenticatedUser = mockAuthenticatedUser;
  });

  describe('Constructor', () => {
    it('should initialize AutomaticImportSavedObjectService with provided savedObjectsClient and logger', () => {
      const mockSavedObjectsClient =
        savedObjectsClientMock.create() as unknown as SavedObjectsClient;
      const mockLoggerFactory = loggerMock.create();
      const newService = new AutomaticImportSavedObjectService(
        mockLoggerFactory,
        mockSavedObjectsClient
      );

      expect(newService).toBeInstanceOf(AutomaticImportSavedObjectService);
    });
  });

  describe('Integration Operations - Integration Tests', () => {
    let savedObjectsClient: SavedObjectsClientContract;
    let savedObjectService: AutomaticImportSavedObjectService;

    beforeEach(async () => {
      // Instantiate the service with the saved objects client from the running Kibana instance
      const internalRepo = coreStart.savedObjects.createInternalRepository();
      savedObjectsClient = internalRepo as SavedObjectsClientContract;

      const mockLoggerFactory = loggerMock.create();
      savedObjectService = new AutomaticImportSavedObjectService(
        mockLoggerFactory,
        savedObjectsClient as unknown as SavedObjectsClient
      );
    });

    describe('insertIntegration', () => {
      it('should create integration with service-managed defaults', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-integration-1',
        };
        const result = await savedObjectService.insertIntegration(
          integrationParams,
          authenticatedUser
        );

        expect(result.id).toBe('test-integration-1');
        expect(result.attributes.created_by).toBe('test-user');
        expect(result.attributes.metadata?.created_at).toBeDefined();
        expect(result.attributes.metadata?.version).toBe('0.0.0');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-integration-1');
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: '',
        };

        await expect(
          savedObjectService.insertIntegration(invalidParams, authenticatedUser)
        ).rejects.toThrow();
      });

      it('should throw error when integration already exists', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'duplicate-integration',
        };

        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        // Try to create duplicate
        await expect(
          savedObjectService.insertIntegration(integrationParams, authenticatedUser)
        ).rejects.toThrow('Integration duplicate-integration already exists');

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'duplicate-integration');
      });
    });

    describe('getIntegration', () => {
      it('should retrieve an existing integration', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-get-integration',
          title: 'Get Test Integration',
        };
        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        const result = await savedObjectService.getIntegration('test-get-integration');

        expect(result.integration_id).toBe('test-get-integration');
        expect(result.metadata?.title).toBe('Get Test Integration');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-get-integration');
      });

      it('should throw error when integration does not exist', async () => {
        await expect(
          savedObjectService.getIntegration('non-existent-integration')
        ).rejects.toThrow();
      });
    });

    describe('updateIntegration', () => {
      const baseMetadata = { title: 'Test Integration', description: 'Test description' };

      it('should update an existing integration', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-update-integration',
          title: 'Original Title',
        };
        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        const updateData = {
          integration_id: 'test-update-integration',
          data_stream_count: 3,
          created_by: 'test-user',
          status: TASK_STATUSES.completed,
          metadata: { ...baseMetadata, title: 'Updated Title' },
        };
        const result = await savedObjectService.updateIntegration(updateData, '0.0.0');

        expect(result.attributes.data_stream_count).toBe(3);
        expect(result.attributes.status).toBe(TASK_STATUSES.completed);
        expect(result.attributes.metadata?.version).toBe('0.0.1');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-update-integration');
      });

      it('should increment version on update', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-version-integration',
        };
        const updateData = {
          integration_id: 'test-version-integration',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: baseMetadata,
        };

        // Create integration
        const created = await savedObjectService.insertIntegration(
          integrationParams,
          authenticatedUser
        );
        expect(created.attributes.metadata?.version).toBe('0.0.0');

        // First update
        const firstUpdate = await savedObjectService.updateIntegration(
          { ...updateData, data_stream_count: 2 },
          '0.0.0'
        );
        expect(firstUpdate.attributes.metadata?.version).toBe('0.0.1');

        // Second update
        const secondUpdate = await savedObjectService.updateIntegration(
          { ...updateData, data_stream_count: 3 },
          '0.0.1'
        );
        expect(secondUpdate.attributes.metadata?.version).toBe('0.0.2');

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-version-integration');
      });

      it('should throw error when integration does not exist', async () => {
        const updateData = {
          integration_id: 'non-existent-integration',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: baseMetadata,
        };

        await expect(savedObjectService.updateIntegration(updateData, '0.0.0')).rejects.toThrow();
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = {
          integration_id: '',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: baseMetadata,
        };

        await expect(savedObjectService.updateIntegration(invalidData, '0.0.0')).rejects.toThrow(
          'Integration ID is required'
        );
      });

      it('should throw version conflict when expectedVersion does not match', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-app-version-conflict',
        };
        const updateData = {
          integration_id: 'test-app-version-conflict',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: baseMetadata,
        };

        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        await savedObjectService.updateIntegration(
          { ...updateData, data_stream_count: 2 },
          '0.0.0'
        );

        // Meta data version increments automatically as patch version
        await expect(
          savedObjectService.updateIntegration({ ...updateData, data_stream_count: 3 }, '0.0.0')
        ).rejects.toThrow(
          'Version conflict: Integration test-app-version-conflict has been updated. Expected version 0.0.0, but current version is 0.0.1'
        );

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-app-version-conflict');
      });

      it('should increment major version', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-major-version',
        };
        const updateData = {
          integration_id: 'test-major-version',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: baseMetadata,
        };

        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        const updated = await savedObjectService.updateIntegration(
          { ...updateData, data_stream_count: 2 },
          '0.0.0',
          'major'
        );

        expect(updated.attributes.metadata?.version).toBe('1.0.0');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-major-version');
      });

      it('should increment minor version', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-minor-version',
        };
        const updateData = {
          integration_id: 'test-minor-version',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: baseMetadata,
        };

        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        const updated = await savedObjectService.updateIntegration(
          { ...updateData, data_stream_count: 2 },
          '0.0.0',
          'minor'
        );

        expect(updated.attributes.metadata?.version).toBe('0.1.0');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-minor-version');
      });

      it('should reset minor and patch when incrementing major version', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-major-reset',
        };
        const updateData = {
          integration_id: 'test-major-reset',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: baseMetadata,
        };

        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        await savedObjectService.updateIntegration({ ...updateData }, '0.0.0', 'minor');

        await savedObjectService.updateIntegration({ ...updateData }, '0.1.0', 'patch');

        const updated = await savedObjectService.updateIntegration(
          { ...updateData },
          '0.1.1',
          'major'
        );

        expect(updated.attributes.metadata?.version).toBe('1.0.0');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-major-reset');
      });

      it('should reset patch when incrementing minor version', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-minor-reset',
        };
        const updateData = {
          integration_id: 'test-minor-reset',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: baseMetadata,
        };

        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        await savedObjectService.updateIntegration({ ...updateData }, '0.0.0', 'patch');

        await savedObjectService.updateIntegration({ ...updateData }, '0.0.1', 'patch');

        const updated = await savedObjectService.updateIntegration(
          { ...updateData },
          '0.0.2',
          'minor'
        );

        expect(updated.attributes.metadata?.version).toBe('0.1.0');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-minor-reset');
      });
    });

    describe('getAllIntegrations', () => {
      it('should retrieve all integrations', async () => {
        // Create multiple integrations
        const integrationParams1: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-getall-1',
        };

        const integrationParams2: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-getall-2',
        };

        try {
          await savedObjectService.insertIntegration(integrationParams1, authenticatedUser);
          await savedObjectService.insertIntegration(integrationParams2, authenticatedUser);

          const result = await savedObjectService.getAllIntegrations();

          expect(result.length).toBeGreaterThanOrEqual(2);
          const ids = result.map((obj) => obj.integration_id);
          expect(ids).toContain('test-getall-1');
          expect(ids).toContain('test-getall-2');
        } finally {
          await savedObjectsClient
            .delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-getall-1')
            .catch(() => {});
          await savedObjectsClient
            .delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-getall-2')
            .catch(() => {});
        }
      });

      it('should return empty array when no integrations exist', async () => {
        const existing = await savedObjectService.getAllIntegrations();
        for (const integration of existing) {
          await savedObjectsClient
            .delete(INTEGRATION_SAVED_OBJECT_TYPE, integration.integration_id)
            .catch(() => {});
        }

        const result = await savedObjectService.getAllIntegrations();

        expect(result.length).toBe(0);
      });
    });

    describe('deleteIntegration - cascade deletion', () => {
      it('should cascade delete integration and all associated data streams', async () => {
        const integrationId = 'test-cascade-delete-integration';

        // Create integration for testing cascade deletion
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId,
        };
        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        const createDataStreamParams = (dsId: string, jobId: string): DataStreamParams => ({
          ...mockDataStreamParams,
          integrationId,
          dataStreamId: dsId,
          jobInfo: {
            jobId,
            jobType: 'import',
            status: TASK_STATUSES.pending,
          },
        });

        await savedObjectService.insertDataStream(
          createDataStreamParams('test-cascade-ds-1', 'job-1'),
          authenticatedUser
        );

        await savedObjectService.insertDataStream(
          createDataStreamParams('test-cascade-ds-2', 'job-2'),
          authenticatedUser
        );

        await savedObjectService.insertDataStream(
          createDataStreamParams('test-cascade-ds-3', 'job-3'),
          authenticatedUser
        );

        // Verify 3 data streams exist
        const dataStreamsBefore = await savedObjectService.findAllDataStreamsByIntegrationId(
          integrationId
        );
        expect(dataStreamsBefore.total).toBe(3);

        const result = await savedObjectService.deleteIntegration(integrationId);

        expect(result.dataStreamsDeleted).toBe(3);

        await expect(savedObjectService.getIntegration(integrationId)).rejects.toThrow();

        await expect(
          savedObjectService.getDataStream('test-cascade-ds-1', integrationId)
        ).rejects.toThrow();
        await expect(
          savedObjectService.getDataStream('test-cascade-ds-2', integrationId)
        ).rejects.toThrow();
        await expect(
          savedObjectService.getDataStream('test-cascade-ds-3', integrationId)
        ).rejects.toThrow();
      });

      it('should throw error when deleting non-existent integration', async () => {
        await expect(
          savedObjectService.deleteIntegration('non-existent-integration')
        ).rejects.toThrow();
      });
    });
  });

  describe('Data Stream Operations - Integration Tests', () => {
    let savedObjectsClient: SavedObjectsClientContract;
    let savedObjectService: AutomaticImportSavedObjectService;

    beforeEach(async () => {
      const internalRepo = coreStart.savedObjects.createInternalRepository();
      savedObjectsClient = internalRepo as SavedObjectsClientContract;

      const mockLoggerFactory = loggerMock.create();
      savedObjectService = new AutomaticImportSavedObjectService(
        mockLoggerFactory,
        savedObjectsClient as unknown as SavedObjectsClient
      );
    });

    describe('insertDataStream', () => {
      it('should create a new data stream with existing integration', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'test-ds-integration-1',
        };
        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        const dataStreamParams: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId: 'test-ds-integration-1',
          dataStreamId: 'test-data-stream-1',
          metadata: { ...mockDataStreamParams.metadata, sampleCount: 100 },
        };
        const result = await savedObjectService.insertDataStream(
          dataStreamParams,
          authenticatedUser
        );

        expect(result.id).toBe('test-ds-integration-1-test-data-stream-1');
        expect(result.attributes.data_stream_id).toBe('test-data-stream-1');
        expect(result.attributes.integration_id).toBe('test-ds-integration-1');
        expect(result.attributes.created_by).toBe('test-user');
        expect(result.attributes.metadata?.created_at).toBeDefined();
        expect(result.attributes.metadata?.version).toBe('0.0.0');

        await savedObjectsClient.delete(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          'test-ds-integration-1-test-data-stream-1'
        );
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-ds-integration-1');
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidParams: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId: '',
          dataStreamId: 'test-ds',
        };

        await expect(
          savedObjectService.insertDataStream(invalidParams, authenticatedUser)
        ).rejects.toThrow('Integration ID is required');
      });

      it('should throw error when data_stream_id is missing', async () => {
        const invalidParams: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId: 'test-integration',
          dataStreamId: '',
        };

        await expect(
          savedObjectService.insertDataStream(invalidParams, authenticatedUser)
        ).rejects.toThrow('Data stream ID is required');
      });

      it('should throw error when data stream already exists', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'duplicate-ds-integration',
          title: 'Integration Duplicate DS',
        };
        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        const dataStreamParams: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId: 'duplicate-ds-integration',
          dataStreamId: 'duplicate-data-stream',
          jobInfo: {
            jobId: 'job-dup',
            jobType: 'import',
            status: TASK_STATUSES.pending,
          },
        };

        await savedObjectService.insertDataStream(dataStreamParams, authenticatedUser);

        // Try to create duplicate
        await expect(
          savedObjectService.insertDataStream(dataStreamParams, authenticatedUser)
        ).rejects.toThrow('Data stream duplicate-data-stream already exists');

        // Cleanup
        await savedObjectsClient.delete(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          'duplicate-ds-integration-duplicate-data-stream'
        );
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'duplicate-ds-integration');
      });
    });

    describe('getDataStream', () => {
      it('should retrieve an existing data stream', async () => {
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'get-ds-integration',
          title: 'Get DS Integration',
        };
        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        const dataStreamParams: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId: 'get-ds-integration',
          dataStreamId: 'test-get-data-stream',
          jobInfo: {
            jobId: 'get-job',
            jobType: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: { sampleCount: 200, createdAt: new Date().toISOString() },
        };
        await savedObjectService.insertDataStream(dataStreamParams, authenticatedUser);

        const result = await savedObjectService.getDataStream(
          'test-get-data-stream',
          'get-ds-integration'
        );

        expect(result.id).toBe('get-ds-integration-test-get-data-stream');
        expect(result.attributes.data_stream_id).toBe('test-get-data-stream');
        expect(result.attributes.integration_id).toBe('get-ds-integration');
        expect(result.attributes.metadata?.sample_count).toBe(200);

        await savedObjectsClient.delete(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          'get-ds-integration-test-get-data-stream'
        );
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'get-ds-integration');
      });

      it('should throw error when data stream does not exist', async () => {
        await expect(
          savedObjectService.getDataStream('non-existent-data-stream', 'non-existent-integration')
        ).rejects.toThrow();
      });

      it('should handle data streams with same ID in different integrations', async () => {
        const sharedDataStreamId = 'logs';

        // Create two different integrations
        const integration1Params: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'integration-1',
          title: 'Integration One',
        };
        const integration2Params: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId: 'integration-2',
          title: 'Integration Two',
        };

        await savedObjectService.insertIntegration(integration1Params, authenticatedUser);
        await savedObjectService.insertIntegration(integration2Params, authenticatedUser);

        // Create data stream with same ID in integration-1
        const dataStream1Params: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId: 'integration-1',
          dataStreamId: sharedDataStreamId,
          title: 'Logs from Integration 1',
          jobInfo: {
            jobId: 'job-int1',
            jobType: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sampleCount: 100, createdAt: new Date().toISOString() },
        };

        // Create data stream with same ID in integration-2
        const dataStream2Params: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId: 'integration-2',
          dataStreamId: sharedDataStreamId,
          title: 'Logs from Integration 2',
          jobInfo: {
            jobId: 'job-int2',
            jobType: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: { sampleCount: 200, createdAt: new Date().toISOString() },
        };

        await savedObjectService.insertDataStream(dataStream1Params, authenticatedUser);
        await savedObjectService.insertDataStream(dataStream2Params, authenticatedUser);

        // Retrieve both data streams and verify they're different
        const result1 = await savedObjectService.getDataStream(sharedDataStreamId, 'integration-1');
        expect(result1.id).toBe('integration-1-logs');
        expect(result1.attributes.integration_id).toBe('integration-1');
        expect(result1.attributes.data_stream_id).toBe(sharedDataStreamId);
        expect(result1.attributes.title).toBe('Logs from Integration 1');
        expect(result1.attributes.metadata?.sample_count).toBe(100);
        expect(result1.attributes.job_info?.status).toBe(TASK_STATUSES.pending);

        const result2 = await savedObjectService.getDataStream(sharedDataStreamId, 'integration-2');
        expect(result2.id).toBe('integration-2-logs');
        expect(result2.attributes.integration_id).toBe('integration-2');
        expect(result2.attributes.data_stream_id).toBe(sharedDataStreamId);
        expect(result2.attributes.title).toBe('Logs from Integration 2');

        // Get all data streams for each integration to verify isolation
        const int1DataStreams = await savedObjectService.getAllDataStreams('integration-1');
        const int2DataStreams = await savedObjectService.getAllDataStreams('integration-2');

        expect(int1DataStreams).toHaveLength(1);
        expect(int1DataStreams[0].data_stream_id).toBe(sharedDataStreamId);
        expect(int1DataStreams[0].title).toBe('Logs from Integration 1');

        expect(int2DataStreams).toHaveLength(1);
        expect(int2DataStreams[0].data_stream_id).toBe(sharedDataStreamId);
        expect(int2DataStreams[0].title).toBe('Logs from Integration 2');

        // Cleanup
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'integration-1-logs');
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'integration-2-logs');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'integration-1');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'integration-2');
      });
    });

    describe('getAllDataStreams', () => {
      it('should retrieve all data streams', async () => {
        // Create multiple data streams
        const dataStreamParams1: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId: 'getall-ds-integration',
          dataStreamId: 'test-getall-ds-1',
          jobInfo: {
            jobId: 'job-1',
            jobType: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sampleCount: 100, createdAt: new Date().toISOString() },
        };

        const dataStreamParams2: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId: 'getall-ds-integration',
          dataStreamId: 'test-getall-ds-2',
          jobInfo: {
            jobId: 'job-2',
            jobType: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: { sampleCount: 200, createdAt: new Date().toISOString() },
        };

        try {
          await savedObjectService.insertDataStream(dataStreamParams1, authenticatedUser);
          await savedObjectService.insertDataStream(dataStreamParams2, authenticatedUser);

          const result = await savedObjectService.getAllDataStreams('getall-ds-integration');

          // Check that we have at least the 2 data streams we created
          expect(result.length).toBeGreaterThanOrEqual(2);
          const ids = result.map((obj) => obj.data_stream_id);
          expect(ids).toContain('test-getall-ds-1');
          expect(ids).toContain('test-getall-ds-2');
        } finally {
          await savedObjectsClient
            .delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'getall-ds-integration-test-getall-ds-1')
            .catch(() => {});
          await savedObjectsClient
            .delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'getall-ds-integration-test-getall-ds-2')
            .catch(() => {});
          await savedObjectsClient
            .delete(INTEGRATION_SAVED_OBJECT_TYPE, 'getall-ds-integration')
            .catch(() => {});
        }
      });
    });

    describe('findAllDataStreamsByIntegrationId', () => {
      it('should find all data streams for a specific integration', async () => {
        const integrationId = 'find-by-integration-id';

        // Create integration first
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId,
        };
        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        // Create data streams for this integration
        const dataStreamParams1: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId,
          dataStreamId: 'test-find-ds-1',
          jobInfo: {
            jobId: 'job-1',
            jobType: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sampleCount: 100, createdAt: new Date().toISOString() },
        };

        const dataStreamParams2: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId,
          dataStreamId: 'test-find-ds-2',
          jobInfo: {
            jobId: 'job-2',
            jobType: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: { sampleCount: 200, createdAt: new Date().toISOString() },
        };

        await savedObjectService.insertDataStream(dataStreamParams1, authenticatedUser);
        await savedObjectService.insertDataStream(dataStreamParams2, authenticatedUser);

        // Find data streams by integration ID
        const result = await savedObjectService.findAllDataStreamsByIntegrationId(integrationId);

        expect(result.total).toBe(2);
        result.saved_objects.forEach((obj) => {
          expect(obj.attributes.integration_id).toBe(integrationId);
        });
        const ids = result.saved_objects.map((obj) => obj.id);
        expect(ids).toContain(`${integrationId}-test-find-ds-1`);
        expect(ids).toContain(`${integrationId}-test-find-ds-2`);

        // Cleanup
        await savedObjectsClient.delete(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          `${integrationId}-test-find-ds-1`
        );
        await savedObjectsClient.delete(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          `${integrationId}-test-find-ds-2`
        );
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, integrationId);
      });

      it('should return empty results when integration has no data streams', async () => {
        const result = await savedObjectService.findAllDataStreamsByIntegrationId(
          'non-existent-integration'
        );

        expect(result.total).toBe(0);
        expect(result.saved_objects).toEqual([]);
      });
    });

    describe('deleteDataStream', () => {
      it('should delete an existing data stream and decrement data stream count in corresponding integration', async () => {
        const integrationId = 'delete-ds-integration';

        // setup a new integration
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId,
        };
        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        const dataStreamParams: DataStreamParams = {
          ...mockDataStreamParams,
          integrationId,
          dataStreamId: 'test-delete-data-stream',
          jobInfo: {
            jobId: 'delete-job',
            jobType: 'import',
            status: TASK_STATUSES.pending,
          },
        };
        await savedObjectService.insertDataStream(dataStreamParams, authenticatedUser);

        await savedObjectService.deleteDataStream(integrationId, 'test-delete-data-stream');
        await expect(
          savedObjectService.getDataStream('test-delete-data-stream', integrationId)
        ).rejects.toThrow();

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, integrationId);
      });

      it('should correctly add and delete data streams', async () => {
        const integrationId = 'delete-multiple-ds-integration';

        // Create integration
        const integrationParams: IntegrationParams = {
          ...mockIntegrationParams,
          integrationId,
        };
        await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

        const createDataStreamParams = (dsId: string, jobId: string): DataStreamParams => ({
          ...mockDataStreamParams,
          integrationId,
          dataStreamId: dsId,
          jobInfo: {
            jobId,
            jobType: 'import',
            status: TASK_STATUSES.pending,
          },
        });

        // Create 3 data streams
        await savedObjectService.insertDataStream(
          createDataStreamParams('test-delete-ds-1', 'job-1'),
          authenticatedUser
        );

        await savedObjectService.insertDataStream(
          createDataStreamParams('test-delete-ds-2', 'job-2'),
          authenticatedUser
        );

        await savedObjectService.insertDataStream(
          createDataStreamParams('test-delete-ds-3', 'job-3'),
          authenticatedUser
        );

        // Delete one data stream
        await savedObjectService.deleteDataStream(integrationId, 'test-delete-ds-2');

        // Delete another data stream
        await savedObjectService.deleteDataStream(integrationId, 'test-delete-ds-1');

        // Cleanup
        await savedObjectsClient.delete(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          `${integrationId}-test-delete-ds-3`
        );
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, integrationId);
      });

      it('should throw error when deleting non-existent data stream', async () => {
        await expect(
          savedObjectService.deleteDataStream(
            'non-existent-integration',
            'non-existent-data-stream'
          )
        ).rejects.toThrow();
      });
    });
  });

  describe('Integration and Data Stream Interactions Tests', () => {
    let savedObjectsClient: SavedObjectsClientContract;
    let savedObjectService: AutomaticImportSavedObjectService;

    beforeEach(async () => {
      const internalRepo = coreStart.savedObjects.createInternalRepository();
      savedObjectsClient = internalRepo as unknown as SavedObjectsClientContract;

      const mockLoggerFactory = loggerMock.create();
      savedObjectService = new AutomaticImportSavedObjectService(
        mockLoggerFactory,
        savedObjectsClient as unknown as SavedObjectsClient
      );
    });

    it('should handle complete workflow: create integration, add data streams, update, and query', async () => {
      const integrationId = 'workflow-integration';

      const integrationParams: IntegrationParams = {
        ...mockIntegrationParams,
        integrationId,
        title: 'Workflow Test Integration',
      };
      const createdIntegration = await savedObjectService.insertIntegration(
        integrationParams,
        authenticatedUser
      );
      expect(createdIntegration.attributes.status).toBe(TASK_STATUSES.pending);

      const dataStreamParams1: DataStreamParams = {
        ...mockDataStreamParams,
        integrationId,
        dataStreamId: 'workflow-ds-1',
        jobInfo: {
          jobId: 'workflow-job-1',
          jobType: 'import',
          status: TASK_STATUSES.processing,
        },
        metadata: { sampleCount: 100, createdAt: new Date().toISOString() },
      };
      const createdDataStream1 = await savedObjectService.insertDataStream(
        dataStreamParams1,
        authenticatedUser
      );

      const dataStreamParams2: DataStreamParams = {
        ...mockDataStreamParams,
        integrationId,
        dataStreamId: 'workflow-ds-2',
        jobInfo: {
          jobId: 'workflow-job-2',
          jobType: 'import',
          status: TASK_STATUSES.processing,
        },
        metadata: { sampleCount: 150, createdAt: new Date().toISOString() },
      };
      const createdDataStream2 = await savedObjectService.insertDataStream(
        dataStreamParams2,
        authenticatedUser
      );

      const dataStream1 = await savedObjectService.getDataStream('workflow-ds-1', integrationId);
      expect(dataStream1.attributes.data_stream_id).toBe('workflow-ds-1');

      const dataStreams = await savedObjectService.findAllDataStreamsByIntegrationId(integrationId);
      expect(dataStreams.total).toBe(2);

      const integration = await savedObjectService.getIntegration(integrationId);
      await savedObjectService.updateIntegration(
        {
          integration_id: integrationId,
          data_stream_count: 2,
          created_by: 'test-user',
          status: TASK_STATUSES.completed,
          metadata: {
            title: 'Workflow Test Integration - Completed',
            description: 'Workflow integration description',
          },
        },
        integration.metadata?.version || '0.0.0'
      );

      const finalIntegration = await savedObjectService.getIntegration(integrationId);
      expect(finalIntegration.status).toBe(TASK_STATUSES.completed);
      expect(finalIntegration.data_stream_count).toBe(2);

      await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, createdDataStream1.id);
      await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, createdDataStream2.id);
      await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, integrationId);
    });
  });

  describe('updateDataStreamSavedObjectAttributes', () => {
    let savedObjectsClient: SavedObjectsClientContract;
    let savedObjectService: AutomaticImportSavedObjectService;

    beforeEach(async () => {
      const internalRepo = coreStart.savedObjects.createInternalRepository();
      savedObjectsClient = internalRepo as SavedObjectsClientContract;

      const mockLoggerFactory = loggerMock.create();
      savedObjectService = new AutomaticImportSavedObjectService(
        mockLoggerFactory,
        savedObjectsClient as unknown as SavedObjectsClient
      );
    });

    it('should update data stream saved object attributes with ingest pipeline and status', async () => {
      // Create integration first
      const integrationParams: IntegrationParams = {
        ...mockIntegrationParams,
        integrationId: 'test-update-ds-integration',
      };
      await savedObjectService.insertIntegration(integrationParams, authenticatedUser);

      // Create data stream
      const dataStreamParams: DataStreamParams = {
        ...mockDataStreamParams,
        integrationId: 'test-update-ds-integration',
        dataStreamId: 'test-update-ds',
        jobInfo: {
          jobId: 'test-job-id',
          jobType: 'autoImport-dataStream-task',
          status: TASK_STATUSES.pending,
        },
      };
      await savedObjectService.insertDataStream(dataStreamParams, authenticatedUser);

      // Verify initial state
      const initialDataStream = await savedObjectService.getDataStream(
        'test-update-ds',
        'test-update-ds-integration'
      );
      expect(initialDataStream.attributes.job_info.status).toBe(TASK_STATUSES.pending);
      expect(initialDataStream.attributes.result).toBeUndefined();

      // Update the data stream with ingest pipeline and completed status
      const ingestPipeline = JSON.stringify({
        processors: [
          {
            set: {
              field: 'processed',
              value: true,
            },
          },
        ],
      });

      await savedObjectService.updateDataStreamSavedObjectAttributes({
        integrationId: 'test-update-ds-integration',
        dataStreamId: 'test-update-ds',
        ingestPipeline,
        status: TASK_STATUSES.completed,
      });

      // Verify the update
      const updatedDataStream = await savedObjectService.getDataStream(
        'test-update-ds',
        'test-update-ds-integration'
      );
      expect(updatedDataStream.attributes.job_info.status).toBe(TASK_STATUSES.completed);
      expect(updatedDataStream.attributes.result).toBeDefined();
      expect(updatedDataStream.attributes.result?.ingest_pipeline).toBe(ingestPipeline);

      // Cleanup
      await savedObjectsClient.delete(
        DATA_STREAM_SAVED_OBJECT_TYPE,
        'test-update-ds-integration-test-update-ds'
      );
      await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-update-ds-integration');
    });

    it('should throw error when integration ID is missing', async () => {
      await expect(
        savedObjectService.updateDataStreamSavedObjectAttributes({
          integrationId: '',
          dataStreamId: 'test-ds',
          ingestPipeline: '{}',
          status: TASK_STATUSES.completed,
        })
      ).rejects.toThrow('Integration ID is required');
    });

    it('should throw error when data stream ID is missing', async () => {
      await expect(
        savedObjectService.updateDataStreamSavedObjectAttributes({
          integrationId: 'test-integration',
          dataStreamId: '',
          ingestPipeline: '{}',
          status: TASK_STATUSES.completed,
        })
      ).rejects.toThrow('Data stream ID is required');
    });

    it('should throw error when data stream does not exist', async () => {
      await expect(
        savedObjectService.updateDataStreamSavedObjectAttributes({
          integrationId: 'non-existent-integration',
          dataStreamId: 'non-existent-ds',
          ingestPipeline: '{}',
          status: TASK_STATUSES.completed,
        })
      ).rejects.toThrow('Data stream non-existent-ds not found');
    });
  });
});
