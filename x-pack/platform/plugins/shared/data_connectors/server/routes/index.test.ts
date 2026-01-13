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
import * as helpers from './connectors_helpers';

// Mock the helper functions
jest.mock('./connectors_helpers', () => ({
  ...jest.requireActual('./connectors_helpers'),
  createConnectorAndRelatedResources: jest.fn(),
  deleteConnectorAndRelatedResources: jest.fn(),
}));

const mockCreateConnectorAndRelatedResources =
  helpers.createConnectorAndRelatedResources as jest.MockedFunction<
    typeof helpers.createConnectorAndRelatedResources
  >;
const mockDeleteConnectorAndRelatedResources =
  helpers.deleteConnectorAndRelatedResources as jest.MockedFunction<
    typeof helpers.deleteConnectorAndRelatedResources
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
  const mockDataSourcesRegistry = {
    getCatalog: jest.fn(),
  };

  const mockGetStartServices = jest.fn().mockResolvedValue([
    {},
    {
      actions: {
        getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
      },
      dataSourcesRegistry: mockDataSourcesRegistry,
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

  describe('GET /api/data_connectors', () => {
    it('should list all data connectors', async () => {
      const mockConnectors = [
        {
          id: 'connector-1',
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'Test Connector 1',
            type: 'notion',
            workflowIds: ['workflow-1'],
            toolIds: ['tool-1'],
            kscIds: ['ksc-1'],
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          references: [],
        },
        {
          id: 'connector-2',
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'Test Connector 2',
            type: 'notion',
            workflowIds: ['workflow-2'],
            toolIds: ['tool-2'],
            kscIds: ['ksc-2'],
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
          },
          references: [],
        },
      ];

      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: mockConnectors as any,
        total: 2,
        per_page: 100,
        page: 1,
      });

      registerRoutes(dependencies);

      const routeHandler = mockRouter.get.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        perPage: 100,
      });
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          connectors: expect.arrayContaining([
            expect.objectContaining({ id: 'connector-1' }),
            expect.objectContaining({ id: 'connector-2' }),
          ]),
          total: 2,
        },
      });
    });

    it('should handle errors when listing connectors fails', async () => {
      mockSavedObjectsClient.find.mockRejectedValue(new Error('Database error'));

      registerRoutes(dependencies);

      const routeHandler = mockRouter.get.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to list connectors: Database error',
        },
      });
    });
  });

  describe('GET /api/data_connectors/:id', () => {
    it('should get a single data connector by ID', async () => {
      const mockConnector = {
        id: 'connector-1',
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'Test Connector',
          type: 'notion',
          workflowIds: ['workflow-1'],
          toolIds: ['tool-1'],
          kscIds: ['ksc-1'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        references: [],
      };

      mockSavedObjectsClient.get.mockResolvedValue(mockConnector);

      registerRoutes(dependencies);

      const routeHandler = mockRouter.get.mock.calls[1][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'connector-1' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        DATA_SOURCE_SAVED_OBJECT_TYPE,
        'connector-1'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          id: 'connector-1',
          name: 'Test Connector',
        }),
      });
    });

    it('should handle errors when getting a connector fails', async () => {
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
          message: 'Failed to fetch data connector: Not found',
        },
      });
    });
  });

  describe('POST /api/data_connectors', () => {
    it('should create a new data connector and call the helper with correct params', async () => {
      const mockDataConnectorTypeDef = {
        stackConnector: { type: '.bearer_connector' },
        generateWorkflows: jest.fn(),
      };

      mockDataSourcesRegistry.getCatalog.mockReturnValue({
        get: jest.fn().mockReturnValue(mockDataConnectorTypeDef),
      });

      mockCreateConnectorAndRelatedResources.mockResolvedValue('connector-1');

      registerRoutes(dependencies);

      const routeHandler = mockRouter.post.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          name: 'My Notion Connector',
          type: 'notion',
          token: 'secret-token-123',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockCreateConnectorAndRelatedResources).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Notion Connector',
          type: 'notion',
          token: 'secret-token-123',
          dataConnectorTypeDef: mockDataConnectorTypeDef,
        })
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          message: 'Data connector created successfully!',
          dataConnectorId: 'connector-1',
        },
      });
    });

    it('should return 400 if connector type not found', async () => {
      mockDataSourcesRegistry.getCatalog.mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      registerRoutes(dependencies);

      const routeHandler = mockRouter.post.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          name: 'Invalid Connector',
          type: 'invalid-type',
          token: 'token',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: {
          message: 'Data connector type "invalid-type" not found',
        },
      });
      expect(mockCreateConnectorAndRelatedResources).not.toHaveBeenCalled();
    });

    it('should handle errors during creation', async () => {
      const mockDataConnectorTypeDef = {
        stackConnector: { type: '.bearer_connector' },
        generateWorkflows: jest.fn(),
      };

      mockDataSourcesRegistry.getCatalog.mockReturnValue({
        get: jest.fn().mockReturnValue(mockDataConnectorTypeDef),
      });

      mockCreateConnectorAndRelatedResources.mockRejectedValue(
        new Error('Failed to create action')
      );

      registerRoutes(dependencies);

      const routeHandler = mockRouter.post.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          name: 'Test Connector',
          type: 'notion',
          token: 'token',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to create data connector: Failed to create action',
        },
      });
    });
  });

  describe('DELETE /api/data_connectors', () => {
    it('should delete all connectors and return aggregated results', async () => {
      const mockConnectors = [
        {
          id: 'connector-1',
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'Connector 1',
            type: 'notion',
            workflowIds: ['workflow-1'],
            toolIds: ['tool-1'],
            kscIds: ['ksc-1'],
          },
        },
        {
          id: 'connector-2',
          type: DATA_SOURCE_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'Connector 2',
            type: 'notion',
            workflowIds: ['workflow-2'],
            toolIds: ['tool-2'],
            kscIds: ['ksc-2'],
          },
        },
      ];

      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: mockConnectors as any,
        total: 2,
        per_page: 1000,
        page: 1,
      });

      // First connector fully deleted, second partially deleted
      mockDeleteConnectorAndRelatedResources
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

      expect(mockDeleteConnectorAndRelatedResources).toHaveBeenCalledTimes(2);
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          deletedCount: 2,
          fullyDeletedCount: 1,
          partiallyDeletedCount: 1,
        },
      });
    });

    it('should handle empty connector list', async () => {
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
      expect(mockDeleteConnectorAndRelatedResources).not.toHaveBeenCalled();
    });

    it('should handle errors when finding connectors fails', async () => {
      mockSavedObjectsClient.find.mockRejectedValue(new Error('Find failed'));

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to delete all connectors: Find failed',
        },
      });
    });
  });

  describe('DELETE /api/data_connectors/:id', () => {
    it('should delete a single connector and return the result', async () => {
      const mockConnector = {
        id: 'connector-1',
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'Test Connector',
          type: 'notion',
          workflowIds: ['workflow-1'],
          toolIds: ['tool-1'],
          kscIds: ['ksc-1'],
        },
        references: [],
      };

      mockSavedObjectsClient.get.mockResolvedValue(mockConnector);
      mockDeleteConnectorAndRelatedResources.mockResolvedValue({
        success: true,
        fullyDeleted: true,
      });

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[1][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'connector-1' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        DATA_SOURCE_SAVED_OBJECT_TYPE,
        'connector-1'
      );
      expect(mockDeleteConnectorAndRelatedResources).toHaveBeenCalledWith(
        expect.objectContaining({
          connector: mockConnector,
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
      const mockConnector = {
        id: 'connector-1',
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        attributes: {
          workflowIds: ['workflow-1'],
          toolIds: ['tool-1'],
          kscIds: ['ksc-1'],
        },
        references: [],
      };

      mockSavedObjectsClient.get.mockResolvedValue(mockConnector);
      mockDeleteConnectorAndRelatedResources.mockResolvedValue({
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
        params: { id: 'connector-1' },
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

    it('should handle errors when getting a connector fails', async () => {
      mockSavedObjectsClient.get.mockRejectedValue(new Error('Connector not found'));

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
          message: 'Failed to delete connector: Connector not found',
        },
      });
      expect(mockDeleteConnectorAndRelatedResources).not.toHaveBeenCalled();
    });
  });
});
