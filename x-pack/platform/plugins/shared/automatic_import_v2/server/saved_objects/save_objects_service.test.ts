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
  SavedObject,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
  Logger,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AutomaticImportSavedObjectService } from './saved_objects_service';
import type { IntegrationAttributes, DataStreamAttributes } from './schemas/types';
import {
  DATA_STREAM_SAVED_OBJECT_TYPE,
  INTEGRATION_SAVED_OBJECT_TYPE,
  TASK_STATUSES,
} from './constants';
import { mockDataStreamData, mockDataStreamSavedObject, mockIntegrationData, mockSavedObject } from '../__mocks__/saved_objects';
import { securityMock } from '@kbn/security-plugin/server/mocks';

describe('AutomaticImportSavedObjectService', () => {
  let service: AutomaticImportSavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockLogger: jest.Mocked<Logger>;
  let security: ReturnType<typeof securityMock.createSetup>;

  beforeEach(() => {
    security = securityMock.createSetup();
    mockSavedObjectsClient = savedObjectsClientMock.create();
    mockLogger = loggerMock.create();

    service = new AutomaticImportSavedObjectService({
      savedObjectsClient: mockSavedObjectsClient,
      logger: mockLogger,
    });

    jest.clearAllMocks();
  });

  describe('Integration Operations', () => {
    describe('insertIntegration', () => {
      it('should successfully create an integration', async () => {
        const mockCreateResponse: SavedObject<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: mockIntegrationData,
          references: [],
          version: '1',
        };

        mockSavedObjectsClient.create.mockResolvedValue(mockCreateResponse);

        const result = await service.insertIntegration(mockIntegrationData);

        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            integration_id: 'test-integration-id',
            data_stream_count: 2,
            status: TASK_STATUSES.pending,
            metadata: expect.objectContaining({
              title: 'Test Integration',
              description: 'A test integration',
              created_at: expect.any(String),
              version: 0,
            }),
          }),
          expect.objectContaining({
            id: 'test-integration-id',
          })
        );

        expect(result).toEqual(mockCreateResponse);
      });

      it('should handle default data_stream_count when not provided', async () => {
        const integrationDataWithoutCount = {
          ...mockIntegrationData,
          data_stream_count: undefined,
        } as any;

        const mockCreateResponse: SavedObject<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: mockIntegrationData,
          references: [],
          version: '1',
        };

        mockSavedObjectsClient.create.mockResolvedValue(mockCreateResponse);

        await service.insertIntegration(integrationDataWithoutCount);

        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            data_stream_count: 0,
          }),
          expect.any(Object)
        );
      });

      it('should handle errors and log them', async () => {
        const error = new Error('Database error');
        mockSavedObjectsClient.create.mockRejectedValue(error);

        await expect(service.insertIntegration(mockIntegrationData)).rejects.toThrow(
          'Database error'
        );
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = { ...mockIntegrationData, integration_id: '' };

        await expect(service.insertIntegration(invalidData)).rejects.toThrow('Integration ID is required');
      });

      it('should throw specific error when integration already exists (conflict)', async () => {
        const conflictError = new Error('Conflict');

        // Mock SavedObjectsErrorHelpers.isConflictError to return true for this specific test
        const isConflictErrorSpy = jest.spyOn(SavedObjectsErrorHelpers, 'isConflictError').mockReturnValue(true);

        mockSavedObjectsClient.create.mockRejectedValue(conflictError);

        await expect(service.insertIntegration(mockIntegrationData)).rejects.toThrow(
          'Integration test-integration-id already exists'
        );

        // Restore original function
        isConflictErrorSpy.mockRestore();
      });

      it('should pass through additional options', async () => {
        const options = { namespace: 'custom-namespace' };
        const mockCreateResponse: SavedObject<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: mockIntegrationData,
          references: [],
          version: '1',
        };

        mockSavedObjectsClient.create.mockResolvedValue(mockCreateResponse);

        await service.insertIntegration(mockIntegrationData, options);

        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          expect.any(Object),
          expect.objectContaining({
            namespace: 'custom-namespace',
            id: 'test-integration-id',
          })
        );
      });
    });

    describe('updateIntegration', () => {
      it('should successfully update an integration', async () => {
        const mockUpdateResponse: SavedObjectsUpdateResponse<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: mockIntegrationData,
          references: [],
          version: '2',
        };

        mockSavedObjectsClient.get.mockResolvedValue(mockSavedObject);
        mockSavedObjectsClient.update.mockResolvedValue(mockUpdateResponse);

        const result = await service.updateIntegration(mockIntegrationData, { version: '1' });

        expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id'
        );

        expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id',
          expect.objectContaining({
            integration_id: 'test-integration-id',
            data_stream_count: 2,
            status: TASK_STATUSES.pending,
            metadata: expect.objectContaining({
              version: 1,
            }),
          }),
          expect.any(Object)
        );

        expect(result).toEqual(mockUpdateResponse);
      });

      it('should throw error if integration not found', async () => {
        const error = new Error('Not found');
        mockSavedObjectsClient.get.mockRejectedValue(error);

        await expect(service.updateIntegration(mockIntegrationData, { version: '1' })).rejects.toThrow('Not found');
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = { ...mockIntegrationData, integration_id: '' };

        await expect(service.updateIntegration(invalidData, { version: '1' })).rejects.toThrow('Integration ID is required');
      });
    });

    describe('getIntegration', () => {
      it('should successfully get an integration by ID', async () => {
        mockSavedObjectsClient.get.mockResolvedValue(mockSavedObject);

        const result = await service.getIntegration('test-integration-id');

        expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id'
        );
        expect(result).toEqual(mockSavedObject);
      });

      it('should handle errors and log them', async () => {
        const error = new Error('Not found');
        mockSavedObjectsClient.get.mockRejectedValue(error);

        await expect(service.getIntegration('test-integration-id')).rejects.toThrow('Not found');
      });
    });

    describe('getAllIntegrations', () => {
      it('should successfully get all integrations', async () => {
        const mockFindResponse: SavedObjectsFindResponse<IntegrationAttributes> = {
          saved_objects: [{ ...mockSavedObject, score: 1 }],
          total: 1,
          per_page: 20,
          page: 1,
        };

        mockSavedObjectsClient.find.mockResolvedValue(mockFindResponse);

        const result = await service.getAllIntegrations();

        expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
          type: INTEGRATION_SAVED_OBJECT_TYPE,
        });
        expect(result).toEqual(mockFindResponse);
      });

      it('should handle errors and log them', async () => {
        const error = new Error('Database error');
        mockSavedObjectsClient.find.mockRejectedValue(error);

        await expect(service.getAllIntegrations()).rejects.toThrow('Database error');
      });
    });

    describe('deleteIntegration', () => {
      it('should successfully delete an integration', async () => {
        const mockDeleteResponse = {};
        mockSavedObjectsClient.delete.mockResolvedValue(mockDeleteResponse);

        const result = await service.deleteIntegration('test-integration-id');

        expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id',
          undefined
        );
        expect(result).toEqual(mockDeleteResponse);
      });

      it('should pass through delete options', async () => {
        const options = { namespace: 'custom-namespace' };
        const mockDeleteResponse = {};
        mockSavedObjectsClient.delete.mockResolvedValue(mockDeleteResponse);

        await service.deleteIntegration('test-integration-id', options);

        expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id',
          options
        );
      });

      it('should handle errors and log them', async () => {
        const error = new Error('Delete failed');
        mockSavedObjectsClient.delete.mockRejectedValue(error);

        await expect(service.deleteIntegration('test-integration-id')).rejects.toThrow(
          'Delete failed'
        );
      });
    });
  });

  describe('Data Stream Operations', () => {
    describe('insertDataStream', () => {
      it('should successfully create a data stream', async () => {
        const existingIntegration: SavedObject<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: {
            integration_id: 'test-integration-id',
            data_stream_count: 1,
            status: TASK_STATUSES.pending,
            metadata: {
              created_at: '2024-01-01T00:00:00.000Z',
              version: 0,
              title: 'Test Integration',
            },
          },
          references: [],
          version: '1',
        };

        const mockUpdateResponse: SavedObjectsUpdateResponse<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: {
            ...existingIntegration.attributes,
            data_stream_count: 2,
          },
          references: [],
          version: '2',
        };

        const mockCreateResponse: SavedObject<DataStreamAttributes> = {
          id: 'test-data-stream-id',
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          attributes: mockDataStreamData,
          references: [],
          version: '1',
        };

        // Mock the integration exists, then create data stream succeeds, then update integration succeeds
        mockSavedObjectsClient.get.mockResolvedValue(existingIntegration);
        mockSavedObjectsClient.create.mockResolvedValue(mockCreateResponse);
        mockSavedObjectsClient.update.mockResolvedValue(mockUpdateResponse);

        const result = await service.insertDataStream(mockDataStreamData);

        // Should call get first to check if integration exists
        expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id'
        );

        // Should call create next to create the data stream
        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            integration_id: 'test-integration-id',
            data_stream_id: 'test-data-stream-id',
            job_info: mockDataStreamData.job_info,
            metadata: expect.objectContaining({
              sample_count: 100,
              created_at: expect.any(String),
            }),
            result: mockDataStreamData.result,
          }),
          expect.objectContaining({
            id: 'test-data-stream-id',
          })
        );

        // Should call update last to increment data_stream_count
        expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id',
          expect.objectContaining({
            integration_id: 'test-integration-id',
            data_stream_count: 2,
          }),
          expect.objectContaining({
            version: '1',
          })
        );

        expect(result).toEqual(mockCreateResponse);
      });

      it('should handle missing result object', async () => {
        const dataStreamWithoutResult = {
          ...mockDataStreamData,
          result: undefined,
        } as any;

        const existingIntegration: SavedObject<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: mockIntegrationData,
          references: [],
          version: '1',
        };

        const mockUpdateResponse: SavedObjectsUpdateResponse<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: {
            ...existingIntegration.attributes,
            data_stream_count: existingIntegration.attributes.data_stream_count + 1,
          },
          references: [],
          version: '2',
        };

        const mockCreateResponse: SavedObject<DataStreamAttributes> = {
          id: 'test-data-stream-id',
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          attributes: mockDataStreamData,
          references: [],
          version: '1',
        };

        mockSavedObjectsClient.get.mockResolvedValue(existingIntegration);
        mockSavedObjectsClient.create.mockResolvedValue(mockCreateResponse);
        mockSavedObjectsClient.update.mockResolvedValue(mockUpdateResponse);

        await service.insertDataStream(dataStreamWithoutResult);

        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            result: {},
          }),
          expect.any(Object)
        );
      });

      it('should automatically create integration when it does not exist', async () => {
        const integrationNotFoundError = new Error('Integration not found');
        const mockIntegrationCreateResponse: SavedObject<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: {
            integration_id: 'test-integration-id',
            data_stream_count: 1,
            status: TASK_STATUSES.pending,
            metadata: {
              created_at: expect.any(String),
              version: 0,
              title: 'Auto-generated integration test-integration-id',
            },
          },
          references: [],
          version: '1',
        };

        const mockDataStreamCreateResponse: SavedObject<DataStreamAttributes> = {
          id: 'test-data-stream-id',
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          attributes: mockDataStreamData,
          references: [],
          version: '1',
        };

        // Mock getIntegration to fail first, then data stream creation to succeed, then integration creation to succeed
        mockSavedObjectsClient.get.mockRejectedValueOnce(integrationNotFoundError);
        mockSavedObjectsClient.create
          .mockResolvedValueOnce(mockDataStreamCreateResponse) // For data stream creation (happens first now)
          .mockResolvedValueOnce(mockIntegrationCreateResponse); // For integration creation (happens after)

        const result = await service.insertDataStream(mockDataStreamData);

        // Should call get to check if integration exists
        expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id'
        );

        // Should call create twice - once for data stream, once for integration
        expect(mockSavedObjectsClient.create).toHaveBeenCalledTimes(2);

        // First call should create the data stream
        expect(mockSavedObjectsClient.create).toHaveBeenNthCalledWith(1,
          DATA_STREAM_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            integration_id: 'test-integration-id',
            data_stream_id: 'test-data-stream-id',
          }),
          expect.objectContaining({
            id: 'test-data-stream-id',
          })
        );

        // Second call should create the integration
        expect(mockSavedObjectsClient.create).toHaveBeenNthCalledWith(2,
          INTEGRATION_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            integration_id: 'test-integration-id',
            data_stream_count: 1,
            status: TASK_STATUSES.pending,
            metadata: expect.objectContaining({
              created_at: expect.any(String),
              version: 0,
              title: 'Auto-generated integration test-integration-id',
            }),
          }),
          expect.objectContaining({
            id: 'test-integration-id',
          })
        );

        expect(result).toEqual(mockDataStreamCreateResponse);
      });

      it('should increment data_stream_count when integration already exists', async () => {
        const existingIntegration: SavedObject<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: {
            integration_id: 'test-integration-id',
            data_stream_count: 2,
            status: TASK_STATUSES.pending,
            metadata: {
              created_at: '2024-01-01T00:00:00.000Z',
              version: 1,
              title: 'Existing Integration',
            },
          },
          references: [],
          version: '2',
        };

        const mockUpdateResponse: SavedObjectsUpdateResponse<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: {
            ...existingIntegration.attributes,
            data_stream_count: 3,
          },
          references: [],
          version: '3',
        };

        const mockDataStreamCreateResponse: SavedObject<DataStreamAttributes> = {
          id: 'test-data-stream-id',
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          attributes: mockDataStreamData,
          references: [],
          version: '1',
        };

        // Mock getIntegration to succeed, then create data stream to succeed, then update integration to succeed
        mockSavedObjectsClient.get.mockResolvedValue(existingIntegration);
        mockSavedObjectsClient.create.mockResolvedValue(mockDataStreamCreateResponse);
        mockSavedObjectsClient.update.mockResolvedValue(mockUpdateResponse);

        const result = await service.insertDataStream(mockDataStreamData);

        // Should call get to check if integration exists
        expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id'
        );

        // Should call create first for the data stream
        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            integration_id: 'test-integration-id',
            data_stream_id: 'test-data-stream-id',
          }),
          expect.objectContaining({
            id: 'test-data-stream-id',
          })
        );

        // Should call update after data stream creation to increment data_stream_count
        expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id',
          expect.objectContaining({
            integration_id: 'test-integration-id',
            data_stream_count: 3,
            status: TASK_STATUSES.pending,
            metadata: expect.objectContaining({
              created_at: '2024-01-01T00:00:00.000Z',
              version: 2,
              title: 'Existing Integration',
            }),
          }),
          expect.objectContaining({
            version: '2',
          })
        );

        expect(result).toEqual(mockDataStreamCreateResponse);
      });

      it('should handle data stream create errors', async () => {
        const existingIntegration: SavedObject<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: mockIntegrationData,
          references: [],
          version: '1',
        };

        mockSavedObjectsClient.get.mockResolvedValue(existingIntegration);

        const error = new Error('Create failed');
        mockSavedObjectsClient.create.mockRejectedValue(error);

        await expect(service.insertDataStream(mockDataStreamData)).rejects.toThrow(
          'Create failed'
        );

        // Should not call update since data stream creation failed
        expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
      });

      it('should pass through additional options', async () => {
        const options = { namespace: 'custom-namespace' };

        const existingIntegration: SavedObject<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: mockIntegrationData,
          references: [],
          version: '1',
        };

        const mockUpdateResponse: SavedObjectsUpdateResponse<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: {
            ...existingIntegration.attributes,
            data_stream_count: existingIntegration.attributes.data_stream_count + 1,
          },
          references: [],
          version: '2',
        };

        const mockCreateResponse: SavedObject<DataStreamAttributes> = {
          id: 'test-data-stream-id',
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          attributes: mockDataStreamData,
          references: [],
          version: '1',
        };

        mockSavedObjectsClient.get.mockResolvedValue(existingIntegration);
        mockSavedObjectsClient.create.mockResolvedValue(mockCreateResponse);
        mockSavedObjectsClient.update.mockResolvedValue(mockUpdateResponse);

        await service.insertDataStream(mockDataStreamData, options);

        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          expect.any(Object),
          expect.objectContaining({
            namespace: 'custom-namespace',
            id: 'test-data-stream-id',
          })
        );
      });

      it('should not fail when integration update fails after successful data stream creation', async () => {
        const existingIntegration: SavedObject<IntegrationAttributes> = {
          id: 'test-integration-id',
          type: INTEGRATION_SAVED_OBJECT_TYPE,
          attributes: mockIntegrationData,
          references: [],
          version: '1',
        };

        const mockCreateResponse: SavedObject<DataStreamAttributes> = {
          id: 'test-data-stream-id',
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          attributes: mockDataStreamData,
          references: [],
          version: '1',
        };

        mockSavedObjectsClient.get.mockResolvedValue(existingIntegration);
        mockSavedObjectsClient.create.mockResolvedValue(mockCreateResponse);

        const updateError = new Error('Integration update failed');
        mockSavedObjectsClient.update.mockRejectedValue(updateError);

        // Data stream creation should succeed even if integration update fails
        const result = await service.insertDataStream(mockDataStreamData);

        // Should still return the created data stream
        expect(result).toEqual(mockCreateResponse);

        // Should have attempted to create the data stream
        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          expect.any(Object),
          expect.any(Object)
        );

        // Should have attempted to update the integration
        expect(mockSavedObjectsClient.update).toHaveBeenCalled();
      });

      it('should not fail when integration creation fails after successful data stream creation', async () => {
        const integrationNotFoundError = new Error('Integration not found');

        const mockDataStreamCreateResponse: SavedObject<DataStreamAttributes> = {
          id: 'test-data-stream-id',
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          attributes: mockDataStreamData,
          references: [],
          version: '1',
        };

        mockSavedObjectsClient.get.mockRejectedValueOnce(integrationNotFoundError);
        mockSavedObjectsClient.create
          .mockResolvedValueOnce(mockDataStreamCreateResponse) // For data stream creation (succeeds)
          .mockRejectedValueOnce(new Error('Integration creation failed')); // For integration creation (fails)

        // Data stream creation should succeed even if integration creation fails
        const result = await service.insertDataStream(mockDataStreamData);

        // Should still return the created data stream
        expect(result).toEqual(mockDataStreamCreateResponse);

        // Should have attempted to create the data stream first
        expect(mockSavedObjectsClient.create).toHaveBeenNthCalledWith(1,
          DATA_STREAM_SAVED_OBJECT_TYPE,
          expect.any(Object),
          expect.any(Object)
        );

        // Should have attempted to create the integration second
        expect(mockSavedObjectsClient.create).toHaveBeenNthCalledWith(2,
          INTEGRATION_SAVED_OBJECT_TYPE,
          expect.any(Object),
          expect.any(Object)
        );
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = { ...mockDataStreamData, integration_id: '' };

        await expect(service.insertDataStream(invalidData)).rejects.toThrow('Integration ID is required');
      });

      it('should throw error when data_stream_id is missing', async () => {
        const invalidData = { ...mockDataStreamData, data_stream_id: '' };

        await expect(service.insertDataStream(invalidData)).rejects.toThrow('Data stream ID is required');
      });

      it('should throw specific error when data stream already exists (conflict)', async () => {
        mockSavedObjectsClient.get.mockResolvedValue(mockSavedObject);

        const conflictError = new Error('Conflict');

        // Mock SavedObjectsErrorHelpers.isConflictError to return true for this specific test
        const isConflictErrorSpy = jest.spyOn(SavedObjectsErrorHelpers, 'isConflictError').mockReturnValue(true);

        mockSavedObjectsClient.create.mockRejectedValue(conflictError);

        await expect(service.insertDataStream(mockDataStreamData)).rejects.toThrow(
          'Data stream test-data-stream-id already exists'
        );

        // Restore original function
        isConflictErrorSpy.mockRestore();
      });
    });

    describe('updateDataStream', () => {
      it('should successfully update a data stream', async () => {
        const mockUpdateResponse: SavedObjectsUpdateResponse<DataStreamAttributes> = {
          id: 'test-data-stream-id',
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          attributes: mockDataStreamData,
          references: [],
          version: '2',
        };

        mockSavedObjectsClient.get.mockResolvedValue(mockSavedObject);
        mockSavedObjectsClient.update.mockResolvedValue(mockUpdateResponse);

        const result = await service.updateDataStream(mockDataStreamData, { version: '1' });

        expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id'
        );

        expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          'test-data-stream-id',
          expect.objectContaining({
            integration_id: 'test-integration-id',
            data_stream_id: 'test-data-stream-id',
            job_info: mockDataStreamData.job_info,
            metadata: expect.objectContaining({
              sample_count: 100,
            }),
            result: mockDataStreamData.result,
          }),
          expect.any(Object)
        );

        expect(result).toEqual(mockUpdateResponse);
      });

      it('should throw error if integration not found', async () => {
        const error = new Error('Integration associated with this data stream test-integration-id not found');
        mockSavedObjectsClient.get.mockRejectedValue(error);

        await expect(service.updateDataStream(mockDataStreamData, { version: '1' })).rejects.toThrow(
          'Integration associated with this data stream test-integration-id not found'
        );
      });

      it('should throw error if update operation fails', async () => {
        mockSavedObjectsClient.get.mockResolvedValue(mockSavedObject);

        const error = new Error('Update failed');
        mockSavedObjectsClient.update.mockRejectedValue(error);

        await expect(service.updateDataStream(mockDataStreamData, { version: '1' })).rejects.toThrow('Update failed');
      });

      it('should throw error when integration_id is missing', async () => {
        const invalidData = { ...mockDataStreamData, integration_id: '' };

        await expect(service.updateDataStream(invalidData, { version: '1' })).rejects.toThrow('Integration ID is required');
      });

      it('should throw error when data_stream_id is missing', async () => {
        const invalidData = { ...mockDataStreamData, data_stream_id: '' };

        await expect(service.updateDataStream(invalidData, { version: '1' })).rejects.toThrow('Data stream ID is required');
      });

      it('should throw specific error when data stream update conflicts', async () => {
        mockSavedObjectsClient.get.mockResolvedValue(mockSavedObject);

        const conflictError = new Error('Conflict');

        // Mock SavedObjectsErrorHelpers.isConflictError to return true for this specific test
        const isConflictErrorSpy = jest.spyOn(SavedObjectsErrorHelpers, 'isConflictError').mockReturnValue(true);

        mockSavedObjectsClient.update.mockRejectedValue(conflictError);

        await expect(service.updateDataStream(mockDataStreamData, { version: '1' })).rejects.toThrow(
          'Data stream test-data-stream-id has been updated since you last fetched it. Please fetch the latest version and try again.'
        );

        // Restore original function
        isConflictErrorSpy.mockRestore();
      });
    });

    describe('getDataStream', () => {
      it('should successfully get a data stream by ID', async () => {
        mockSavedObjectsClient.get.mockResolvedValue(mockDataStreamSavedObject);

        const result = await service.getDataStream('test-data-stream-id');

        expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          'test-data-stream-id'
        );
        expect(result).toEqual(mockDataStreamSavedObject);
      });

      it('should handle errors and log them', async () => {
        const error = new Error('Not found');
        mockSavedObjectsClient.get.mockRejectedValue(error);

        await expect(service.getDataStream('test-data-stream-id')).rejects.toThrow('Not found');
      });
    });

    describe('getAllDataStreams', () => {
      it('should successfully get all data streams', async () => {
        const mockFindResponse: SavedObjectsFindResponse<DataStreamAttributes> = {
          saved_objects: [{ ...mockDataStreamSavedObject, score: 1 }],
          total: 1,
          per_page: 20,
          page: 1,
        };

        mockSavedObjectsClient.find.mockResolvedValue(mockFindResponse);

        const result = await service.getAllDataStreams();

        expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
        });
        expect(result).toEqual(mockFindResponse);
      });

      it('should handle errors and log them', async () => {
        const error = new Error('Database error');
        mockSavedObjectsClient.find.mockRejectedValue(error);

        await expect(service.getAllDataStreams()).rejects.toThrow('Database error');
      });
    });

    describe('findAllDataStreamsByIntegrationId', () => {
      it('should successfully find data streams by integration ID', async () => {
        const mockFindResponse: SavedObjectsFindResponse<DataStreamAttributes> = {
          saved_objects: [{ ...mockDataStreamSavedObject, score: 1 }],
          total: 1,
          per_page: 20,
          page: 1,
        };

        mockSavedObjectsClient.find.mockResolvedValue(mockFindResponse);

        const result = await service.findAllDataStreamsByIntegrationId('test-integration-id');

        expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          filter: `${DATA_STREAM_SAVED_OBJECT_TYPE}.attributes.integration_id: "test-integration-id"`,
        });
        expect(result).toEqual(mockFindResponse);
      });

      it('should handle errors and log them', async () => {
        const error = new Error('Query error');
        mockSavedObjectsClient.find.mockRejectedValue(error);

        await expect(
          service.findAllDataStreamsByIntegrationId('test-integration-id')
        ).rejects.toThrow('Query error');
      });
    });

    describe('deleteDataStream', () => {
      it('should successfully delete a data stream', async () => {
        const mockDeleteResponse = {};
        mockSavedObjectsClient.delete.mockResolvedValue(mockDeleteResponse);

        const result = await service.deleteDataStream('test-data-stream-id');

        expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          'test-data-stream-id',
          undefined
        );
        expect(result).toEqual(mockDeleteResponse);
      });

      it('should pass through delete options', async () => {
        const options = { namespace: 'custom-namespace' };
        const mockDeleteResponse = {};
        mockSavedObjectsClient.delete.mockResolvedValue(mockDeleteResponse);

        await service.deleteDataStream('test-data-stream-id', options);

        expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          'test-data-stream-id',
          options
        );
      });

      it('should handle errors and log them', async () => {
        const error = new Error('Delete failed');
        mockSavedObjectsClient.delete.mockRejectedValue(error);

        await expect(service.deleteDataStream('test-data-stream-id')).rejects.toThrow(
          'Delete failed'
        );
      });
    });
  });

  describe('Constructor', () => {
    it('should initialize with provided savedObjectsClient and logger', () => {
      const newService = new AutomaticImportSavedObjectService({
        savedObjectsClient: mockSavedObjectsClient,
        logger: mockLogger,
      });

      expect(newService).toBeInstanceOf(AutomaticImportSavedObjectService);
    });
  });
});

