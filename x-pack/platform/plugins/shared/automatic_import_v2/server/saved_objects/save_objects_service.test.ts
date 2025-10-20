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

describe('AutomaticImportSavedObjectService', () => {
  let service: AutomaticImportSavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
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

        const result = await service.updateIntegration(mockIntegrationData);

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
            status: 'active',
            metadata: expect.objectContaining({
              version: 2,
            }),
          }),
          expect.any(Object)
        );

        expect(result).toEqual(mockUpdateResponse);
      });

      it('should throw error if integration not found', async () => {
        const error = new Error('Not found');
        mockSavedObjectsClient.get.mockRejectedValue(error);

        await expect(service.updateIntegration(mockIntegrationData)).rejects.toThrow('Not found');
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
        const mockCreateResponse: SavedObject<DataStreamAttributes> = {
          id: 'test-data-stream-id',
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          attributes: mockDataStreamData,
          references: [],
          version: '1',
        };

        // Mock the integration exists
        mockSavedObjectsClient.get.mockResolvedValue(mockSavedObject);
        mockSavedObjectsClient.create.mockResolvedValue(mockCreateResponse);

        const result = await service.insertDataStream(mockDataStreamData);

        expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id'
        );

        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            integration_id: 'test-integration-id',
            data_stream_id: 'test-data-stream-id',
            job_info: mockDataStreamData.job_info,
            metadata: expect.objectContaining({
              sample_count: 100,
              version: 0,
              created_at: expect.any(String),
            }),
            result: mockDataStreamData.result,
          }),
          expect.objectContaining({
            id: 'test-data-stream-id',
          })
        );

        expect(result).toEqual(mockCreateResponse);
      });

      it('should handle missing result object', async () => {
        const dataStreamWithoutResult = {
          ...mockDataStreamData,
          result: undefined,
        } as any;

        const mockCreateResponse: SavedObject<DataStreamAttributes> = {
          id: 'test-data-stream-id',
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          attributes: mockDataStreamData,
          references: [],
          version: '1',
        };

        mockSavedObjectsClient.get.mockResolvedValue(mockSavedObject);
        mockSavedObjectsClient.create.mockResolvedValue(mockCreateResponse);

        await service.insertDataStream(dataStreamWithoutResult);

        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          DATA_STREAM_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            result: {},
          }),
          expect.any(Object)
        );
      });

      it('should throw error when integration does not exist', async () => {
        const error = new Error('Not found');
        mockSavedObjectsClient.get.mockRejectedValue(error);

        await expect(service.insertDataStream(mockDataStreamData)).rejects.toThrow('Not found');
      });

      it('should handle data stream create errors', async () => {
        mockSavedObjectsClient.get.mockResolvedValue(mockSavedObject);

        const error = new Error('Create failed');
        mockSavedObjectsClient.create.mockRejectedValue(error);

        await expect(service.insertDataStream(mockDataStreamData)).rejects.toThrow(
          'Create failed'
        );
      });

      it('should pass through additional options', async () => {
        const options = { namespace: 'custom-namespace' };
        const mockCreateResponse: SavedObject<DataStreamAttributes> = {
          id: 'test-data-stream-id',
          type: DATA_STREAM_SAVED_OBJECT_TYPE,
          attributes: mockDataStreamData,
          references: [],
          version: '1',
        };

        mockSavedObjectsClient.get.mockResolvedValue(mockSavedObject);
        mockSavedObjectsClient.create.mockResolvedValue(mockCreateResponse);

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

        mockSavedObjectsClient.get
          .mockResolvedValueOnce(mockSavedObject)
          .mockResolvedValueOnce(mockDataStreamSavedObject);
        mockSavedObjectsClient.update.mockResolvedValue(mockUpdateResponse);

        const result = await service.updateDataStream(mockDataStreamData);

        expect(mockSavedObjectsClient.get).toHaveBeenNthCalledWith(1,
          INTEGRATION_SAVED_OBJECT_TYPE,
          'test-integration-id'
        );

        expect(mockSavedObjectsClient.get).toHaveBeenNthCalledWith(2,
          DATA_STREAM_SAVED_OBJECT_TYPE,
          'test-data-stream-id'
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
              version: 2,
            }),
            result: mockDataStreamData.result,
          }),
          expect.any(Object)
        );

        expect(result).toEqual(mockUpdateResponse);
      });

      it('should throw error if integration not found', async () => {
        const error = new Error('Integration not found');
        mockSavedObjectsClient.get.mockRejectedValue(error);

        await expect(service.updateDataStream(mockDataStreamData)).rejects.toThrow('Integration not found');
      });

      it('should throw error if data stream not found', async () => {
        const error = new Error('Data stream not found');
        mockSavedObjectsClient.get
          .mockResolvedValueOnce(mockSavedObject)
          .mockRejectedValueOnce(error);

        await expect(service.updateDataStream(mockDataStreamData)).rejects.toThrow('Data stream not found');
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
