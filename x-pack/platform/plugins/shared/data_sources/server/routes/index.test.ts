/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { registerRoutes, type RouteDependencies } from '.';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../saved_objects';
import * as helpers from './data_sources_helpers';

// Mock the helper functions
jest.mock('./data_sources_helpers', () => ({
  ...jest.requireActual('./data_sources_helpers'),
  createDataSourceAndRelatedResources: jest.fn(),
  deleteDataSourceAndRelatedResources: jest.fn(),
}));

const mockCreateDataSourceAndRelatedResources =
  helpers.createDataSourceAndRelatedResources as jest.MockedFunction<
    typeof helpers.createDataSourceAndRelatedResources
  >;
const mockDeleteDataSourceAndRelatedResources =
  helpers.deleteDataSourceAndRelatedResources as jest.MockedFunction<
    typeof helpers.deleteDataSourceAndRelatedResources
  >;

describe('registerRoutes', () => {
  const mockLogger = loggerMock.create();
  const mockRouter = httpServiceMock.createRouter();
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const mockActionsClient = {
    create: jest.fn(),
    delete: jest.fn(),
  };
  const mockToolRegistry = {
    create: jest.fn(),
    delete: jest.fn(),
    getRegistry: jest.fn(),
  };
  const mockWorkflowManagement = {
    management: {
      createWorkflow: jest.fn(),
      deleteWorkflows: jest.fn(),
    },
  };
  const mockDataCatalog = {
    getCatalog: jest.fn(),
  };

  const mockGetStartServices = jest.fn().mockResolvedValue([
    {},
    {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
      },
      dataCatalog: mockDataCatalog,
      agentBuilder: {
        tools: {
          getRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
        },
      },
    },
  ]);

  const createMockContext = () => ({
    core: Promise.resolve({
      savedObjects: {
        client: mockSavedObjectsClient,
      },
    }),
  });

  const dependencies: RouteDependencies = {
    router: mockRouter,
    logger: mockLogger,
    getStartServices: mockGetStartServices,
    workflowManagement: mockWorkflowManagement as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSavedObjectsClient.getCurrentNamespace.mockReturnValue('default');
  });

  describe('GET /api/data_sources', () => {
    it('should list all data sources', async () => {
      const mockDataSources = [
        {
          id: 'data-source-1',
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'Test Data Source 1',
            type: 'notion',
            config: {},
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            workflowIds: ['workflow-1'],
            toolIds: ['tool-1'],
            kscIds: ['ksc-1'],
          },
          references: [],
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'data-source-2',
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'Test Data Source 2',
            type: 'notion',
            config: {},
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
            workflowIds: ['workflow-2'],
            toolIds: ['tool-2'],
            kscIds: ['ksc-2'],
          },
          references: [],
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
      ];

      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: mockDataSources as any,
        total: 2,
        per_page: 100,
        page: 1,
      });

      registerRoutes(dependencies);

      const routeHandler = mockRouter.get.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { page: 1, per_page: 100 },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        perPage: 100,
        page: 1,
      });
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          dataSources: expect.arrayContaining([
            expect.objectContaining({ id: 'data-source-1' }),
            expect.objectContaining({ id: 'data-source-2' }),
          ]),
          total: 2,
        },
      });
    });

    it('should handle errors when listing data sources fails', async () => {
      mockSavedObjectsClient.find.mockRejectedValue(new Error('Database error'));

      registerRoutes(dependencies);

      const routeHandler = mockRouter.get.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { page: 1, per_page: 100 },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to list data sources: Database error',
        },
      });
    });

    describe('pagination', () => {
      const createMockDataSource = (id: string, name: string, type: string) => ({
        id,
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        attributes: {
          name,
          type,
          config: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          workflowIds: [`workflow-${id}`],
          toolIds: [`tool-${id}`],
          kscIds: [`ksc-${id}`],
        },
        references: [],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      it('should use provided page and per_page values', async () => {
        const mockFindResult = {
          page: 2,
          per_page: 10,
          total: 25,
          saved_objects: [
            createMockDataSource('11', 'Data Source 11', 'github'),
            createMockDataSource('12', 'Data Source 12', 'notion'),
          ],
        };

        mockSavedObjectsClient.find.mockResolvedValue(mockFindResult as any);

        registerRoutes(dependencies);

        const routeHandler = mockRouter.get.mock.calls[0][1];
        const mockRequest = httpServerMock.createKibanaRequest({
          query: { page: 2, per_page: 10 },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(createMockContext(), mockRequest, mockResponse);

        expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          perPage: 10,
          page: 2,
        });

        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: expect.objectContaining({
            dataSources: expect.any(Array),
            total: 25,
          }),
        });
      });

      it('should handle page=0 (first page)', async () => {
        const mockFindResult = {
          page: 0,
          per_page: 5,
          total: 3,
          saved_objects: [createMockDataSource('1', 'Data Source 1', 'github')],
        };

        mockSavedObjectsClient.find.mockResolvedValue(mockFindResult as any);

        registerRoutes(dependencies);

        const routeHandler = mockRouter.get.mock.calls[0][1];
        const mockRequest = httpServerMock.createKibanaRequest({
          query: { page: 0, per_page: 5 },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(createMockContext(), mockRequest, mockResponse);

        expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          perPage: 5,
          page: 0,
        });
      });

      it('should paginate with per_page=1 across multiple pages', async () => {
        const totalDataSources = 3;

        // First page - should return first data source
        const mockFindResultPage1 = {
          page: 1,
          per_page: 1,
          total: totalDataSources,
          saved_objects: [createMockDataSource('1', 'Data Source 1', 'github')],
        };

        mockSavedObjectsClient.find.mockResolvedValue(mockFindResultPage1 as any);

        registerRoutes(dependencies);

        const routeHandler = mockRouter.get.mock.calls[0][1];
        const mockRequest = httpServerMock.createKibanaRequest({
          query: { page: 1, per_page: 1 },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(createMockContext(), mockRequest, mockResponse);

        expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          perPage: 1,
          page: 1,
        });

        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            dataSources: expect.arrayContaining([
              expect.objectContaining({
                id: '1',
                name: 'Data Source 1',
                type: 'github',
              }),
            ]),
            total: totalDataSources,
          },
        });

        // Second page - should return second data source
        const mockFindResultPage2 = {
          page: 2,
          per_page: 1,
          total: totalDataSources,
          saved_objects: [createMockDataSource('2', 'Data Source 2', 'notion')],
        };

        mockSavedObjectsClient.find.mockResolvedValue(mockFindResultPage2 as any);
        mockResponse.ok.mockClear();

        const mockRequestPage2 = httpServerMock.createKibanaRequest({
          query: { page: 2, per_page: 1 },
        });

        await routeHandler(createMockContext(), mockRequestPage2, mockResponse);

        expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          perPage: 1,
          page: 2,
        });

        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            dataSources: expect.arrayContaining([
              expect.objectContaining({
                id: '2',
                name: 'Data Source 2',
                type: 'notion',
              }),
            ]),
            total: totalDataSources,
          },
        });
      });

      it('should return dataSources array and total count', async () => {
        const mockFindResult = {
          page: 1,
          per_page: 20,
          total: 42,
          saved_objects: [createMockDataSource('1', 'Test Data Source', 'github')],
        };

        mockSavedObjectsClient.find.mockResolvedValue(mockFindResult as any);

        registerRoutes(dependencies);

        const routeHandler = mockRouter.get.mock.calls[0][1];
        const mockRequest = httpServerMock.createKibanaRequest({
          query: { page: 1, per_page: 20 },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(createMockContext(), mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            dataSources: expect.arrayContaining([
              expect.objectContaining({
                id: '1',
                name: 'Test Data Source',
                type: 'github',
              }),
            ]),
            total: 42,
          },
        });
      });

      it('should return empty array when no data sources found', async () => {
        const mockFindResult = {
          page: 1,
          per_page: 20,
          total: 0,
          saved_objects: [],
        };

        mockSavedObjectsClient.find.mockResolvedValue(mockFindResult as any);

        registerRoutes(dependencies);

        const routeHandler = mockRouter.get.mock.calls[0][1];
        const mockRequest = httpServerMock.createKibanaRequest({
          query: { page: 1, per_page: 20 },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(createMockContext(), mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            dataSources: [],
            total: 0,
          },
        });
      });

      it('should handle saved objects client errors with pagination', async () => {
        const error = new Error('Elasticsearch connection failed');
        mockSavedObjectsClient.find.mockRejectedValue(error);

        registerRoutes(dependencies);

        const routeHandler = mockRouter.get.mock.calls[0][1];
        const mockRequest = httpServerMock.createKibanaRequest({
          query: { page: 1, per_page: 20 },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(createMockContext(), mockRequest, mockResponse);

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to list all data sources: Elasticsearch connection failed'
        );

        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: {
            message: 'Failed to list data sources: Elasticsearch connection failed',
          },
        });
      });
    });
  });

  describe('GET /api/data_sources/:id', () => {
    it('should get a single data source by ID', async () => {
      const mockDataSource = {
        id: 'data-source-1',
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'Test Data Source',
          type: 'notion',
          config: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          workflowIds: ['workflow-1'],
          toolIds: ['tool-1'],
          kscIds: ['ksc-1'],
        },
        references: [],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockSavedObjectsClient.get.mockResolvedValue(mockDataSource);

      registerRoutes(dependencies);

      const routeHandler = mockRouter.get.mock.calls[1][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'data-source-1' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        DATA_SOURCE_SAVED_OBJECT_TYPE,
        'data-source-1'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          id: 'data-source-1',
          name: 'Test Data Source',
        }),
      });
    });

    it('should handle errors when getting a data source fails', async () => {
      mockSavedObjectsClient.get.mockRejectedValue(new Error('Not found'));

      registerRoutes(dependencies);

      const routeHandler = mockRouter.get.mock.calls[1][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'nonexistent' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to fetch data source: Not found',
        },
      });
    });
  });

  describe('POST /api/data_sources', () => {
    it('should create a new data source and call the helper with correct params', async () => {
      const mockDataSource = {
        stackConnector: { type: '.bearer_connector' },
        generateWorkflows: jest.fn(),
      };

      mockDataCatalog.getCatalog.mockReturnValue({
        get: jest.fn().mockReturnValue(mockDataSource),
      });

      mockCreateDataSourceAndRelatedResources.mockResolvedValue('data-source-1');

      registerRoutes(dependencies);

      const routeHandler = mockRouter.post.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          name: 'My Notion Data Source',
          type: 'notion',
          credentials: 'secret-token-123',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockCreateDataSourceAndRelatedResources).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Notion Data Source',
          type: 'notion',
          credentials: 'secret-token-123',
          dataSource: mockDataSource,
        })
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          message: 'Data source created successfully!',
          dataSourceId: 'data-source-1',
        },
      });
    });

    it('should return 400 if data source type not found', async () => {
      mockDataCatalog.getCatalog.mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      registerRoutes(dependencies);

      const routeHandler = mockRouter.post.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          name: 'Invalid Data Source',
          type: 'invalid-type',
          credentials: 'token',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'Data source type "invalid-type" not found',
        },
      });
      expect(mockCreateDataSourceAndRelatedResources).not.toHaveBeenCalled();
    });

    it('should handle errors during creation', async () => {
      const mockDataSource = {
        stackConnector: { type: '.bearer_connector' },
        generateWorkflows: jest.fn(),
      };

      mockDataCatalog.getCatalog.mockReturnValue({
        get: jest.fn().mockReturnValue(mockDataSource),
      });

      mockCreateDataSourceAndRelatedResources.mockRejectedValue(
        new Error('Failed to create action')
      );

      registerRoutes(dependencies);

      const routeHandler = mockRouter.post.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          name: 'Test Data Source',
          type: 'notion',
          credentials: 'token',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to create data source: Failed to create action',
        },
      });
    });
  });

  describe('DELETE /api/data_sources', () => {
    it('should delete all data sources and return aggregated results', async () => {
      const mockDataSources = [
        {
          id: 'data-source-1',
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'Data Source 1',
            type: 'notion',
            config: {},
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            workflowIds: ['workflow-1'],
            toolIds: ['tool-1'],
            kscIds: ['ksc-1'],
          },
        },
        {
          id: 'data-source-2',
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'Data Source 2',
            type: 'notion',
            config: {},
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
            workflowIds: ['workflow-2'],
            toolIds: ['tool-2'],
            kscIds: ['ksc-2'],
          },
        },
      ];

      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: mockDataSources as any,
        total: 2,
        per_page: 1000,
        page: 1,
      });

      // First data source fully deleted, second partially deleted
      mockDeleteDataSourceAndRelatedResources
        .mockResolvedValueOnce({
          success: true,
          fullyDeleted: true,
        })
        .mockResolvedValueOnce({
          success: true,
          fullyDeleted: false,
          remaining: {
            kscIds: ['ksc-2'],
            toolIds: [],
            workflowIds: [],
          },
        });

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledTimes(2);
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          deletedCount: 2,
          fullyDeletedCount: 1,
          partiallyDeletedCount: 1,
        },
      });
    });

    it('should handle empty data sources list', async () => {
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 1000,
        page: 1,
      });

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          deletedCount: 0,
          fullyDeletedCount: 0,
          partiallyDeletedCount: 0,
        },
      });
      expect(mockDeleteDataSourceAndRelatedResources).not.toHaveBeenCalled();
    });

    it('should handle errors when finding data sources fails', async () => {
      mockSavedObjectsClient.find.mockRejectedValue(new Error('Find failed'));

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to delete all data sources: Find failed',
        },
      });
    });
  });

  describe('DELETE /api/data_sources/:id', () => {
    it('should delete a single data source and return the result', async () => {
      const mockDataSource = {
        id: 'data-source-1',
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'Test Data Source',
          type: 'notion',
          config: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          workflowIds: ['workflow-1'],
          toolIds: ['tool-1'],
          kscIds: ['ksc-1'],
        },
        references: [],
      };

      mockSavedObjectsClient.get.mockResolvedValue(mockDataSource);
      mockDeleteDataSourceAndRelatedResources.mockResolvedValue({
        success: true,
        fullyDeleted: true,
      });

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[1][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'data-source-1' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        DATA_SOURCE_SAVED_OBJECT_TYPE,
        'data-source-1'
      );
      expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledWith(
        expect.objectContaining({
          dataSource: mockDataSource,
        })
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          fullyDeleted: true,
        },
      });
    });

    it('should return partial deletion result', async () => {
      const mockDataSource = {
        id: 'data-source-1',
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'Partial Connector',
          type: 'notion',
          config: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          workflowIds: ['workflow-1'],
          toolIds: ['tool-1'],
          kscIds: ['ksc-1'],
        },
        references: [],
      };

      mockSavedObjectsClient.get.mockResolvedValue(mockDataSource);
      mockDeleteDataSourceAndRelatedResources.mockResolvedValue({
        success: true,
        fullyDeleted: false,
        remaining: {
          kscIds: ['ksc-1'],
          toolIds: [],
          workflowIds: [],
        },
      });

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[1][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'data-source-1' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          fullyDeleted: false,
          remaining: {
            kscIds: ['ksc-1'],
            toolIds: [],
            workflowIds: [],
          },
        },
      });
    });

    it('should handle errors when getting a data source fails', async () => {
      mockSavedObjectsClient.get.mockRejectedValue(new Error('Data source not found'));

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[1][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'nonexistent' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to delete data source: Data source not found',
        },
      });
      expect(mockDeleteDataSourceAndRelatedResources).not.toHaveBeenCalled();
    });
  });
});
