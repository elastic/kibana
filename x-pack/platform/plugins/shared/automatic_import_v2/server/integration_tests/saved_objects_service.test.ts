/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  KibanaRequest,
  SecurityServiceStart,
} from '@kbn/core/server';
import { savedObjectsClientMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AutomaticImportSavedObjectService } from '../services/saved_objects/saved_objects_service';
import type {
  IntegrationAttributes,
  DataStreamAttributes,
} from '../services/saved_objects/schemas/types';
import {
  DATA_STREAM_SAVED_OBJECT_TYPE,
  INPUT_TYPES,
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
import { createMockSecurity } from './__mocks__/security';
import { mockIntegrationData, mockDataStreamData } from '../__mocks__/saved_objects';

describe('AutomaticImportSavedObjectService', () => {
  let mockSecurity: jest.Mocked<SecurityServiceStart>;
  let mockRequest: KibanaRequest;
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
    mockRequest = httpServerMock.createKibanaRequest();
    mockSecurity = createMockSecurity();
  });

  describe('Constructor', () => {
    it('should initialize AutomaticImportSavedObjectService with provided savedObjectsClient and logger', () => {
      const mockSavedObjectsClient = savedObjectsClientMock.create();
      const mockLoggerFactory = loggerMock.create();
      const newService = new AutomaticImportSavedObjectService(
        mockLoggerFactory,
        mockSavedObjectsClient,
        mockSecurity
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
        savedObjectsClient,
        mockSecurity
      );
    });

    describe('insertIntegration', () => {
      it('should create integration with service-managed defaults', async () => {
        const result = await savedObjectService.insertIntegration(mockRequest, {
          ...mockIntegrationData,
          integration_id: 'test-integration-1',
        });

        expect(result.id).toBe('test-integration-1');
        expect(result.attributes.created_by).toBe('test-user');
        expect(result.attributes.metadata?.created_at).toBeDefined();
        expect(result.attributes.metadata?.version).toBe('0.0.0');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-integration-1');
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = {
          ...mockIntegrationData,
          integration_id: '',
        };

        await expect(
          savedObjectService.insertIntegration(mockRequest, invalidData)
        ).rejects.toThrow('Integration ID is required');
      });

      it('should throw error when integration already exists', async () => {
        const integrationData: IntegrationAttributes = {
          ...mockIntegrationData,
          integration_id: 'duplicate-integration',
        };

        await savedObjectService.insertIntegration(mockRequest, integrationData);

        // Try to create duplicate
        await expect(
          savedObjectService.insertIntegration(mockRequest, integrationData)
        ).rejects.toThrow('Integration duplicate-integration already exists');

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'duplicate-integration');
      });
    });

    describe('getIntegration', () => {
      it('should retrieve an existing integration', async () => {
        await savedObjectService.insertIntegration(mockRequest, {
          ...mockIntegrationData,
          integration_id: 'test-get-integration',
          data_stream_count: 5,
          metadata: { ...mockIntegrationData.metadata, title: 'Get Test Integration' },
        });

        const result = await savedObjectService.getIntegration('test-get-integration');

        expect(result.id).toBe('test-get-integration');
        expect(result.attributes.data_stream_count).toBe(5);

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-get-integration');
      });

      it('should throw error when integration does not exist', async () => {
        await expect(
          savedObjectService.getIntegration('non-existent-integration')
        ).rejects.toThrow();
      });
    });

    describe('updateIntegration', () => {
      it('should update an existing integration', async () => {
        await savedObjectService.insertIntegration(mockRequest, {
          ...mockIntegrationData,
          integration_id: 'test-update-integration',
          data_stream_count: 1,
          metadata: { ...mockIntegrationData.metadata, title: 'Original Title' },
        });

        const result = await savedObjectService.updateIntegration(
          {
            ...mockIntegrationData,
            integration_id: 'test-update-integration',
            data_stream_count: 3,
            status: TASK_STATUSES.completed,
            metadata: { ...mockIntegrationData.metadata, title: 'Updated Title' },
          },
          '0.0.0'
        );

        expect(result.attributes.data_stream_count).toBe(3);
        expect(result.attributes.status).toBe(TASK_STATUSES.completed);
        expect(result.attributes.metadata?.version).toBe('0.0.1');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-update-integration');
      });

      it('should increment version on update', async () => {
        const integrationData: IntegrationAttributes = {
          ...mockIntegrationData,
          integration_id: 'test-version-integration',
          data_stream_count: 1,
        };

        // Create integration
        const created = await savedObjectService.insertIntegration(mockRequest, integrationData);
        expect(created.attributes.metadata?.version).toBe('0.0.0');

        // First update
        const firstUpdate = await savedObjectService.updateIntegration(
          { ...integrationData, data_stream_count: 2 },
          '0.0.0'
        );
        expect(firstUpdate.attributes.metadata?.version).toBe('0.0.1');

        // Second update
        const secondUpdate = await savedObjectService.updateIntegration(
          { ...integrationData, data_stream_count: 3 },
          '0.0.1'
        );
        expect(secondUpdate.attributes.metadata?.version).toBe('0.0.2');

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-version-integration');
      });

      it('should throw error when integration does not exist', async () => {
        const updateData: IntegrationAttributes = {
          integration_id: 'non-existent-integration',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        };

        await expect(savedObjectService.updateIntegration(updateData, '0.0.0')).rejects.toThrow();
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = {
          integration_id: '',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        };

        await expect(savedObjectService.updateIntegration(invalidData, '0.0.0')).rejects.toThrow(
          'Integration ID is required'
        );
      });

      it('should throw version conflict when expectedVersion does not match', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-app-version-conflict',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        };

        await savedObjectService.insertIntegration(mockRequest, integrationData);

        await savedObjectService.updateIntegration(
          { ...integrationData, data_stream_count: 2 },
          '0.0.0'
        );

        // Meta data version increments automatically as patch version
        await expect(
          savedObjectService.updateIntegration(
            { ...integrationData, data_stream_count: 3 },
            '0.0.0'
          )
        ).rejects.toThrow(
          'Version conflict: Integration test-app-version-conflict has been updated. Expected version 0.0.0, but current version is 0.0.1'
        );

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-app-version-conflict');
      });

      it('should increment major version', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-major-version',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        };

        await savedObjectService.insertIntegration(mockRequest, integrationData);

        const updated = await savedObjectService.updateIntegration(
          { ...integrationData, data_stream_count: 2 },
          '0.0.0',
          'major'
        );

        expect(updated.attributes.metadata?.version).toBe('1.0.0');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-major-version');
      });

      it('should increment minor version', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-minor-version',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        };

        await savedObjectService.insertIntegration(mockRequest, integrationData);

        const updated = await savedObjectService.updateIntegration(
          { ...integrationData, data_stream_count: 2 },
          '0.0.0',
          'minor'
        );

        expect(updated.attributes.metadata?.version).toBe('0.1.0');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-minor-version');
      });

      it('should reset minor and patch when incrementing major version', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-major-reset',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        };

        await savedObjectService.insertIntegration(mockRequest, integrationData);

        await savedObjectService.updateIntegration({ ...integrationData }, '0.0.0', 'minor');

        await savedObjectService.updateIntegration({ ...integrationData }, '0.1.0', 'patch');

        const updated = await savedObjectService.updateIntegration(
          { ...integrationData },
          '0.1.1',
          'major'
        );

        expect(updated.attributes.metadata?.version).toBe('1.0.0');

        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-major-reset');
      });

      it('should reset patch when incrementing minor version', async () => {
        const integrationData: IntegrationAttributes = {
          integration_id: 'test-minor-reset',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        };

        await savedObjectService.insertIntegration(mockRequest, integrationData);

        await savedObjectService.updateIntegration({ ...integrationData }, '0.0.0', 'patch');

        await savedObjectService.updateIntegration({ ...integrationData }, '0.0.1', 'patch');

        const updated = await savedObjectService.updateIntegration(
          { ...integrationData },
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
        const integration1: IntegrationAttributes = {
          integration_id: 'test-getall-1',
          data_stream_count: 1,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        };

        const integration2: IntegrationAttributes = {
          integration_id: 'test-getall-2',
          data_stream_count: 2,
          created_by: 'test-user',
          status: TASK_STATUSES.completed,
          metadata: {},
        };

        try {
          await savedObjectService.insertIntegration(mockRequest, integration1);
          await savedObjectService.insertIntegration(mockRequest, integration2);

          const result = await savedObjectService.getAllIntegrations();

          expect(result.total).toBe(2);
          const ids = result.saved_objects.map((obj) => obj.id);
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
        for (const integration of existing.saved_objects) {
          await savedObjectsClient
            .delete(INTEGRATION_SAVED_OBJECT_TYPE, integration.id)
            .catch(() => {});
        }

        const result = await savedObjectService.getAllIntegrations();

        expect(result.total).toBe(0);
      });
    });

    describe('deleteIntegration - cascade deletion', () => {
      it('should cascade delete integration and all associated data streams', async () => {
        const integrationId = 'test-cascade-delete-integration';

        // Create integrations for testing cascade deletion
        await savedObjectService.insertIntegration(mockRequest, {
          integration_id: integrationId,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        });

        await savedObjectService.insertDataStream(mockRequest, {
          integration_id: integrationId,
          data_stream_id: 'test-cascade-ds-1',
          created_by: 'test-user',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {},
          result: {},
        });

        await savedObjectService.insertDataStream(mockRequest, {
          integration_id: integrationId,
          data_stream_id: 'test-cascade-ds-2',
          created_by: 'test-user',
          job_info: {
            job_id: 'job-2',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {},
          result: {},
        });

        await savedObjectService.insertDataStream(mockRequest, {
          integration_id: integrationId,
          data_stream_id: 'test-cascade-ds-3',
          created_by: 'test-user',
          job_info: {
            job_id: 'job-3',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {},
          result: {},
        });

        // Verify 3 data streams exist
        const dataStreamsBefore = await savedObjectService.findAllDataStreamsByIntegrationId(
          integrationId
        );
        expect(dataStreamsBefore.total).toBe(3);

        const result = await savedObjectService.deleteIntegration(integrationId);

        expect(result.dataStreamsDeleted).toBe(3);

        await expect(savedObjectService.getIntegration(integrationId)).rejects.toThrow();

        await expect(savedObjectService.getDataStream('test-cascade-ds-1')).rejects.toThrow();
        await expect(savedObjectService.getDataStream('test-cascade-ds-2')).rejects.toThrow();
        await expect(savedObjectService.getDataStream('test-cascade-ds-3')).rejects.toThrow();
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
        savedObjectsClient,
        mockSecurity
      );
    });

    describe('insertDataStream', () => {
      it('should create a new data stream with existing integration', async () => {
        await savedObjectService.insertIntegration(mockRequest, {
          integration_id: 'test-ds-integration-1',
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        });

        const result = await savedObjectService.insertDataStream(mockRequest, {
          ...mockDataStreamData,
          integration_id: 'test-ds-integration-1',
          data_stream_id: 'test-data-stream-1',
          metadata: { ...mockDataStreamData.metadata, sample_count: 100 },
        });

        expect(result.id).toBe('test-data-stream-1');
        expect(result.attributes.created_by).toBe('test-user');
        expect(result.attributes.metadata?.created_at).toBeDefined();
        expect(result.attributes.metadata?.version).toBe('0.0.0');

        const updatedIntegration = await savedObjectService.getIntegration('test-ds-integration-1');
        expect(updatedIntegration.attributes.data_stream_count).toBe(1);

        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-data-stream-1');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'test-ds-integration-1');
      });

      it('should create data stream and auto-create integration if it does not exist', async () => {
        const result = await savedObjectService.insertDataStream(mockRequest, {
          ...mockDataStreamData,
          integration_id: 'auto-created-integration',
          data_stream_id: 'test-data-stream-auto',
          metadata: { ...mockDataStreamData.metadata, sample_count: 50 },
        });

        expect(result.id).toBe('test-data-stream-auto');

        const integration = await savedObjectService.getIntegration('auto-created-integration');
        expect(integration.attributes.data_stream_count).toBe(1);

        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-data-stream-auto');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'auto-created-integration');
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = {
          ...mockDataStreamData,
          integration_id: '',
          data_stream_id: 'test-ds',
        } as DataStreamAttributes;

        await expect(savedObjectService.insertDataStream(mockRequest, invalidData)).rejects.toThrow(
          'Integration ID is required'
        );
      });

      it('should throw error when data_stream_id is missing', async () => {
        const invalidData = {
          ...mockDataStreamData,
          integration_id: 'test-integration',
          data_stream_id: '',
        } as DataStreamAttributes;

        await expect(savedObjectService.insertDataStream(mockRequest, invalidData)).rejects.toThrow(
          'Data stream ID is required'
        );
      });

      it('should throw error when data stream already exists', async () => {
        const dataStreamData: DataStreamAttributes = {
          integration_id: 'duplicate-ds-integration',
          data_stream_id: 'duplicate-data-stream',
          created_by: 'test-user',
          job_info: {
            job_id: 'job-dup',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {},
          result: {},
        };

        await savedObjectService.insertDataStream(mockRequest, dataStreamData);

        // Try to create duplicate
        await expect(
          savedObjectService.insertDataStream(mockRequest, dataStreamData)
        ).rejects.toThrow('Data stream duplicate-data-stream already exists');

        // Cleanup
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'duplicate-data-stream');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'duplicate-ds-integration');
      });
    });

    describe('getDataStream', () => {
      it('should retrieve an existing data stream', async () => {
        await savedObjectService.insertDataStream(mockRequest, {
          integration_id: 'get-ds-integration',
          data_stream_id: 'test-get-data-stream',
          created_by: 'test-user',
          job_info: {
            job_id: 'get-job',
            job_type: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: { sample_count: 200, input_type: INPUT_TYPES.awsCloudwatch },
          result: { ingest_pipeline: 'test-pipeline' },
        });

        const result = await savedObjectService.getDataStream('test-get-data-stream');

        expect(result.id).toBe('test-get-data-stream');
        expect(result.attributes.metadata?.sample_count).toBe(200);

        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-get-data-stream');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'get-ds-integration');
      });

      it('should throw error when data stream does not exist', async () => {
        await expect(
          savedObjectService.getDataStream('non-existent-data-stream')
        ).rejects.toThrow();
      });
    });

    describe('updateDataStream', () => {
      it('should update an existing data stream', async () => {
        const created = await savedObjectService.insertDataStream(mockRequest, {
          integration_id: 'update-ds-integration',
          data_stream_id: 'test-update-data-stream',
          created_by: 'test-user',
          job_info: {
            job_id: 'update-job',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 100, input_type: INPUT_TYPES.awsCloudwatch },
          result: {},
        });

        const result = await savedObjectService.updateDataStream(
          {
            integration_id: 'update-ds-integration',
            data_stream_id: 'test-update-data-stream',
            created_by: 'test-user',
            job_info: {
              job_id: 'update-job',
              job_type: 'import',
              status: TASK_STATUSES.completed,
            },
            metadata: { sample_count: 250 },
            result: { ingest_pipeline: 'updated-pipeline' },
          },
          '0.0.0',
          undefined,
          { version: created.version! }
        );

        expect(result.attributes.job_info?.status).toBe(TASK_STATUSES.completed);
        expect(result.attributes.metadata?.sample_count).toBe(250);
        expect(result.attributes.metadata?.version).toBe('0.0.1');

        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-update-data-stream');
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, 'update-ds-integration');
      });

      it('should throw error when integration does not exist', async () => {
        const updateData: DataStreamAttributes = {
          integration_id: 'non-existent-integration',
          data_stream_id: 'test-ds',
          created_by: 'test-user',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {},
          result: {},
        };

        await expect(
          savedObjectService.updateDataStream(updateData, '0.0.0', undefined, { version: '1' })
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
          metadata: {},
          result: {},
        } as DataStreamAttributes;

        await expect(
          savedObjectService.updateDataStream(invalidData, '0.0.0', undefined, { version: '1' })
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
          metadata: {},
          result: {},
        } as DataStreamAttributes;

        await expect(
          savedObjectService.updateDataStream(invalidData, '0.0.0', undefined, { version: '1' })
        ).rejects.toThrow('Data stream ID is required');
      });

      it('should throw metadata version conflict when expectedVersion does not match', async () => {
        const dataStreamData: DataStreamAttributes = {
          integration_id: 'app-version-conflict-ds-integration',
          data_stream_id: 'test-app-version-conflict-ds',
          created_by: 'test-user',
          job_info: {
            job_id: 'app-conflict-job',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 100 },
          result: {},
        };

        await savedObjectService.insertDataStream(mockRequest, dataStreamData);

        await savedObjectService.updateDataStream(
          { ...dataStreamData, metadata: { sample_count: 200 } },
          '0.0.0'
        );

        await expect(
          savedObjectService.updateDataStream(
            { ...dataStreamData, metadata: { sample_count: 300 } },
            '0.0.0'
          )
        ).rejects.toThrow(
          'Version conflict: Data stream test-app-version-conflict-ds has been updated. Expected version 0.0.0, but current version is 0.0.1'
        );

        await savedObjectsClient.delete(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          'test-app-version-conflict-ds'
        );
        await savedObjectsClient.delete(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'app-version-conflict-ds-integration'
        );
      });

      it('should increment major version for data stream', async () => {
        const dataStreamData: DataStreamAttributes = {
          integration_id: 'ds-major-version-integration',
          data_stream_id: 'test-ds-major-version',
          created_by: 'test-user',
          job_info: {
            job_id: 'major-job',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 100 },
          result: {},
        };

        await savedObjectService.insertDataStream(mockRequest, dataStreamData);

        const updated = await savedObjectService.updateDataStream(
          { ...dataStreamData, metadata: { sample_count: 200 } },
          '0.0.0',
          'major'
        );

        expect(updated.attributes.metadata?.version).toBe('1.0.0');

        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-ds-major-version');
        await savedObjectsClient.delete(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'ds-major-version-integration'
        );
      });

      it('should increment minor version for data stream', async () => {
        const dataStreamData: DataStreamAttributes = {
          integration_id: 'ds-minor-version-integration',
          data_stream_id: 'test-ds-minor-version',
          created_by: 'test-user',
          job_info: {
            job_id: 'minor-job',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 100 },
          result: {},
        };

        await savedObjectService.insertDataStream(mockRequest, dataStreamData);

        const updated = await savedObjectService.updateDataStream(
          { ...dataStreamData, metadata: { sample_count: 200 } },
          '0.0.0',
          'minor'
        );

        expect(updated.attributes.metadata?.version).toBe('0.1.0');

        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-ds-minor-version');
        await savedObjectsClient.delete(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'ds-minor-version-integration'
        );
      });

      it('should reset minor and patch when incrementing major version for data stream', async () => {
        const dataStreamData: DataStreamAttributes = {
          integration_id: 'ds-major-reset-integration',
          data_stream_id: 'test-ds-major-reset',
          created_by: 'test-user',
          job_info: {
            job_id: 'reset-job',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 100 },
          result: {},
        };

        await savedObjectService.insertDataStream(mockRequest, dataStreamData);

        await savedObjectService.updateDataStream({ ...dataStreamData }, '0.0.0', 'minor');

        await savedObjectService.updateDataStream({ ...dataStreamData }, '0.1.0', 'patch');

        const updated = await savedObjectService.updateDataStream(
          { ...dataStreamData },
          '0.1.1',
          'major'
        );

        expect(updated.attributes.metadata?.version).toBe('1.0.0');

        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-ds-major-reset');
        await savedObjectsClient.delete(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'ds-major-reset-integration'
        );
      });

      it('should reset patch when incrementing minor version for data stream', async () => {
        const dataStreamData: DataStreamAttributes = {
          integration_id: 'ds-minor-reset-integration',
          data_stream_id: 'test-ds-minor-reset',
          created_by: 'test-user',
          job_info: {
            job_id: 'reset-minor-job',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: { sample_count: 100 },
          result: {},
        };

        await savedObjectService.insertDataStream(mockRequest, dataStreamData);

        await savedObjectService.updateDataStream({ ...dataStreamData }, '0.0.0', 'patch');

        await savedObjectService.updateDataStream({ ...dataStreamData }, '0.0.1', 'patch');

        const updated = await savedObjectService.updateDataStream(
          { ...dataStreamData },
          '0.0.2',
          'minor'
        );

        expect(updated.attributes.metadata?.version).toBe('0.1.0');

        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-ds-minor-reset');
        await savedObjectsClient.delete(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'ds-minor-reset-integration'
        );
      });
    });

    describe('getAllDataStreams', () => {
      it('should retrieve all data streams', async () => {
        // Create multiple data streams
        const dataStream1: DataStreamAttributes = {
          integration_id: 'getall-ds-integration',
          data_stream_id: 'test-getall-ds-1',
          created_by: 'test-user',
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
          created_by: 'test-user',
          job_info: {
            job_id: 'job-2',
            job_type: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: { sample_count: 200 },
          result: {},
        };

        try {
          await savedObjectService.insertDataStream(mockRequest, dataStream1);
          await savedObjectService.insertDataStream(mockRequest, dataStream2);

          const result = await savedObjectService.getAllDataStreams();

          // Check that we have at least the 2 data streams we created
          expect(result.total).toBeGreaterThanOrEqual(2);
          const ids = result.saved_objects.map((obj) => obj.id);
          expect(ids).toContain('test-getall-ds-1');
          expect(ids).toContain('test-getall-ds-2');
        } finally {
          await savedObjectsClient
            .delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-getall-ds-1')
            .catch(() => {});
          await savedObjectsClient
            .delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-getall-ds-2')
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

        // Create data streams for this integration
        const dataStream1: DataStreamAttributes = {
          integration_id: integrationId,
          data_stream_id: 'test-find-ds-1',
          created_by: 'test-user',
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
          created_by: 'test-user',
          job_info: {
            job_id: 'job-2',
            job_type: 'import',
            status: TASK_STATUSES.completed,
          },
          metadata: { sample_count: 200 },
          result: {},
        };

        await savedObjectService.insertDataStream(mockRequest, dataStream1);
        await savedObjectService.insertDataStream(mockRequest, dataStream2);

        // Find data streams by integration ID
        const result = await savedObjectService.findAllDataStreamsByIntegrationId(integrationId);

        expect(result.total).toBe(2);
        result.saved_objects.forEach((obj) => {
          expect(obj.attributes.integration_id).toBe(integrationId);
        });
        const ids = result.saved_objects.map((obj) => obj.id);
        expect(ids).toContain('test-find-ds-1');
        expect(ids).toContain('test-find-ds-2');

        // Cleanup
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-find-ds-1');
        await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'test-find-ds-2');
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
        const integrationData: IntegrationAttributes = {
          integration_id: integrationId,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        };
        await savedObjectService.insertIntegration(mockRequest, integrationData);

        const dataStreamData: DataStreamAttributes = {
          integration_id: integrationId,
          data_stream_id: 'test-delete-data-stream',
          created_by: 'test-user',
          job_info: {
            job_id: 'delete-job',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {},
          result: {},
        };
        await savedObjectService.insertDataStream(mockRequest, dataStreamData);

        let integration = await savedObjectService.getIntegration(integrationId);
        expect(integration.attributes.data_stream_count).toBe(1);

        await savedObjectService.deleteDataStream('test-delete-data-stream');
        await expect(savedObjectService.getDataStream('test-delete-data-stream')).rejects.toThrow();

        // Verify integration count was decremented to 0
        integration = await savedObjectService.getIntegration(integrationId);
        expect(integration.attributes.data_stream_count).toBe(0);

        // Cleanup
        await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, integrationId);
      });

      it('should correctly increment and decrement data_stream_count in parent integration when adding/deleting data streams', async () => {
        const integrationId = 'delete-multiple-ds-integration';

        // Create integration
        await savedObjectService.insertIntegration(mockRequest, {
          integration_id: integrationId,
          created_by: 'test-user',
          status: TASK_STATUSES.pending,
          metadata: {},
        });

        // Create 3 data streams
        await savedObjectService.insertDataStream(mockRequest, {
          integration_id: integrationId,
          data_stream_id: 'test-delete-ds-1',
          created_by: 'test-user',
          job_info: {
            job_id: 'job-1',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {},
          result: {},
        });

        await savedObjectService.insertDataStream(mockRequest, {
          integration_id: integrationId,
          data_stream_id: 'test-delete-ds-2',
          created_by: 'test-user',
          job_info: {
            job_id: 'job-2',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {},
          result: {},
        });

        await savedObjectService.insertDataStream(mockRequest, {
          integration_id: integrationId,
          data_stream_id: 'test-delete-ds-3',
          created_by: 'test-user',
          job_info: {
            job_id: 'job-3',
            job_type: 'import',
            status: TASK_STATUSES.pending,
          },
          metadata: {},
          result: {},
        });

        // Verify count is 3 in parent integration due to the three data streams we created
        let integration = await savedObjectService.getIntegration(integrationId);
        expect(integration.attributes.data_stream_count).toBe(3);

        // Delete one data stream
        await savedObjectService.deleteDataStream('test-delete-ds-2');

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

      const mockLoggerFactory = loggerMock.create();
      savedObjectService = new AutomaticImportSavedObjectService(
        mockLoggerFactory,
        savedObjectsClient,
        mockSecurity
      );
    });

    it('should handle complete workflow: create integration, add data streams, update, and query', async () => {
      const integrationId = 'workflow-integration';

      const integrationData: IntegrationAttributes = {
        integration_id: integrationId,
        data_stream_count: 0,
        created_by: 'test-user',
        status: TASK_STATUSES.pending,
        metadata: {
          title: 'Workflow Test Integration',
          version: '0.0.0',
        },
      };
      const createdIntegration = await savedObjectService.insertIntegration(
        mockRequest,
        integrationData
      );
      expect(createdIntegration.attributes.status).toBe(TASK_STATUSES.pending);

      await savedObjectService.insertDataStream(mockRequest, {
        integration_id: integrationId,
        data_stream_id: 'workflow-ds-1',
        created_by: 'test-user',
        job_info: {
          job_id: 'workflow-job-1',
          job_type: 'import',
          status: TASK_STATUSES.processing,
        },
        metadata: { sample_count: 100 },
        result: {},
      });

      await savedObjectService.insertDataStream(mockRequest, {
        integration_id: integrationId,
        data_stream_id: 'workflow-ds-2',
        created_by: 'test-user',
        job_info: {
          job_id: 'workflow-job-2',
          job_type: 'import',
          status: TASK_STATUSES.processing,
        },
        metadata: { sample_count: 150 },
        result: {},
      });

      let integration = await savedObjectService.getIntegration(integrationId);
      expect(integration.attributes.data_stream_count).toBe(2);

      const dataStream1 = await savedObjectService.getDataStream('workflow-ds-1');
      await savedObjectService.updateDataStream(
        {
          integration_id: integrationId,
          data_stream_id: 'workflow-ds-1',
          created_by: 'test-user',
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
        dataStream1.attributes.metadata?.version || '0.0.0',
        undefined,
        { version: dataStream1.version! }
      );

      integration = await savedObjectService.getIntegration(integrationId);
      await savedObjectService.updateIntegration(
        {
          integration_id: integrationId,
          data_stream_count: 2,
          created_by: 'test-user',
          status: TASK_STATUSES.completed,
          metadata: {
            title: 'Workflow Test Integration - Completed',
            version: '0.0.2',
          },
        },
        integration.attributes.metadata?.version || '0.0.0'
      );

      const finalIntegration = await savedObjectService.getIntegration(integrationId);
      expect(finalIntegration.attributes.status).toBe(TASK_STATUSES.completed);
      expect(finalIntegration.attributes.data_stream_count).toBe(2);

      const dataStreams = await savedObjectService.findAllDataStreamsByIntegrationId(integrationId);
      expect(dataStreams.total).toBe(2);

      await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'workflow-ds-1');
      await savedObjectsClient.delete(DATA_STREAM_SAVED_OBJECT_TYPE, 'workflow-ds-2');
      await savedObjectsClient.delete(INTEGRATION_SAVED_OBJECT_TYPE, integrationId);
    });
  });
});
