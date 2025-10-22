/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  SavedObjectsClientContract,
  Logger,
} from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AutomaticImportSavedObjectService } from '../saved_objects_service';
import type { IntegrationAttributes, DataStreamAttributes } from '../schemas/types';
import {
  DATA_STREAM_SAVED_OBJECT_TYPE,
  INTEGRATION_SAVED_OBJECT_TYPE,
  TASK_STATUSES,
} from '../constants';
import { createRootWithCorePlugins, createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { InternalCoreStart } from '@kbn/core/packages/lifecycle/server-internal';
import { integrationSavedObjectType } from '../integration';
import { dataStreamSavedObjectType } from '../data_stream';

describe('AutomaticImportSavedObjectService', () => {
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockLogger: jest.Mocked<Logger>;
  let manageES: TestElasticsearchUtils;
  let coreStart: InternalCoreStart;
  let kbnRoot: ReturnType<typeof createRootWithCorePlugins>;

  beforeAll(async () => {
    try {
      const { startES } = createTestServers({
        adjustTimeout: jest.setTimeout
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
        await kbnRoot.shutdown().catch(() => { });
      }
      if (manageES) {
        await manageES.stop().catch(() => { });
      }
      throw error;
    }
  });

  afterAll(async () => {
    if (kbnRoot) {
      await kbnRoot.shutdown().catch((err) => {
        console.error('Error shutting down Kibana:', err.message);
      });
    }
    if (manageES) {
      await manageES.stop().catch((err) => {
        console.error('Error stopping ES:', err.message);
      });
    }
  });

  beforeEach(() => {
    mockLogger = loggerMock.create();
  });


  describe('Constructor', () => {
    it('should initialize AutomaticImportSavedObjectService with provided savedObjectsClient and logger', () => {
      mockSavedObjectsClient = savedObjectsClientMock.create();
      const newService = new AutomaticImportSavedObjectService({
        savedObjectsClient: mockSavedObjectsClient,
        logger: mockLogger,
      });

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

      savedObjectService = new AutomaticImportSavedObjectService({
        savedObjectsClient: savedObjectsClient,
        logger: mockLogger,
      });
    });

    describe('insertIntegration', () => {
      it('should create a new integration with required fields', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-integration-1',
          data_stream_count: 0,
          status: TASK_STATUSES.pending,
          metadata: {
            title: 'Test Integration',
            version: 0,
          },
        };

        const result = await savedObjectService.insertIntegration(integrationData);

        expect(result.id).toBe('test-integration-1');
        expect(result.type).toBe(INTEGRATION_SAVED_OBJECT_TYPE);
        expect(result.attributes.integration_id).toBe('test-integration-1');
        expect(result.attributes.data_stream_count).toBe(0);
        expect(result.attributes.status).toBe(TASK_STATUSES.pending);
        expect(result.attributes.metadata?.created_at).toBeDefined();
        expect(result.attributes.metadata?.version).toBe(0);

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-integration-1');
      });

      it('should set default values when optional fields are not provided', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-integration-defaults',
          data_stream_count: 0,
          status: TASK_STATUSES.pending,
          metadata: {
            version: 0,
          },
        };

        const result = await savedObjectService.insertIntegration(integrationData);

        expect(result.attributes.data_stream_count).toBe(0);
        expect(result.attributes.status).toBe(TASK_STATUSES.pending);
        expect(result.attributes.metadata?.created_at).toBeDefined();
        expect(result.attributes.metadata?.version).toBe(0);

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-integration-defaults');
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = {
          integration_id: '',
          data_stream_count: 0,
          status: TASK_STATUSES.pending,
          metadata: {
            version: 0,
          },
        } as IntegrationAttributes;

        await expect(savedObjectService.insertIntegration(invalidData)).rejects.toThrow(
          'Integration ID is required'
        );
      });

      it('should throw error when integration already exists', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'duplicate-integration',
          data_stream_count: 0,
          status: TASK_STATUSES.pending,
          metadata: {
            version: 0,
          },
        };

        await savedObjectService.insertIntegration(integrationData);

        // Try to create duplicate
        await expect(savedObjectService.insertIntegration(integrationData)).rejects.toThrow(
          'Integration duplicate-integration already exists'
        );

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'duplicate-integration');
      });
    });

    describe('getIntegration', () => {
      it('should retrieve an existing integration', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-get-integration',
          data_stream_count: 5,
          status: TASK_STATUSES.pending,
          metadata: {
            title: 'Get Test Integration',
            version: 0,
          },
        };

        // Create integration
        await savedObjectService.insertIntegration(integrationData);

        // Retrieve it
        const result = await savedObjectService.getIntegration('test-get-integration');

        expect(result.id).toBe('test-get-integration');
        expect(result.attributes.integration_id).toBe('test-get-integration');
        expect(result.attributes.data_stream_count).toBe(5);
        expect(result.attributes.status).toBe(TASK_STATUSES.pending);

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-get-integration');
      });

      it('should throw error when integration does not exist', async () => {
        await expect(savedObjectService.getIntegration('non-existent-integration')).rejects.toThrow();
      });
    });

    describe('updateIntegration', () => {
      it('should update an existing integration', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-update-integration',
          data_stream_count: 1,
          status: TASK_STATUSES.pending,
          metadata: {
            title: 'Original Title',
            version: 0,
          },
        };

        // Create integration
        const created = await savedObjectService.insertIntegration(integrationData);

        // Update it
        const updateData: IntegrationAttributes = {
          integration_id: 'test-update-integration',
          data_stream_count: 3,
          status: TASK_STATUSES.completed,
          metadata: {
            title: 'Updated Title',
            version: 1,
          },
        };

        const result = await savedObjectService.updateIntegration(updateData, {
          version: created.version!,
        });

        expect(result.attributes.data_stream_count).toBe(3);
        expect(result.attributes.status).toBe(TASK_STATUSES.completed);
        expect(result.attributes.metadata?.version).toBe(1);

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-update-integration');
      });

      it('should increment version on update', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-version-integration',
          data_stream_count: 1,
          status: TASK_STATUSES.pending,
          metadata: {
            version: 0,
          },
        };

        // Create integration
        const created = await savedObjectService.insertIntegration(integrationData);
        expect(created.attributes.metadata?.version).toBe(0);

        // First update
        const firstUpdate = await savedObjectService.updateIntegration(
          { ...integrationData, data_stream_count: 2 },
          { version: created.version! }
        );
        expect(firstUpdate.attributes.metadata?.version).toBe(1);

        // Second update
        const secondUpdate = await savedObjectService.updateIntegration(
          { ...integrationData, data_stream_count: 3 },
          { version: firstUpdate.version! }
        );
        expect(secondUpdate.attributes.metadata?.version).toBe(2);

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-version-integration');
      });

      it('should throw error when integration does not exist', async () => {
        const updateData: IntegrationAttributes = {
          integration_id: 'non-existent-integration',
          data_stream_count: 1,
          status: TASK_STATUSES.pending,
          metadata: {
            version: 0,
          },
        };

        await expect(
          savedObjectService.updateIntegration(updateData, { version: '1' })
        ).rejects.toThrow();
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = {
          integration_id: '',
          data_stream_count: 1,
          status: TASK_STATUSES.pending,
          metadata: {
            version: 0,
          },
        } as IntegrationAttributes;

        await expect(
          savedObjectService.updateIntegration(invalidData, { version: '1' })
        ).rejects.toThrow('Integration ID is required');
      });
    });

    describe('getAllIntegrations', () => {
      it('should retrieve all integrations', async () => {
        // Create multiple integrations
        const integration1: IntegrationAttributes = {
          integration_id: 'test-getall-1',
          data_stream_count: 1,
          status: TASK_STATUSES.pending,
          metadata: {
            version: 0,
          },
        };

        const integration2: IntegrationAttributes = {
          integration_id: 'test-getall-2',
          data_stream_count: 2,
          status: TASK_STATUSES.completed,
          metadata: {
            version: 0,
          },
        };

        await savedObjectService.insertIntegration(integration1);
        await savedObjectService.insertIntegration(integration2);

        // Get all integrations
        const result = await savedObjectService.getAllIntegrations();

        expect(result.total).toBeGreaterThanOrEqual(2);
        const ids = result.saved_objects.map(obj => obj.id);
        expect(ids).toContain('test-getall-1');
        expect(ids).toContain('test-getall-2');

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-getall-1');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-getall-2');
      });

      it('should return empty array when no integrations exist', async () => {
        const result = await savedObjectService.getAllIntegrations();

        expect(result.total).toBe(0);
      });
    });

    describe('deleteIntegration', () => {
      it('should delete an existing integration', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-delete-integration',
          data_stream_count: 1,
          status: TASK_STATUSES.pending,
          metadata: {
            version: 0,
          },
        };

        // Create integration
        await savedObjectService.insertIntegration(integrationData);

        // Delete it
        await savedObjectService.deleteIntegration('test-delete-integration');

        // Verify it's deleted
        await expect(
          savedObjectService.getIntegration('test-delete-integration')
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

      savedObjectService = new AutomaticImportSavedObjectService({
        savedObjectsClient: savedObjectsClient,
        logger: mockLogger,
      });
    });

    describe('insertDataStream', () => {
      it('should create a new data stream with existing integration', async () => {
        // Create integration first
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-ds-integration-1',
          data_stream_count: 0,
          status: TASK_STATUSES.pending,
          metadata: {
            version: 0,
          },
        };
        await savedObjectService.insertIntegration(integrationData);

        // Create data stream
        const dataStreamData: DataStreamAttributes = {
          integration_id: 'test-ds-integration-1',
          data_stream_id: 'test-data-stream-1',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {
            sample_count: 100,
          },
          result: {},
        };

        const testDataStream = await savedObjectService.insertDataStream(dataStreamData);

        expect(testDataStream.id).toBe('test-data-stream-1');
        expect(testDataStream.type).toBe(DATA_STREAM_SAVED_OBJECT_TYPE);
        expect(testDataStream.attributes.integration_id).toBe('test-ds-integration-1');
        expect(testDataStream.attributes.data_stream_id).toBe('test-data-stream-1');
        expect(testDataStream.attributes.metadata?.created_at).toBeDefined();

        // Verify integration count was updated since we are creating a new data stream
        const updatedIntegration = await savedObjectService.getIntegration('test-ds-integration-1');
        expect(updatedIntegration.attributes.data_stream_count).toBe(1);

        // Cleanup
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-data-stream-1');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-ds-integration-1');
      });

      it('should create data stream and auto-create integration if it does not exist', async () => {
        const dataStreamData: DataStreamAttributes = {
          integration_id: 'auto-created-integration',
          data_stream_id: 'test-data-stream-auto',
          job_info: {
            job_id: 'job-auto',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {
            sample_count: 50,
          },
          result: {},
        };

        const result = await savedObjectService.insertDataStream(dataStreamData);

        expect(result.id).toBe('test-data-stream-auto');

        // Verify integration was auto-created
        const integration = await savedObjectService.getIntegration('auto-created-integration');
        expect(integration.attributes.data_stream_count).toBe(1);
        expect(integration.attributes.status).toBe(TASK_STATUSES.pending);

        // Cleanup
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-data-stream-auto');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'auto-created-integration');
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = {
          integration_id: '',
          data_stream_id: 'test-ds',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 0 },
          result: {},
        } as DataStreamAttributes;

        await expect(savedObjectService.insertDataStream(invalidData)).rejects.toThrow(
          'Integration ID is required'
        );
      });

      it('should throw error when data_stream_id is missing', async () => {
        const invalidData = {
          integration_id: 'test-integration',
          data_stream_id: '',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 0 },
          result: {},
        } as DataStreamAttributes;

        await expect(savedObjectService.insertDataStream(invalidData)).rejects.toThrow(
          'Data stream ID is required'
        );
      });

      it('should throw error when data stream already exists', async () => {
        const dataStreamData: DataStreamAttributes = {
          integration_id: 'duplicate-ds-integration',
          data_stream_id: 'duplicate-data-stream',
          job_info: {
            job_id: 'job-dup',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 0 },
          result: {},
        };

        // Create first data stream
        await savedObjectService.insertDataStream(dataStreamData);

        // Try to create duplicate
        await expect(savedObjectService.insertDataStream(dataStreamData)).rejects.toThrow(
          'Data stream duplicate-data-stream already exists'
        );

        // Cleanup
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'duplicate-data-stream');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'duplicate-ds-integration');
      });
    });

    describe('getDataStream', () => {
      it('should retrieve an existing data stream', async () => {
        const dataStreamData: DataStreamAttributes = {
          integration_id: 'get-ds-integration',
          data_stream_id: 'test-get-data-stream',
          job_info: {
            job_id: 'get-job',
            job_type: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: {
            sample_count: 200,
          },
          result: {
            ingest_pipeline: 'test-pipeline',
          },
        };

        // Create data stream
        await savedObjectService.insertDataStream(dataStreamData);

        // Retrieve it
        const result = await savedObjectService.getDataStream('test-get-data-stream');

        expect(result.id).toBe('test-get-data-stream');
        expect(result.attributes.integration_id).toBe('get-ds-integration');
        expect(result.attributes.job_info?.status).toBe(TASK_STATUSES.completed);
        expect(result.attributes.metadata?.sample_count).toBe(200);

        // Cleanup
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-get-data-stream');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'get-ds-integration');
      });

      it('should throw error when data stream does not exist', async () => {
        await expect(savedObjectService.getDataStream('non-existent-data-stream')).rejects.toThrow();
      });
    });

    describe('updateDataStream', () => {
      it('should update an existing data stream', async () => {
        const dataStreamData: DataStreamAttributes = {
          integration_id: 'update-ds-integration',
          data_stream_id: 'test-update-data-stream',
          job_info: {
            job_id: 'update-job',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {
            sample_count: 100,
          },
          result: {},
        };

        // Create data stream
        const created = await savedObjectService.insertDataStream(dataStreamData);

        // Update it
        const updateData: DataStreamAttributes = {
          integration_id: 'update-ds-integration',
          data_stream_id: 'test-update-data-stream',
          job_info: {
            job_id: 'update-job',
            job_type: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: {
            sample_count: 250,
          },
          result: {
            ingest_pipeline: 'updated-pipeline',
          },
        };

        const result = await savedObjectService.updateDataStream(updateData, {
          version: created.version!,
        });

        expect(result.attributes.job_info?.status).toBe(TASK_STATUSES.completed);
        expect(result.attributes.metadata?.sample_count).toBe(250);
        expect(result.attributes.result?.ingest_pipeline).toBe('updated-pipeline');

        // Cleanup
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-update-data-stream');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'update-ds-integration');
      });

      it('should throw error when integration does not exist', async () => {
        const updateData: DataStreamAttributes = {
          integration_id: 'non-existent-integration',
          data_stream_id: 'test-ds',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 0 },
          result: {},
        };

        await expect(
          savedObjectService.updateDataStream(updateData, { version: '1' })
        ).rejects.toThrow();
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = {
          integration_id: '',
          data_stream_id: 'test-ds',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 0 },
          result: {},
        } as DataStreamAttributes;

        await expect(
          savedObjectService.updateDataStream(invalidData, { version: '1' })
        ).rejects.toThrow('Integration ID is required');
      });

      it('should throw error when data_stream_id is missing', async () => {
        const invalidData = {
          integration_id: 'test-integration',
          data_stream_id: '',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 0 },
          result: {},
        } as DataStreamAttributes;

        await expect(
          savedObjectService.updateDataStream(invalidData, { version: '1' })
        ).rejects.toThrow('Data stream ID is required');
      });
    });

    describe('getAllDataStreams', () => {
      it('should retrieve all data streams', async () => {
        // Create multiple data streams
        const dataStream1: DataStreamAttributes = {
          integration_id: 'getall-ds-integration',
          data_stream_id: 'test-getall-ds-1',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 100 },
          result: {},
        };

        const dataStream2: DataStreamAttributes = {
          integration_id: 'getall-ds-integration',
          data_stream_id: 'test-getall-ds-2',
          job_info: {
            job_id: 'job-2',
            job_type: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: { sample_count: 200 },
          result: {},
        };

        await savedObjectService.insertDataStream(dataStream1);
        await savedObjectService.insertDataStream(dataStream2);

        // Get all data streams
        const result = await savedObjectService.getAllDataStreams();

        expect(result.total).toBeGreaterThanOrEqual(2);
        const ids = result.saved_objects.map(obj => obj.id);
        expect(ids).toContain('test-getall-ds-1');
        expect(ids).toContain('test-getall-ds-2');

        // Cleanup
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-getall-ds-1');
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-getall-ds-2');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'getall-ds-integration');
      });
    });

    describe('findAllDataStreamsByIntegrationId', () => {
      it('should find all data streams for a specific integration', async () => {
        const integrationId = 'find-by-integration-id';

        // Create data streams for this integration
        const dataStream1: DataStreamAttributes = {
          integration_id: integrationId,
          data_stream_id: 'test-find-ds-1',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 100 },
          result: {},
        };

        const dataStream2: DataStreamAttributes = {
          integration_id: integrationId,
          data_stream_id: 'test-find-ds-2',
          job_info: {
            job_id: 'job-2',
            job_type: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: { sample_count: 200 },
          result: {},
        };

        await savedObjectService.insertDataStream(dataStream1);
        await savedObjectService.insertDataStream(dataStream2);

        // Find data streams by integration ID
        const result = await savedObjectService.findAllDataStreamsByIntegrationId(integrationId);

        expect(result.total).toBeGreaterThanOrEqual(2);

        // All returned data streams should belong to this integration
        result.saved_objects.forEach(obj => {
          expect(obj.attributes.integration_id).toBe(integrationId);
        });

        const ids = result.saved_objects.map(obj => obj.id);
        expect(ids).toContain('test-find-ds-1');
        expect(ids).toContain('test-find-ds-2');

        // Cleanup
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-find-ds-1');
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-find-ds-2');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, integrationId);
      });

      it('should return empty results when integration has no data streams', async () => {
        const result = await savedObjectService.findAllDataStreamsByIntegrationId('non-existent-integration');

        expect(result.total).toBe(0);
        expect(result.saved_objects).toEqual([]);
      });
    });

    describe('deleteDataStream', () => {
      it('should delete an existing data stream and decrement integration count', async () => {
        const integrationId = 'delete-ds-integration';

        // Create integration
        const integrationData: IntegrationAttributes = {
          integration_id: integrationId,
          data_stream_count: 0,
          status: TASK_STATUSES.pending,
          metadata: {
            version: 0,
          },
        };
        await savedObjectService.insertIntegration(integrationData);

        // Create data stream (this will increment count to 1)
        const dataStreamData: DataStreamAttributes = {
          integration_id: integrationId,
          data_stream_id: 'test-delete-data-stream',
          job_info: {
            job_id: 'delete-job',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 0 },
          result: {},
        };
        await savedObjectService.insertDataStream(dataStreamData);

        // Verify integration count is 1
        let integration = await savedObjectService.getIntegration(integrationId);
        expect(integration.attributes.data_stream_count).toBe(1);

        // Delete data stream
        await savedObjectService.deleteDataStream('test-delete-data-stream');

        // Verify data stream is deleted
        await expect(
          savedObjectService.getDataStream('test-delete-data-stream')
        ).rejects.toThrow();

        // Verify integration count was decremented to 0
        integration = await savedObjectService.getIntegration(integrationId);
        expect(integration.attributes.data_stream_count).toBe(0);

        // Cleanup integration
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, integrationId);
      });

      it('should correctly increment and decrement data_stream_count in parent integration when adding/deleting data streams', async () => {
        const integrationId = 'delete-multiple-ds-integration';

        // Create integration
        await savedObjectService.insertIntegration({
          integration_id: integrationId,
          data_stream_count: 0,
          status: TASK_STATUSES.pending,
          metadata: { version: 0 },
        });

        // Create 3 data streams
        await savedObjectService.insertDataStream({
          integration_id: integrationId,
          data_stream_id: 'test-delete-ds-1',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 0 },
          result: {},
        });

        await savedObjectService.insertDataStream({
          integration_id: integrationId,
          data_stream_id: 'test-delete-ds-2',
          job_info: {
            job_id: 'job-2',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 0 },
          result: {},
        });

        await savedObjectService.insertDataStream({
          integration_id: integrationId,
          data_stream_id: 'test-delete-ds-3',
          job_info: {
            job_id: 'job-3',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 0 },
          result: {},
        });

        // Verify count is 3 in parent integration due to the three data streams we created
        let integration = await savedObjectService.getIntegration(integrationId);
        expect(integration.attributes.data_stream_count).toBe(3);

        // Delete one data stream
        await savedObjectService.deleteDataStream('test-delete-ds-2');

        // Verify count decremented to 2
        integration = await savedObjectService.getIntegration(integrationId);
        expect(integration.attributes.data_stream_count).toBe(2);

        // Delete another data stream
        await savedObjectService.deleteDataStream('test-delete-ds-1');

        // Verify count decremented to 1
        integration = await savedObjectService.getIntegration(integrationId);
        expect(integration.attributes.data_stream_count).toBe(1);

        // Cleanup
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-delete-ds-3');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, integrationId);
      });

      it('should throw error when deleting non-existent data stream', async () => {
        await expect(
          savedObjectService.deleteDataStream('non-existent-data-stream')
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

      savedObjectService = new AutomaticImportSavedObjectService({
        savedObjectsClient: savedObjectsClient,
        logger: mockLogger,
      });
    });

    it('should handle complete workflow: create integration, add data streams, update, and query', async () => {
      const integrationId = 'workflow-integration';

      // Step 1: Create integration
      const integrationData: IntegrationAttributes = {
        integration_id: integrationId,
        data_stream_count: 0,
        status: TASK_STATUSES.pending,
        metadata: {
          title: 'Workflow Test Integration',
          version: 0,
        },
      };
      const createdIntegration = await savedObjectService.insertIntegration(integrationData);
      expect(createdIntegration.attributes.status).toBe(TASK_STATUSES.pending);

      // Step 2: Add data streams
      await savedObjectService.insertDataStream({
        integration_id: integrationId,
        data_stream_id: 'workflow-ds-1',
        job_info: {
          job_id: 'workflow-job-1',
          job_type: 'import',
          status: TASK_STATUSES.processing,
        },
        metadata: { sample_count: 100 },
        result: {},
      });

      await savedObjectService.insertDataStream({
        integration_id: integrationId,
        data_stream_id: 'workflow-ds-2',
        job_info: {
          job_id: 'workflow-job-2',
          job_type: 'import',
          status: TASK_STATUSES.processing,
        },
        metadata: { sample_count: 150 },
        result: {},
      });

      // Step 3: Verify data stream count
      let integration = await savedObjectService.getIntegration(integrationId);
      expect(integration.attributes.data_stream_count).toBe(2);

      // Step 4: Update data stream status
      const dataStream1 = await savedObjectService.getDataStream('workflow-ds-1');
      await savedObjectService.updateDataStream(
        {
          integration_id: integrationId,
          data_stream_id: 'workflow-ds-1',
          job_info: {
            job_id: 'workflow-job-1',
            job_type: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: { sample_count: 100 },
          result: {
            ingest_pipeline: 'completed-pipeline',
          },
        },
        { version: dataStream1.version! }
      );

      // Step 5: Update integration status
      integration = await savedObjectService.getIntegration(integrationId);
      await savedObjectService.updateIntegration(
        {
          integration_id: integrationId,
          data_stream_count: 2,
          status: TASK_STATUSES.completed,
          metadata: {
            title: 'Workflow Test Integration - Completed',
            version: 2,
          },
        },
        { version: integration.version! }
      );

      // Step 6: Query and verify final state
      const finalIntegration = await savedObjectService.getIntegration(integrationId);
      expect(finalIntegration.attributes.status).toBe(TASK_STATUSES.completed);
      expect(finalIntegration.attributes.data_stream_count).toBe(2);

      const dataStreams = await savedObjectService.findAllDataStreamsByIntegrationId(integrationId);
      expect(dataStreams.total).toBe(2);

      // Cleanup
      await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'workflow-ds-1');
      await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'workflow-ds-2');
      await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, integrationId);
    });
  });
});

