/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createMcpConnector } from './create_mcp_connector';
import * as getMcpToolsModule from '@kbn/agent-builder-plugin/server/services/tools/tool_types/mcp/tool_type';
import * as bulkCreateMcpToolsModule from '@kbn/agent-builder-plugin/server/services/tools/utils/bulk_create_mcp_tools';

describe('createMcpConnector', () => {
  const mockLogger = loggerMock.create();
  const mockRequest = httpServerMock.createKibanaRequest();
  const mockActionsClient = {
    create: jest.fn(),
  };
  const mockActions = {
    getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
  };
  const mockRegistry = {} as any;

  const mockConnectorTypeDef = {
    stackConnector: {
      type: '.mcp',
      config: {
        serverUrl: 'https://api.example.com/mcp/',
        hasAuth: true,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(getMcpToolsModule, 'getMcpTools').mockResolvedValue([]);
    jest.spyOn(bulkCreateMcpToolsModule, 'bulkCreateMcpTools').mockResolvedValue({
      results: [],
      summary: { total: 0, created: 0, skipped: 0, failed: 0 },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create MCP connector with correct configuration', async () => {
    const mockStackConnector = {
      id: 'mcp-connector-1',
      name: "mcp stack connector for data connector 'test-connector'",
      actionTypeId: '.mcp',
    };

    mockActionsClient.create.mockResolvedValue(mockStackConnector);

    const result = await createMcpConnector(
      mockRegistry,
      mockActions as any,
      mockRequest,
      mockConnectorTypeDef as any,
      'test-connector',
      'test-token-123',
      mockLogger
    );

    expect(result).toEqual(mockStackConnector);
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Creating MCP stack connector for 'test-connector'"
    );
    expect(mockActions.getActionsClientWithRequest).toHaveBeenCalledWith(mockRequest);
    expect(mockActionsClient.create).toHaveBeenCalledWith({
      action: {
        name: "mcp stack connector for data connector 'test-connector'",
        actionTypeId: '.mcp',
        config: {
          serverUrl: 'https://api.example.com/mcp/',
          hasAuth: true,
        },
        secrets: {
          secretHeaders: {
            Authorization: 'Bearer test-token-123',
          },
        },
      },
    });
  });

  it('should create MCP tools when importedTools are provided', async () => {
    const mockStackConnector = {
      id: 'mcp-connector-3',
      name: 'mcp stack connector',
      actionTypeId: '.mcp',
    };

    const connectorWithTools = {
      ...mockConnectorTypeDef,
      importedTools: ['get_file_contents', 'list_issues', 'get_commit'],
    };

    const mockMcpTools = [
      { name: 'get_file_contents', description: 'Get file contents' },
      { name: 'list_issues', description: 'List issues' },
      { name: 'get_commit', description: 'Get commit details' },
    ];

    const mockBulkCreateResults = {
      results: [
        {
          toolId: 'test-connector.get_file_contents',
          mcpToolName: 'get_file_contents',
          success: true as const,
        },
        {
          toolId: 'test-connector.list_issues',
          mcpToolName: 'list_issues',
          success: true as const,
        },
        {
          toolId: 'test-connector.get_commit',
          mcpToolName: 'get_commit',
          success: true as const,
        },
      ],
      summary: { total: 3, created: 3, skipped: 0, failed: 0 },
    };

    mockActionsClient.create.mockResolvedValue(mockStackConnector);
    jest.spyOn(getMcpToolsModule, 'getMcpTools').mockResolvedValue(mockMcpTools);
    jest
      .spyOn(bulkCreateMcpToolsModule, 'bulkCreateMcpTools')
      .mockResolvedValue(mockBulkCreateResults);

    const result = await createMcpConnector(
      mockRegistry,
      mockActions as any,
      mockRequest,
      connectorWithTools as any,
      'test-connector',
      'test-token',
      mockLogger
    );

    expect(result).toEqual(mockStackConnector);
    expect(getMcpToolsModule.getMcpTools).toHaveBeenCalledWith({
      actions: mockActions,
      request: mockRequest,
      connectorId: 'mcp-connector-3',
      toolNames: ['get_file_contents', 'list_issues', 'get_commit'],
    });
    expect(bulkCreateMcpToolsModule.bulkCreateMcpTools).toHaveBeenCalledWith({
      registry: mockRegistry,
      actions: mockActions,
      request: mockRequest,
      connectorId: 'mcp-connector-3',
      tools: mockMcpTools,
      namespace: 'test-connector',
    });
  });

  it('should not create MCP tools when importedTools is not provided', async () => {
    const mockStackConnector = {
      id: 'mcp-connector-4',
      name: 'mcp stack connector',
      actionTypeId: '.mcp',
    };

    const connectorWithoutTools = {
      ...mockConnectorTypeDef,
      importedTools: undefined,
    };

    mockActionsClient.create.mockResolvedValue(mockStackConnector);

    await createMcpConnector(
      mockRegistry,
      mockActions as any,
      mockRequest,
      connectorWithoutTools as any,
      'test-connector',
      'test-token',
      mockLogger
    );

    expect(getMcpToolsModule.getMcpTools).not.toHaveBeenCalled();
    expect(bulkCreateMcpToolsModule.bulkCreateMcpTools).not.toHaveBeenCalled();
  });

  it('should not create MCP tools when importedTools is empty array', async () => {
    const mockStackConnector = {
      id: 'mcp-connector-5',
      name: 'mcp stack connector',
      actionTypeId: '.mcp',
    };

    const connectorWithEmptyTools = {
      ...mockConnectorTypeDef,
      importedTools: [],
    };

    mockActionsClient.create.mockResolvedValue(mockStackConnector);

    await createMcpConnector(
      mockRegistry,
      mockActions as any,
      mockRequest,
      connectorWithEmptyTools as any,
      'test-connector',
      'test-token',
      mockLogger
    );

    expect(getMcpToolsModule.getMcpTools).not.toHaveBeenCalled();
    expect(bulkCreateMcpToolsModule.bulkCreateMcpTools).not.toHaveBeenCalled();
  });

  it('should handle errors when creating MCP tools and rethrow', async () => {
    const mockStackConnector = {
      id: 'mcp-connector-6',
      name: 'mcp stack connector',
      actionTypeId: '.mcp',
    };

    const connectorWithTools = {
      ...mockConnectorTypeDef,
      importedTools: ['get_file_contents'],
    };

    const toolError = new Error('Failed to get MCP tools');
    mockActionsClient.create.mockResolvedValue(mockStackConnector);
    jest.spyOn(getMcpToolsModule, 'getMcpTools').mockRejectedValue(toolError);

    await expect(
      createMcpConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        connectorWithTools as any,
        'test-connector',
        'test-token',
        mockLogger
      )
    ).rejects.toThrow(
      'Error creating MCP tools for test-connector: Error: Failed to get MCP tools'
    );
  });

  it('should handle errors when bulk creating MCP tools and rethrow', async () => {
    const mockStackConnector = {
      id: 'mcp-connector-7',
      name: 'mcp stack connector',
      actionTypeId: '.mcp',
    };

    const connectorWithTools = {
      ...mockConnectorTypeDef,
      importedTools: ['get_file_contents'],
    };

    const mockMcpTools = [{ name: 'get_file_contents', description: 'Get file contents' }];
    const bulkCreateError = new Error('Failed to bulk create tools');

    mockActionsClient.create.mockResolvedValue(mockStackConnector);
    jest.spyOn(getMcpToolsModule, 'getMcpTools').mockResolvedValue(mockMcpTools);
    jest.spyOn(bulkCreateMcpToolsModule, 'bulkCreateMcpTools').mockRejectedValue(bulkCreateError);

    await expect(
      createMcpConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        connectorWithTools as any,
        'test-connector',
        'test-token',
        mockLogger
      )
    ).rejects.toThrow(
      'Error creating MCP tools for test-connector: Error: Failed to bulk create tools'
    );
  });

  it('should handle partial tool creation failures gracefully', async () => {
    const mockStackConnector = {
      id: 'mcp-connector-8',
      name: 'mcp stack connector',
      actionTypeId: '.mcp',
    };

    const connectorWithTools = {
      ...mockConnectorTypeDef,
      importedTools: ['get_file_contents', 'list_issues'],
    };

    const mockMcpTools = [
      { name: 'get_file_contents', description: 'Get file contents' },
      { name: 'list_issues', description: 'List issues' },
    ];

    const mockBulkCreateResults = {
      results: [
        {
          toolId: 'test-connector.get_file_contents',
          mcpToolName: 'get_file_contents',
          success: true as const,
        },
        {
          toolId: 'test-connector.list_issues',
          mcpToolName: 'list_issues',
          success: false as const,
          reason: {
            type: 'error' as const,
            error: { code: 'unknown', message: 'Tool creation failed' },
          },
        },
      ],
      summary: { total: 2, created: 1, skipped: 0, failed: 1 },
    };

    mockActionsClient.create.mockResolvedValue(mockStackConnector);
    jest.spyOn(getMcpToolsModule, 'getMcpTools').mockResolvedValue(mockMcpTools);
    jest
      .spyOn(bulkCreateMcpToolsModule, 'bulkCreateMcpTools')
      .mockResolvedValue(mockBulkCreateResults as any);

    const result = await createMcpConnector(
      mockRegistry,
      mockActions as any,
      mockRequest,
      connectorWithTools as any,
      'test-connector',
      'test-token',
      mockLogger
    );

    // Should still return the connector even if some tools failed
    expect(result).toEqual(mockStackConnector);
  });

  it('should handle empty tool list from getMcpTools', async () => {
    const mockStackConnector = {
      id: 'mcp-connector-9',
      name: 'mcp stack connector',
      actionTypeId: '.mcp',
    };

    const connectorWithTools = {
      ...mockConnectorTypeDef,
      importedTools: ['nonexistent_tool'],
    };

    mockActionsClient.create.mockResolvedValue(mockStackConnector);
    jest.spyOn(getMcpToolsModule, 'getMcpTools').mockResolvedValue([]);

    const result = await createMcpConnector(
      mockRegistry,
      mockActions as any,
      mockRequest,
      connectorWithTools as any,
      'test-connector',
      'test-token',
      mockLogger
    );

    expect(result).toEqual(mockStackConnector);
    expect(bulkCreateMcpToolsModule.bulkCreateMcpTools).not.toHaveBeenCalled();
  });
});
