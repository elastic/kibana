/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { buildSecretsFromConnectorSpec, registerRoutes, type RouteDependencies } from '.';
import { DATA_CONNECTOR_SAVED_OBJECT_TYPE } from '../saved_objects';

jest.mock('@kbn/connector-specs', () => ({
  connectorsSpecs: {
    customConnectorWithBearerType: {
      metadata: { id: '.bearer_connector' },
      auth: {
        types: [
          {
            type: 'bearer',
          },
        ],
      },
    },
    customConnectorWithBearerString: {
      metadata: { id: '.bearer_string_connector' },
      auth: {
        types: ['bearer'],
      },
    },
    customConnectorWithApiKeyHeaderTypeAndCustomHeader: {
      metadata: { id: '.apikey_custom_header_connector' },
      auth: {
        types: [
          {
            type: 'api_key_header',
            defaults: {
              headerField: 'Key',
            },
          },
        ],
      },
    },
    customConnectorWithApiKeyHeaderType: {
      metadata: { id: '.apikey_header_connector' },
      auth: {
        types: [
          {
            type: 'api_key_header',
          },
        ],
      },
    },
    customConnectorWithApiKeyHeaderString: {
      metadata: { id: '.apikey_header_string_connector' },
      auth: {
        types: ['api_key_header'],
      },
    },
  },
}));

describe('buildSecretsFromConnectorSpec', () => {
  describe('bearer auth', () => {
    it('should return bearer auth secrets', () => {
      const actual = buildSecretsFromConnectorSpec('.bearer_connector', 'test-token-123');

      expect(actual).toEqual({
        authType: 'bearer',
        token: 'test-token-123',
      });
    });

    it('should handle bearer auth with string type definition', () => {
      const actual = buildSecretsFromConnectorSpec('.bearer_string_connector', 'my-bearer-token');

      expect(actual).toEqual({
        authType: 'bearer',
        token: 'my-bearer-token',
      });
    });
  });

  describe('api_key_header auth', () => {
    it('should return api_key_header secrets with custom headerField when present in the spec', () => {
      const actual = buildSecretsFromConnectorSpec(
        '.apikey_custom_header_connector',
        'api-key-456'
      );

      expect(actual).toEqual({
        authType: 'api_key_header',
        apiKey: 'api-key-456',
        headerField: 'Key',
      });
    });

    it('should use default fallback headerField when not specified in connector spec', () => {
      const expectedSecret = {
        authType: 'api_key_header',
        apiKey: 'test-key',
        headerField: 'ApiKey',
      };
      const actualFromType = buildSecretsFromConnectorSpec('.apikey_header_connector', 'test-key');
      const actualFromString = buildSecretsFromConnectorSpec(
        '.apikey_header_string_connector',
        'test-key'
      );

      expect(actualFromType).toEqual(expectedSecret);
      expect(actualFromString).toEqual(expectedSecret);
    });
  });

  describe('error cases', () => {
    it('should throw error for non-existent connector type', () => {
      expect(() => {
        buildSecretsFromConnectorSpec('.nonexistent', 'some-token');
      }).toThrow('Stack connector spec not found for type ".nonexistent"');
    });
  });
});

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
      onechat: {
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
    workflowManagement: mockWorkflowManagement,
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
          type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
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
          type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
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
        saved_objects: mockConnectors,
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
        type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
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

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to list all data connectors: Database error'
      );
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
        type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
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
        DATA_CONNECTOR_SAVED_OBJECT_TYPE,
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

      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching data connector: Not found');
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to fetch data connector: Not found',
        },
      });
    });
  });

  describe('POST /api/data_connectors', () => {
    it('should create a new data connector with workflows and tools', async () => {
      const mockStackConnector = {
        id: 'ksc-1',
        actionTypeId: '.notion',
        name: 'Notion connector',
      };

      const mockWorkflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        description: 'Test workflow description',
      };

      const mockTool = {
        id: 'tool-1',
        type: 'workflow',
      };

      const mockSavedObject = {
        id: 'connector-1',
        type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'My Notion Connector',
          type: 'notion',
          workflowIds: ['workflow-1'],
          toolIds: ['tool-1'],
          kscIds: ['ksc-1'],
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      };

      mockDataSourcesRegistry.getCatalog.mockReturnValue({
        get: jest.fn().mockReturnValue({
          stackConnector: { type: '.bearer_connector' },
          generateWorkflows: jest.fn().mockReturnValue([
            {
              content: 'workflow yaml content',
              shouldGenerateABTool: true,
            },
          ]),
        }),
      });

      mockActionsClient.create.mockResolvedValue(mockStackConnector);
      mockWorkflowManagement.management.createWorkflow.mockResolvedValue(mockWorkflow);
      mockToolRegistry.create.mockResolvedValue(mockTool);
      mockSavedObjectsClient.create.mockResolvedValue(mockSavedObject);

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

      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: expect.objectContaining({
          name: "notion stack connector for data connector 'My Notion Connector'",
          actionTypeId: '.bearer_connector',
          secrets: expect.objectContaining({
            authType: 'bearer',
            token: 'secret-token-123',
          }),
        }),
      });
      expect(mockWorkflowManagement.management.createWorkflow).toHaveBeenCalled();
      expect(mockToolRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'notion-workflow-1',
          type: 'workflow',
          configuration: { workflow_id: 'workflow-1' },
        })
      );
      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        DATA_CONNECTOR_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'My Notion Connector',
          type: 'notion',
          workflowIds: ['workflow-1'],
          toolIds: ['tool-1'],
          kscIds: ['ksc-1'],
        })
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          message: 'Data connector created successfully!',
          dataConnectorId: 'connector-1',
          stackConnectorId: 'ksc-1',
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
    });

    it('should handle errors during creation', async () => {
      mockDataSourcesRegistry.getCatalog.mockReturnValue({
        get: jest.fn().mockReturnValue({
          stackConnector: { type: '.bearer_connector' },
          generateWorkflows: jest.fn().mockReturnValue([]),
        }),
      });

      mockActionsClient.create.mockRejectedValue(new Error('Failed to create action'));

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

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating data connector: Failed to create action'
      );
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to create data connector: Failed to create action',
        },
      });
    });
  });

  describe('DELETE /api/data_connectors', () => {
    it('should delete all data connectors and related resources', async () => {
      const mockConnectors = [
        {
          id: 'connector-1',
          type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'Connector 1',
            type: 'notion',
            workflowIds: ['workflow-1'],
            toolIds: ['tool-1'],
            kscIds: ['ksc-1'],
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        },
        {
          id: 'connector-2',
          type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'Connector 2',
            type: 'notion',
            workflowIds: ['workflow-2'],
            toolIds: ['tool-2'],
            kscIds: ['ksc-2'],
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
          },
        },
      ];

      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: mockConnectors,
        total: 2,
        per_page: 1000,
        page: 1,
      });
      mockActionsClient.delete.mockResolvedValue(undefined);
      mockToolRegistry.delete.mockResolvedValue(undefined);
      mockWorkflowManagement.management.deleteWorkflows.mockResolvedValue(undefined);
      mockSavedObjectsClient.delete.mockResolvedValue({});

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
        perPage: 1000,
      });
      expect(mockActionsClient.delete).toHaveBeenCalledTimes(2);
      expect(mockToolRegistry.delete).toHaveBeenCalledTimes(2);
      expect(mockWorkflowManagement.management.deleteWorkflows).toHaveBeenCalledWith(
        ['workflow-1', 'workflow-2'],
        'default',
        mockRequest
      );
      expect(mockSavedObjectsClient.delete).toHaveBeenCalledTimes(2);
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          deletedCount: 2,
        },
      });
    });

    it('should handle errors when deleting all connectors fails', async () => {
      mockSavedObjectsClient.find.mockRejectedValue(new Error('Find failed'));

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[0][1];
      const mockRequest = httpServerMock.createKibanaRequest();
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete all connectors: Find failed');
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to delete all connectors: Find failed',
        },
      });
    });
  });

  describe('DELETE /api/data_connectors/:id', () => {
    it('should delete a single data connector and related resources', async () => {
      const mockConnector = {
        id: 'connector-1',
        type: DATA_CONNECTOR_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'Test Connector',
          type: 'notion',
          workflowIds: ['workflow-1'],
          toolIds: ['tool-1'],
          kscIds: ['ksc-1'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      mockSavedObjectsClient.get.mockResolvedValue(mockConnector);
      mockActionsClient.delete.mockResolvedValue(undefined);
      mockToolRegistry.delete.mockResolvedValue(undefined);
      mockWorkflowManagement.management.deleteWorkflows.mockResolvedValue(undefined);
      mockSavedObjectsClient.delete.mockResolvedValue({});

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[1][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'connector-1' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        DATA_CONNECTOR_SAVED_OBJECT_TYPE,
        'connector-1'
      );
      expect(mockActionsClient.delete).toHaveBeenCalledWith({ id: 'ksc-1' });
      expect(mockToolRegistry.delete).toHaveBeenCalledWith('tool-1');
      expect(mockWorkflowManagement.management.deleteWorkflows).toHaveBeenCalledWith(
        ['workflow-1'],
        'default',
        mockRequest
      );
      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        DATA_CONNECTOR_SAVED_OBJECT_TYPE,
        'connector-1'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
        },
      });
    });

    it('should handle errors when deleting a connector fails', async () => {
      mockSavedObjectsClient.get.mockRejectedValue(new Error('Connector not found'));

      registerRoutes(dependencies);

      const routeHandler = mockRouter.delete.mock.calls[1][1];
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { id: 'nonexistent' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete connector: Connector not found'
      );
      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to delete connector: Connector not found',
        },
      });
    });
  });
});
