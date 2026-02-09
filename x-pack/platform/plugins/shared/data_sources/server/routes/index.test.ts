/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { RequestHandlerContext } from '@kbn/core/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { registerRoutes, type RouteDependencies } from '.';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../saved_objects';
import {
  DATASOURCES_SCOPE,
  TASK_NOT_FOUND_ERROR,
  TASK_MANAGER_NOT_AVAILABLE_ERROR,
  DEFAULT_ITEMS_PER_PAGE,
  WORKFLOWS_SCOPE,
  TOOLS_SCOPE,
} from '../../common/constants';
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
        per_page: DEFAULT_ITEMS_PER_PAGE,
        page: 1,
      });

      // Mock catalog to return iconType
      mockDataCatalog.getCatalog.mockReturnValue({
        get: jest.fn().mockReturnValue({ iconType: '.notion' }),
      });

      registerRoutes(dependencies);

      const routeHandler = mockRouter.get.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { from: 0, size: DEFAULT_ITEMS_PER_PAGE },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        perPage: DEFAULT_ITEMS_PER_PAGE,
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
        query: { from: 0, size: DEFAULT_ITEMS_PER_PAGE },
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

      it('should use provided from and size values', async () => {
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
          query: { from: 10, size: 10 },
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

      it('should handle from=0 (first page)', async () => {
        const mockFindResult = {
          page: 1,
          per_page: 5,
          total: 3,
          saved_objects: [createMockDataSource('1', 'Data Source 1', 'github')],
        };

        mockSavedObjectsClient.find.mockResolvedValue(mockFindResult as any);

        registerRoutes(dependencies);

        const routeHandler = mockRouter.get.mock.calls[0][1];
        const mockRequest = httpServerMock.createKibanaRequest({
          query: { from: 0, size: 5 },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler(createMockContext(), mockRequest, mockResponse);

        expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          perPage: 5,
          page: 1,
        });
      });

      it('should paginate with size=1 across multiple pages', async () => {
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
          query: { from: 0, size: 1 },
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
          query: { from: 1, size: 1 },
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
          query: { from: 0, size: 20 },
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
          query: { from: 0, size: 20 },
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
          query: { from: 0, size: 20 },
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

      // Mock catalog to return iconType
      mockDataCatalog.getCatalog.mockReturnValue({
        get: jest.fn().mockReturnValue({ iconType: '.notion' }),
      });

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
    it('should schedule task and return taskId immediately', async () => {
      const mockTaskManager = {
        ensureScheduled: jest.fn().mockResolvedValue({
          id: 'test-task-id',
          taskType: 'data-sources:bulk-delete-task',
          state: { isDone: false, deletedCount: 0, errors: [] },
        }),
      };

      mockGetStartServices.mockResolvedValue([
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
          taskManager: mockTaskManager,
        },
      ]);

      const mockDataSourcesForBulkDelete = [
        { id: 'ds-1', type: DATA_SOURCE_SAVED_OBJECT_TYPE, attributes: {}, references: [] },
        { id: 'ds-2', type: DATA_SOURCE_SAVED_OBJECT_TYPE, attributes: {}, references: [] },
      ];
      const mockFinder = {
        find: jest.fn().mockImplementation(async function* () {
          yield {
            saved_objects: mockDataSourcesForBulkDelete,
            total: 2,
            page: 1,
            per_page: 1000,
          };
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };
      mockSavedObjectsClient.createPointInTimeFinder = jest.fn().mockReturnValue(mockFinder as any);

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: 'data-sources:bulk-delete-task',
          scope: [DATASOURCES_SCOPE, WORKFLOWS_SCOPE, TOOLS_SCOPE],
          state: { isDone: false, deletedCount: 0, errors: [] },
          params: { dataSourceIds: ['ds-1', 'ds-2'] },
        }),
        expect.objectContaining({
          request: expect.any(Object),
        })
      );

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          taskId: expect.any(String),
        }),
      });
    });

    it('should return 503 when task manager is not available', async () => {
      mockGetStartServices.mockResolvedValue([
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
          taskManager: undefined,
        },
      ]);

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: {
          message: TASK_MANAGER_NOT_AVAILABLE_ERROR,
        },
      });
    });

    it('should handle errors when task scheduling fails', async () => {
      const mockTaskManager = {
        ensureScheduled: jest.fn().mockRejectedValue(new Error('Failed to schedule task')),
      };

      mockGetStartServices.mockResolvedValue([
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
          taskManager: mockTaskManager,
        },
      ]);

      const mockDataSourcesForBulkDelete = [
        { id: 'ds-1', type: DATA_SOURCE_SAVED_OBJECT_TYPE, attributes: {}, references: [] },
        { id: 'ds-2', type: DATA_SOURCE_SAVED_OBJECT_TYPE, attributes: {}, references: [] },
      ];
      const mockFinder = {
        find: jest.fn().mockImplementation(async function* () {
          yield {
            saved_objects: mockDataSourcesForBulkDelete,
            total: 2,
            page: 1,
            per_page: 1000,
          };
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };
      mockSavedObjectsClient.createPointInTimeFinder = jest.fn().mockReturnValue(mockFinder as any);

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { dataSourceIds: ['ds-1', 'ds-2'] },
        }),
        expect.any(Object)
      );
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to schedule bulk delete task: Failed to schedule task',
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

      const deleteCall = (mockRouter.delete as jest.Mock).mock.calls.find((call) =>
        call[0].path?.includes('{id}')
      );
      const routeHandler = deleteCall?.[1];
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
      // Reset the mock to clear any previous implementations
      mockDeleteDataSourceAndRelatedResources.mockReset();

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

      const deleteCall = (mockRouter.delete as jest.Mock).mock.calls.find((call) =>
        call[0].path?.includes('{id}')
      );
      const routeHandler = deleteCall?.[1];

      if (!routeHandler) {
        throw new Error('Route handler not found for DELETE /api/data_sources/{id}');
      }

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'data-source-1' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockDeleteDataSourceAndRelatedResources).toHaveBeenCalledTimes(1);
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

      const deleteCall = (mockRouter.delete as jest.Mock).mock.calls.find((call) =>
        call[0].path?.includes('{id}')
      );
      const routeHandler = deleteCall?.[1];
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

describe('DELETE /api/data_sources', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  let context: jest.Mocked<RequestHandlerContext>;
  let mockRouter: ReturnType<typeof httpServiceMock.createRouter>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let routeHandler: any;
  let mockTaskManager: ReturnType<typeof taskManagerMock.createStart>;
  let mockGetStartServices: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTaskManager = taskManagerMock.createStart();
    mockGetStartServices = jest.fn().mockResolvedValue([
      {} as any, // coreStart
      {
        actions: {} as any,
        dataCatalog: {} as any,
        agentBuilder: {} as any,
        taskManager: mockTaskManager,
      },
    ]);

    const mockDataSourcesForBulkDelete = [
      { id: 'ds-1', type: DATA_SOURCE_SAVED_OBJECT_TYPE, attributes: {}, references: [] },
      { id: 'ds-2', type: DATA_SOURCE_SAVED_OBJECT_TYPE, attributes: {}, references: [] },
    ];
    const mockFinder = {
      find: jest.fn().mockImplementation(async function* () {
        yield {
          saved_objects: mockDataSourcesForBulkDelete,
          total: 2,
          page: 1,
          per_page: 1000,
        };
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    context = {
      core: Promise.resolve({
        savedObjects: {
          client: {
            createPointInTimeFinder: jest.fn().mockReturnValue(mockFinder as any),
          },
        },
      }),
    } as unknown as jest.Mocked<RequestHandlerContext>;

    mockRouter = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();

    const dependencies: RouteDependencies = {
      router: mockRouter,
      logger: mockLogger,
      getStartServices: mockGetStartServices,
      workflowManagement: {} as any,
    };

    registerRoutes(dependencies);

    const deleteCall = (mockRouter.delete as jest.Mock).mock.calls.find(
      (call) => call[0].path === '/api/data_sources'
    );
    routeHandler = deleteCall?.[1];
  });

  describe('success', () => {
    it('should schedule task and return taskId immediately', async () => {
      const mockTaskInstance = {
        id: 'test-task-id',
        taskType: 'data-sources:bulk-delete-task',
        state: { isDone: false, deletedCount: 0, errors: [] },
      };
      mockTaskManager.ensureScheduled.mockResolvedValue(mockTaskInstance as any);

      await routeHandler(context, httpServerMock.createKibanaRequest(), mockResponse);

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: 'data-sources:bulk-delete-task',
          scope: [DATASOURCES_SCOPE, WORKFLOWS_SCOPE, TOOLS_SCOPE],
          state: { isDone: false, deletedCount: 0, errors: [] },
          params: { dataSourceIds: ['ds-1', 'ds-2'] },
        }),
        expect.objectContaining({
          request: expect.any(Object),
        })
      );

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          taskId: expect.any(String),
        }),
      });
    });

    it('should pass request context to ensureScheduled', async () => {
      const mockTaskInstance = {
        id: 'test-task-id',
        taskType: 'data-sources:bulk-delete-task',
        state: { isDone: false, deletedCount: 0, errors: [] },
      };
      mockTaskManager.ensureScheduled.mockResolvedValue(mockTaskInstance as any);

      const mockRequest = httpServerMock.createKibanaRequest();

      await routeHandler(context, mockRequest, mockResponse);

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { dataSourceIds: ['ds-1', 'ds-2'] },
        }),
        { request: mockRequest }
      );
    });
  });

  describe('task manager unavailable', () => {
    it('should return 503 error when task manager is not available', async () => {
      mockGetStartServices.mockResolvedValue([
        {} as any,
        {
          actions: {} as any,
          dataCatalog: {} as any,
          agentBuilder: {} as any,
          taskManager: undefined,
        },
      ]);

      await routeHandler(context, httpServerMock.createKibanaRequest(), mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: {
          message: TASK_MANAGER_NOT_AVAILABLE_ERROR,
        },
      });
    });
  });

  describe('task scheduling failure', () => {
    it('should return 500 error when task scheduling fails', async () => {
      const error = new Error('Failed to schedule task');
      mockTaskManager.ensureScheduled.mockRejectedValue(error);

      await routeHandler(context, httpServerMock.createKibanaRequest(), mockResponse);

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { dataSourceIds: ['ds-1', 'ds-2'] },
        }),
        expect.any(Object)
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to schedule bulk delete task')
      );
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to schedule bulk delete task'),
        },
      });
    });
  });
});

describe('GET /api/data_sources/_tasks/{taskId}', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  let context: jest.Mocked<RequestHandlerContext>;
  let mockRouter: ReturnType<typeof httpServiceMock.createRouter>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let routeHandler: any;
  let mockTaskManager: ReturnType<typeof taskManagerMock.createStart>;
  let mockGetStartServices: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTaskManager = taskManagerMock.createStart();
    mockGetStartServices = jest.fn().mockResolvedValue([
      {} as any,
      {
        actions: {} as any,
        dataCatalog: {} as any,
        agentBuilder: {} as any,
        taskManager: mockTaskManager,
      },
    ]);

    context = {
      core: Promise.resolve({
        savedObjects: { client: {} },
      }),
    } as unknown as jest.Mocked<RequestHandlerContext>;

    mockRouter = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();

    const dependencies: RouteDependencies = {
      router: mockRouter,
      logger: mockLogger,
      getStartServices: mockGetStartServices,
      workflowManagement: {} as any,
    };

    registerRoutes(dependencies);

    const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
      (call) => call[0].path === '/api/data_sources/_tasks/{taskId}'
    );
    routeHandler = getCall?.[1];
  });

  describe('task in progress', () => {
    it('should return current state when task is in progress', async () => {
      const mockTask = {
        id: 'test-task-id',
        state: {
          isDone: false,
          deletedCount: 50,
          errors: [],
        },
      };
      mockTaskManager.get.mockResolvedValue(mockTask as any);

      await routeHandler(
        context,
        httpServerMock.createKibanaRequest({ params: { taskId: 'test-task-id' } }),
        mockResponse
      );

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          isDone: false,
          deletedCount: 50,
          errors: [],
        },
      });
    });
  });

  describe('task completed', () => {
    it('should return final state when task is completed successfully', async () => {
      const mockTask = {
        id: 'test-task-id',
        state: {
          isDone: true,
          deletedCount: 100,
          errors: [],
        },
      };
      mockTaskManager.get.mockResolvedValue(mockTask as any);

      await routeHandler(
        context,
        httpServerMock.createKibanaRequest({ params: { taskId: 'test-task-id' } }),
        mockResponse
      );

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          isDone: true,
          deletedCount: 100,
          errors: [],
        },
      });
    });

    it('should return errors when task completed with errors', async () => {
      const mockTask = {
        id: 'test-task-id',
        state: {
          isDone: true,
          deletedCount: 95,
          errors: [
            { dataSourceId: 'data-source-1', error: 'Failed to delete' },
            { dataSourceId: 'data-source-2', error: 'Not found' },
          ],
        },
      };
      mockTaskManager.get.mockResolvedValue(mockTask as any);

      await routeHandler(
        context,
        httpServerMock.createKibanaRequest({ params: { taskId: 'test-task-id' } }),
        mockResponse
      );

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          isDone: true,
          deletedCount: 95,
          errors: [
            { dataSourceId: 'data-source-1', error: 'Failed to delete' },
            { dataSourceId: 'data-source-2', error: 'Not found' },
          ],
        },
      });
    });
  });

  describe('task not found', () => {
    it('should return 404 when task is not found', async () => {
      const notFoundError = SavedObjectsErrorHelpers.createGenericNotFoundError(
        'task',
        'non-existent'
      );
      mockTaskManager.get.mockRejectedValue(notFoundError);

      await routeHandler(
        context,
        httpServerMock.createKibanaRequest({ params: { taskId: 'non-existent' } }),
        mockResponse
      );

      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: {
          message: TASK_NOT_FOUND_ERROR,
        },
      });
    });
  });

  describe('task manager unavailable', () => {
    it('should return 503 error when task manager is not available', async () => {
      mockGetStartServices.mockResolvedValue([
        {} as any,
        {
          actions: {} as any,
          dataCatalog: {} as any,
          agentBuilder: {} as any,
          taskManager: undefined,
        },
      ]);

      await routeHandler(
        context,
        httpServerMock.createKibanaRequest({ params: { taskId: 'test-task-id' } }),
        mockResponse
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: {
          message: TASK_MANAGER_NOT_AVAILABLE_ERROR,
        },
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors when getting task status', async () => {
      const error = new Error('Internal error');
      mockTaskManager.get.mockRejectedValue(error);

      await routeHandler(
        context,
        httpServerMock.createKibanaRequest({ params: { taskId: 'test-task-id' } }),
        mockResponse
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get bulk delete status')
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to get bulk delete status'),
        },
      });
    });
  });
});
