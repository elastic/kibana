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
  createDataSourceAndRelatedResources,
  deleteDataSourceAndRelatedResources,
} from './data_sources_helpers';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../saved_objects';
import * as connectorSpecsModule from '@kbn/connector-specs';
import type { DataSource } from '@kbn/data-catalog-plugin';
import {
  createToolRegistryMock,
  createMockedTool,
} from '@kbn/agent-builder-plugin/server/test_utils/tools';
import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server/types';

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
  notionConnector: {
    metadata: {
      id: '.notion',
    },
    auth: {
      types: ['bearer'],
    },
    actions: {},
  },
};

describe('createConnectorAndRelatedResources', () => {
  const mockLogger = loggerMock.create();
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const mockActionsClient = {
    create: jest.fn(),
  };
  const mockToolRegistry = createToolRegistryMock();
  const mockWorkflowManagement = {
    management: {
      createWorkflow: jest.fn(),
    },
  };
  const mockActions = {
    getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
  };
  const mockAgentBuilder: AgentBuilderPluginStart = {
    agents: {
      runAgent: jest.fn(),
    },
    tools: {
      execute: jest.fn(),
      getRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
    },
  };

  const mockRequest = httpServerMock.createKibanaRequest();

  beforeAll(() => {
    jest.replaceProperty(connectorSpecsModule, 'connectorsSpecs', mockConnectorSpecs as any);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

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
    const mockTool = createMockedTool({
      id: 'tool-1',
    });
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
    const mockDataSource = {
      stackConnector: { type: actionTypeId, config: {} },
      generateWorkflows: jest.fn().mockReturnValue([
        {
          content: 'workflow yaml content',
          shouldGenerateABTool: true,
        },
      ]),
    } as Partial<DataSource>;

    mockActionsClient.create.mockResolvedValue(mockStackConnector);
    mockWorkflowManagement.management.createWorkflow.mockResolvedValue(mockWorkflow);
    mockToolRegistry.create.mockResolvedValue(mockTool);
    mockSavedObjectsClient.create.mockResolvedValue(mockSavedObject as SavedObject);

    const result = await createDataSourceAndRelatedResources({
      name: 'My Test Connector',
      type: 'test_type',
      credentials: 'secret-token-123',
      savedObjectsClient: mockSavedObjectsClient,
      request: mockRequest,
      logger: mockLogger,
      workflowManagement: mockWorkflowManagement as any,
      actions: mockActions as any,
      dataSource: mockDataSource as any,
      agentBuilder: mockAgentBuilder as any,
    });

    expect(result).toBe('connector-1');
    expect(mockActionsClient.create).toHaveBeenCalledWith({
      action: expect.objectContaining({
        name: ".notion stack connector for data connector 'My Test Connector'",
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
        id: 'test_type.my-test-connector.workflow',
        type: 'workflow',
        description: 'Workflow tool for test_type data source',
        tags: ['data-source', 'test_type'],
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
    const mockDataSource = {
      stackConnector: { type: actionTypeId, config: {} },
      generateWorkflows: jest.fn().mockReturnValue([
        {
          content: 'workflow yaml content',
          shouldGenerateABTool: false,
        },
      ]),
    } as Partial<DataSource>;

    mockActionsClient.create.mockResolvedValue(mockStackConnector);
    mockWorkflowManagement.management.createWorkflow.mockResolvedValue(mockWorkflow);
    mockSavedObjectsClient.create.mockResolvedValue(mockSavedObject as any);

    await createDataSourceAndRelatedResources({
      name: 'Test',
      type: 'test',
      credentials: 'token',
      savedObjectsClient: mockSavedObjectsClient,
      request: mockRequest,
      logger: mockLogger,
      workflowManagement: mockWorkflowManagement as any,
      actions: mockActions as any,
      dataSource: mockDataSource as any,
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
  const mockToolRegistry = createToolRegistryMock();
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
    mockToolRegistry.delete.mockResolvedValue(true);
    mockWorkflowManagement.management.deleteWorkflows.mockResolvedValue({
      total: 1,
      deleted: 1,
      failures: [],
    });
    mockSavedObjectsClient.delete.mockResolvedValue({});

    const result = await deleteDataSourceAndRelatedResources({
      dataSource: mockConnector as any,
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
    mockToolRegistry.delete.mockResolvedValue(true);
    mockWorkflowManagement.management.deleteWorkflows.mockResolvedValue({
      total: 1,
      deleted: 1,
      failures: [],
    });
    mockSavedObjectsClient.update.mockResolvedValue({} as any);

    const result = await deleteDataSourceAndRelatedResources({
      dataSource: mockConnector as any,
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
      dataSource: mockConnector as any,
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
