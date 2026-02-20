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

const mockLoadWorkflows = jest.fn();
jest.mock('@kbn/data-catalog-plugin/common/workflow_loader', () => ({
  loadWorkflows: (...args: unknown[]) => mockLoadWorkflows(...args),
}));

const mockGetNamedMcpTools = jest.fn();
const mockBulkCreateMcpTools = jest.fn();
jest.mock('@kbn/agent-builder-plugin/server/services/tools/tool_types/mcp/tool_type', () => ({
  getNamedMcpTools: (...args: unknown[]) => mockGetNamedMcpTools(...args),
}));
jest.mock('@kbn/agent-builder-plugin/server/services/tools/utils', () => ({
  bulkCreateMcpTools: (...args: unknown[]) => mockBulkCreateMcpTools(...args),
}));

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
    skills: {
      register: jest.fn(),
      unregister: jest.fn(),
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
    mockLoadWorkflows.mockReset();
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
        name: 'my-data-source',
        type: 'test_type',
        workflowIds: ['workflow-1'],
        toolIds: ['tool-1'],
        kscIds: ['ksc-1'],
      },
    };
    const mockDataSource = {
      stackConnectors: [{ type: actionTypeId, config: {} }],
      workflows: { directory: '/path/to/workflows' },
    } as Partial<DataSource>;

    mockLoadWorkflows.mockResolvedValue([
      {
        content: `name: sources.notion.search
description: Search Notion content
tags:
  - agent-builder-tool`,
        shouldGenerateABTool: true,
      },
    ]);

    mockActionsClient.create.mockResolvedValue(mockStackConnector);
    mockWorkflowManagement.management.createWorkflow.mockResolvedValue(mockWorkflow);
    mockToolRegistry.create.mockResolvedValue(mockTool);
    mockSavedObjectsClient.create.mockResolvedValue(mockSavedObject as SavedObject);

    const result = await createDataSourceAndRelatedResources({
      name: 'my-data-source',
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
        name: 'my-data-source',
        actionTypeId,
        secrets: expect.objectContaining({
          authType: 'bearer',
          token: 'secret-token-123',
        }),
      }),
    });
    expect(mockWorkflowManagement.management.createWorkflow).toHaveBeenCalledWith(
      expect.any(Object),
      'default',
      mockRequest
    );
    const createdYaml = mockWorkflowManagement.management.createWorkflow.mock.calls[0][0].yaml;
    expect(createdYaml).toContain('name: my-data-source.sources.notion.search');
    expect(createdYaml).toContain('description: Search Notion content');
    expect(createdYaml).toContain('tags:');
    expect(createdYaml).toMatch(/-\s*agent-builder-tool/);
    expect(mockToolRegistry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test_type.my-data-source.search',
        type: 'workflow',
        description: 'Search Notion content',
        tags: ['data-source', 'test_type'],
        configuration: {
          workflow_id: 'workflow-1',
        },
      })
    );
    expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
      DATA_SOURCE_SAVED_OBJECT_TYPE,
      expect.objectContaining({
        name: 'my-data-source',
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
      stackConnectors: [{ type: actionTypeId, config: {} }],
      workflows: { directory: '/path/to/workflows' },
    } as Partial<DataSource>;

    mockLoadWorkflows.mockResolvedValue([
      {
        content: 'workflow yaml content',
        shouldGenerateABTool: false,
      },
    ]);

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

  describe('MCP tool importing', () => {
    beforeEach(() => {
      mockGetNamedMcpTools.mockReset();
      mockBulkCreateMcpTools.mockReset();
    });

    it('should import MCP tools when importedTools are provided', async () => {
      const actionTypeId = '.mcp';
      const mockStackConnector = {
        id: 'mcp-connector-1',
        name: '.mcp',
        actionTypeId,
      };
      const mockWorkflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
      };
      const mockSavedObject = {
        id: 'connector-1',
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'My MCP Connector',
          type: 'test_type',
          workflowIds: ['workflow-1'],
          toolIds: ['mcp-tool-1', 'mcp-tool-2'],
          kscIds: ['mcp-connector-1'],
        },
      };
      const mockDataSource = {
        stackConnectors: [
          {
            type: actionTypeId,
            config: {
              serverUrl: 'https://api.example.com/mcp/',
              hasAuth: true,
              authType: 'bearer',
            },
            importedTools: [
              { name: 'get_file_contents', description: 'Get file contents' },
              { name: 'list_issues', description: 'List issues' },
            ],
          },
        ],
        workflows: { directory: '/path/to/workflows' },
      } as Partial<DataSource>;

      mockLoadWorkflows.mockResolvedValue([
        {
          content: 'name: test-workflow',
          shouldGenerateABTool: false,
        },
      ]);

      mockGetNamedMcpTools.mockResolvedValue([
        { name: 'get_file_contents', description: 'Get file contents from repo' },
        { name: 'list_issues', description: 'List repository issues' },
      ]);

      mockBulkCreateMcpTools.mockResolvedValue({
        results: [
          { toolId: 'mcp-tool-1', mcpToolName: 'get_file_contents', skipped: false },
          { toolId: 'mcp-tool-2', mcpToolName: 'list_issues', skipped: false },
        ],
        summary: {
          total: 2,
          created: 2,
          skipped: 0,
          failed: 0,
        },
      });

      mockActionsClient.create.mockResolvedValue(mockStackConnector);
      mockWorkflowManagement.management.createWorkflow.mockResolvedValue(mockWorkflow);
      mockSavedObjectsClient.create.mockResolvedValue(mockSavedObject as SavedObject);

      const result = await createDataSourceAndRelatedResources({
        name: 'My MCP Connector',
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
      expect(mockGetNamedMcpTools).toHaveBeenCalledWith({
        actions: mockActions,
        request: mockRequest,
        connectorId: 'mcp-connector-1',
        toolNames: ['get_file_contents', 'list_issues'],
        logger: mockLogger,
      });
      expect(mockBulkCreateMcpTools).toHaveBeenCalledWith({
        registry: mockToolRegistry,
        actions: mockActions,
        request: mockRequest,
        connectorId: 'mcp-connector-1',
        tools: [
          {
            name: 'get_file_contents',
            description: 'Get file contents from repo Get file contents',
          },
          {
            name: 'list_issues',
            description: 'List repository issues List issues',
          },
        ],
        namespace: 'My MCP Connector',
      });
      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        DATA_SOURCE_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          toolIds: ['mcp-tool-1', 'mcp-tool-2'],
        })
      );
    });

    it('should not import MCP tools when importedTools is empty', async () => {
      const actionTypeId = '.mcp';
      const mockStackConnector = {
        id: 'mcp-connector-1',
        name: '.mcp',
        actionTypeId,
      };
      const mockWorkflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
      };
      const mockSavedObject = {
        id: 'connector-1',
        type: DATA_SOURCE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'My MCP Connector',
          type: 'test_type',
          workflowIds: ['workflow-1'],
          toolIds: [],
          kscIds: ['mcp-connector-1'],
        },
      };
      const mockDataSource = {
        stackConnectors: [
          {
            type: actionTypeId,
            config: {
              serverUrl: 'https://api.example.com/mcp/',
              hasAuth: true,
              authType: 'bearer',
            },
            importedTools: [],
          },
        ],
        workflows: { directory: '/path/to/workflows' },
      } as Partial<DataSource>;

      mockLoadWorkflows.mockResolvedValue([
        {
          content: 'name: test-workflow',
          shouldGenerateABTool: false,
        },
      ]);

      mockActionsClient.create.mockResolvedValue(mockStackConnector);
      mockWorkflowManagement.management.createWorkflow.mockResolvedValue(mockWorkflow);
      mockSavedObjectsClient.create.mockResolvedValue(mockSavedObject as SavedObject);

      const result = await createDataSourceAndRelatedResources({
        name: 'My MCP Connector',
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
      expect(mockGetNamedMcpTools).not.toHaveBeenCalled();
      expect(mockBulkCreateMcpTools).not.toHaveBeenCalled();
      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        DATA_SOURCE_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          toolIds: [],
        })
      );
    });

    it('should throw error when no MCP tools are found', async () => {
      const actionTypeId = '.mcp';
      const mockStackConnector = {
        id: 'mcp-connector-1',
        name: '.mcp',
        actionTypeId,
      };
      const mockDataSource = {
        stackConnectors: [
          {
            type: actionTypeId,
            config: {
              serverUrl: 'https://api.example.com/mcp/',
              hasAuth: true,
              authType: 'bearer',
            },
            importedTools: [{ name: 'nonexistent_tool', description: 'Tool that does not exist' }],
          },
        ],
        workflows: { directory: '/path/to/workflows' },
      } as Partial<DataSource>;

      mockLoadWorkflows.mockResolvedValue([
        {
          content: 'name: test-workflow',
          shouldGenerateABTool: false,
        },
      ]);

      mockGetNamedMcpTools.mockResolvedValue(undefined);
      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      await expect(
        createDataSourceAndRelatedResources({
          name: 'My MCP Connector',
          type: 'test_type',
          credentials: 'secret-token-123',
          savedObjectsClient: mockSavedObjectsClient,
          request: mockRequest,
          logger: mockLogger,
          workflowManagement: mockWorkflowManagement as any,
          actions: mockActions as any,
          dataSource: mockDataSource as any,
          agentBuilder: mockAgentBuilder as any,
        })
      ).rejects.toThrow('No imported connector tools found for My MCP Connector');
    });

    it('should throw error when bulk creating MCP tools fails', async () => {
      const actionTypeId = '.mcp';
      const mockStackConnector = {
        id: 'mcp-connector-1',
        name: '.mcp',
        actionTypeId,
      };
      const mockDataSource = {
        stackConnectors: [
          {
            type: actionTypeId,
            config: {
              serverUrl: 'https://api.example.com/mcp/',
              hasAuth: true,
              authType: 'bearer',
            },
            importedTools: [{ name: 'get_file_contents', description: 'Get file contents' }],
          },
        ],
        workflows: { directory: '/path/to/workflows' },
      } as Partial<DataSource>;

      mockLoadWorkflows.mockResolvedValue([
        {
          content: 'name: test-workflow',
          shouldGenerateABTool: false,
        },
      ]);

      mockGetNamedMcpTools.mockResolvedValue([
        { name: 'get_file_contents', description: 'Get file contents from repo' },
      ]);

      mockBulkCreateMcpTools.mockRejectedValue(new Error('Failed to create tools'));

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      await expect(
        createDataSourceAndRelatedResources({
          name: 'My MCP Connector',
          type: 'test_type',
          credentials: 'secret-token-123',
          savedObjectsClient: mockSavedObjectsClient,
          request: mockRequest,
          logger: mockLogger,
          workflowManagement: mockWorkflowManagement as any,
          actions: mockActions as any,
          dataSource: mockDataSource as any,
          agentBuilder: mockAgentBuilder as any,
        })
      ).rejects.toThrow(
        'Error bulk importing MCP tools for My MCP Connector: Error: Failed to create tools'
      );
    });
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
