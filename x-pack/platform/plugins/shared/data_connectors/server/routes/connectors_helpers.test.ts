/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  buildSecretsFromConnectorSpec,
  createDataSourceAndRelatedResources,
  deleteDataSourceAndRelatedResources,
} from './connectors_helpers';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../saved_objects';
import * as connectorSpecsModule from '@kbn/connector-specs';

const mockConnectorSpecs = {
  customConnectorWithBearerType: {
    metadata: {
      id: '.bearer_connector',
    },
    auth: {
      types: [
        {
          type: 'bearer',
        },
      ],
    },
    actions: {},
  },
  customConnectorWithBearerString: {
    metadata: {
      id: '.bearer_string_connector',
    },
    auth: {
      types: ['bearer'],
    },
    actions: {},
  },
  customConnectorWithApiKeyHeaderTypeAndCustomHeader: {
    metadata: {
      id: '.apikey_custom_header_connector',
    },
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
    actions: {},
  },
  customConnectorWithApiKeyHeaderType: {
    metadata: {
      id: '.apikey_header_connector',
    },
    auth: {
      types: [
        {
          type: 'api_key_header',
        },
      ],
    },
    actions: {},
  },
  customConnectorWithApiKeyHeaderString: {
    metadata: {
      id: '.apikey_header_string_connector',
    },
    auth: {
      types: ['api_key_header'],
    },
    actions: {},
  },
};

describe('buildSecretsFromConnectorSpec', () => {
  beforeAll(() => {
    jest.replaceProperty(connectorSpecsModule, 'connectorsSpecs', mockConnectorSpecs as any);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

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

describe('createConnectorAndRelatedResources', () => {
  const mockLogger = loggerMock.create();
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const mockActionsClient = {
    create: jest.fn(),
  };
  const mockToolRegistry = {
    create: jest.fn(),
  };
  const mockWorkflowManagement = {
    management: {
      createWorkflow: jest.fn(),
    },
  };
  const mockActions = {
    getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
  };
  const mockAgentBuilder = {
    tools: {
      getRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
    },
  };

  const mockRequest = httpServerMock.createKibanaRequest();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSavedObjectsClient.getCurrentNamespace.mockReturnValue('default');
  });

  it('should create connector and all related resources successfully', async () => {
    const actionTypeId = '.notion';
    const mockStackConnector = {
      id: 'ksc-1',
      name: 'Test Stack Connector',
      actionTypeId,
    };
    const mockWorkflow = {
      id: 'workflow-1',
      name: 'Test Workflow',
    };
    const mockTool = {
      id: 'tool-1',
      type: 'workflow',
    };
    const mockSavedObject = {
      id: 'connector-1',
      type: DATA_SOURCE_SAVED_OBJECT_TYPE,
      attributes: {
        name: 'My Test Connector',
        type: 'test_type',
        workflowIds: ['workflow-1'],
        toolIds: ['tool-1'],
        kscIds: ['ksc-1'],
      },
    };
    const mockDataConnectorTypeDef = {
      stackConnector: { type: actionTypeId },
      generateWorkflows: jest.fn().mockReturnValue([
        {
          content: 'workflow yaml content',
          shouldGenerateABTool: true,
        },
      ]),
    };

    mockActionsClient.create.mockResolvedValue(mockStackConnector);
    mockWorkflowManagement.management.createWorkflow.mockResolvedValue(mockWorkflow);
    mockToolRegistry.create.mockResolvedValue(mockTool);
    mockSavedObjectsClient.create.mockResolvedValue(mockSavedObject as any);

    const result = await createDataSourceAndRelatedResources({
      name: 'My Test Connector',
      type: 'test_type',
      token: 'secret-token-123',
      savedObjectsClient: mockSavedObjectsClient,
      request: mockRequest,
      logger: mockLogger,
      workflowManagement: mockWorkflowManagement as any,
      actions: mockActions as any,
      dataConnectorTypeDef: mockDataConnectorTypeDef as any,
      agentBuilder: mockAgentBuilder as any,
    });

    expect(result).toBe('connector-1');
    expect(mockActionsClient.create).toHaveBeenCalledWith({
      action: expect.objectContaining({
        name: "test_type stack connector for data connector 'My Test Connector'",
        actionTypeId,
        secrets: expect.objectContaining({
          authType: 'bearer',
          token: 'secret-token-123',
        }),
      }),
    });
    expect(mockWorkflowManagement.management.createWorkflow).toHaveBeenCalledWith(
      { yaml: 'workflow yaml content' },
      'default',
      mockRequest
    );
    expect(mockToolRegistry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test_type-workflow-1',
        type: 'workflow',
        description: 'Workflow tool for test_type data connector',
        tags: ['data-connector', 'test_type'],
        configuration: {
          workflow_id: 'workflow-1',
        },
      })
    );
    expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
      DATA_SOURCE_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        name: 'My Test Connector',
        type: 'test_type',
        workflowIds: ['workflow-1'],
        toolIds: ['tool-1'],
        kscIds: ['ksc-1'],
      })
    );
  });

  it('should create connector without tools when shouldGenerateABTool is false', async () => {
    const actionTypeId = '.notion';
    const mockStackConnector = { id: 'ksc-1', actionTypeId };
    const mockWorkflow = { id: 'workflow-1', name: 'Test Workflow' };
    const mockSavedObject = {
      id: 'connector-1',
      attributes: { workflowIds: ['workflow-1'], toolIds: [], kscIds: ['ksc-1'] },
    };
    const mockDataConnectorTypeDef = {
      stackConnector: { type: actionTypeId },
      generateWorkflows: jest.fn().mockReturnValue([
        {
          content: 'workflow yaml content',
          shouldGenerateABTool: false,
        },
      ]),
    };

    mockActionsClient.create.mockResolvedValue(mockStackConnector);
    mockWorkflowManagement.management.createWorkflow.mockResolvedValue(mockWorkflow);
    mockSavedObjectsClient.create.mockResolvedValue(mockSavedObject as any);

    await createDataSourceAndRelatedResources({
      name: 'Test',
      type: 'test',
      token: 'token',
      savedObjectsClient: mockSavedObjectsClient,
      request: mockRequest,
      logger: mockLogger,
      workflowManagement: mockWorkflowManagement as any,
      actions: mockActions as any,
      dataConnectorTypeDef: mockDataConnectorTypeDef as any,
      agentBuilder: mockAgentBuilder as any,
    });

    expect(mockToolRegistry.create).not.toHaveBeenCalled();
  });
});

describe('deleteConnectorAndRelatedResources', () => {
  const mockLogger = loggerMock.create();
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const mockActionsClient = {
    delete: jest.fn(),
  };
  const mockToolRegistry = {
    delete: jest.fn(),
  };
  const mockWorkflowManagement = {
    management: {
      deleteWorkflows: jest.fn(),
    },
  };

  const mockRequest = httpServerMock.createKibanaRequest();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSavedObjectsClient.getCurrentNamespace.mockReturnValue('default');
  });

  it('should fully delete connector when all resources succeed', async () => {
    const mockConnector = {
      id: 'connector-1',
      type: DATA_SOURCE_SAVED_OBJECT_TYPE,
      attributes: {
        name: 'Test',
        type: 'test',
        workflowIds: ['workflow-1'],
        toolIds: ['tool-1'],
        kscIds: ['ksc-1'],
      },
    };

    mockActionsClient.delete.mockResolvedValue(undefined);
    mockToolRegistry.delete.mockResolvedValue(undefined);
    mockWorkflowManagement.management.deleteWorkflows.mockResolvedValue({
      total: 1,
      deleted: 1,
      failures: [],
    });
    mockSavedObjectsClient.delete.mockResolvedValue({});

    const result = await deleteDataSourceAndRelatedResources({
      connector: mockConnector as any,
      savedObjectsClient: mockSavedObjectsClient,
      actionsClient: mockActionsClient as any,
      toolRegistry: mockToolRegistry as any,
      workflowManagement: mockWorkflowManagement as any,
      request: mockRequest,
      logger: mockLogger,
    });

    expect(result).toEqual({
      success: true,
      fullyDeleted: true,
    });
    expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
      DATA_SOURCE_SAVED_OBJECT_TYPE,
      'connector-1'
    );
    expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('should partially delete connector when some resources fail', async () => {
    const mockConnector = {
      id: 'connector-1',
      type: DATA_SOURCE_SAVED_OBJECT_TYPE,
      attributes: {
        workflowIds: ['workflow-1'],
        toolIds: ['tool-1'],
        kscIds: ['ksc-1'],
      },
    };

    mockActionsClient.delete.mockRejectedValue(new Error('KSC deletion failed'));
    mockToolRegistry.delete.mockResolvedValue(undefined);
    mockWorkflowManagement.management.deleteWorkflows.mockResolvedValue({
      total: 1,
      deleted: 1,
      failures: [],
    });
    mockSavedObjectsClient.update.mockResolvedValue({} as any);

    const result = await deleteDataSourceAndRelatedResources({
      connector: mockConnector as any,
      savedObjectsClient: mockSavedObjectsClient,
      actionsClient: mockActionsClient as any,
      toolRegistry: mockToolRegistry as any,
      workflowManagement: mockWorkflowManagement as any,
      request: mockRequest,
      logger: mockLogger,
    });

    expect(result).toEqual({
      success: true,
      fullyDeleted: false,
      remaining: {
        kscIds: ['ksc-1'],
        toolIds: [],
        workflowIds: [],
      },
    });
    expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
      DATA_SOURCE_SAVED_OBJECT_TYPE,
      'connector-1',
      expect.objectContaining({
        kscIds: ['ksc-1'],
        toolIds: [],
        workflowIds: [],
      })
    );
    expect(mockSavedObjectsClient.delete).not.toHaveBeenCalled();
  });

  it('should handle idempotency with 404 errors', async () => {
    const mockConnector = {
      id: 'connector-1',
      type: DATA_SOURCE_SAVED_OBJECT_TYPE,
      attributes: {
        workflowIds: ['workflow-1'],
        toolIds: ['tool-1'],
        kscIds: ['ksc-1'],
      },
    };

    mockActionsClient.delete.mockRejectedValue(new Error('404 Not Found'));
    mockToolRegistry.delete.mockRejectedValue(new Error('Tool not found'));
    // deleteWorkflows now handles 404s gracefully and returns success
    mockWorkflowManagement.management.deleteWorkflows.mockResolvedValue({
      total: 1,
      deleted: 1,
      failures: [],
    });
    mockSavedObjectsClient.delete.mockResolvedValue({});

    const result = await deleteDataSourceAndRelatedResources({
      connector: mockConnector as any,
      savedObjectsClient: mockSavedObjectsClient,
      actionsClient: mockActionsClient as any,
      toolRegistry: mockToolRegistry as any,
      workflowManagement: mockWorkflowManagement as any,
      request: mockRequest,
      logger: mockLogger,
    });

    expect(result).toEqual({
      success: true,
      fullyDeleted: true,
    });
    expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
      DATA_SOURCE_SAVED_OBJECT_TYPE,
      'connector-1'
    );
    expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
  });
});
