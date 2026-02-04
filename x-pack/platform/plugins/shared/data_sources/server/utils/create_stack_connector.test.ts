/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createStackConnector } from './create_stack_connector';
import * as getMcpToolsModule from '@kbn/agent-builder-plugin/server/services/tools/tool_types/mcp/tool_type';
import * as bulkCreateMcpToolsModule from '@kbn/agent-builder-plugin/server/services/tools/utils/bulk_create_mcp_tools';
import { createToolRegistryMock } from '@kbn/agent-builder-plugin/server/test_utils/tools';
import { connectorsSpecs } from '@kbn/connector-specs';

describe('createStackConnector', () => {
  const mockLogger = loggerMock.create();
  const mockRequest = httpServerMock.createKibanaRequest();
  const mockActionsClient = {
    create: jest.fn(),
  };
  const mockActions = {
    getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
  };
  const mockRegistry = createToolRegistryMock();
  const mockToolIds: string[] = [];

  const mockStackConnectorConfig = {
    type: '.mcp',
    config: {
      serverUrl: 'https://api.example.com/mcp/',
      hasAuth: true,
      authType: 'bearer' as const,
    },
    importedTools: undefined as string[] | undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockToolIds.length = 0;
    jest.spyOn(getMcpToolsModule, 'getNamedMcpTools').mockResolvedValue([]);
    jest.spyOn(bulkCreateMcpToolsModule, 'bulkCreateMcpTools').mockResolvedValue({
      results: [],
      summary: { total: 0, created: 0, skipped: 0, failed: 0 },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('MCP connectors', () => {
    it('should create MCP connector with correct configuration', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-1',
        name: ".mcp stack connector for data connector 'test-connector'",
        actionTypeId: '.mcp',
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        mockStackConnectorConfig,
        'test-connector',
        mockToolIds,
        'test-token-123',
        mockLogger
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActions.getActionsClientWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: ".mcp stack connector for data connector 'test-connector'",
          actionTypeId: '.mcp',
          config: {
            serverUrl: 'https://api.example.com/mcp/',
            hasAuth: true,
            authType: 'bearer',
          },
          secrets: {
            token: 'test-token-123',
          },
        },
      });
    });

    it('should create MCP connector with apiKey auth type', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-apiKey',
        name: ".mcp stack connector for data connector 'test-connector'",
        actionTypeId: '.mcp',
      };

      const connectorConfigWithApiKey = {
        type: '.mcp',
        config: {
          serverUrl: 'https://api.example.com/mcp/',
          hasAuth: true,
          authType: 'apiKey' as const,
          apiKeyHeaderName: 'X-API-Key',
        },
        importedTools: undefined,
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        connectorConfigWithApiKey,
        'test-connector',
        mockToolIds,
        'api-key-123',
        mockLogger
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: ".mcp stack connector for data connector 'test-connector'",
          actionTypeId: '.mcp',
          config: {
            serverUrl: 'https://api.example.com/mcp/',
            hasAuth: true,
            authType: 'apiKey',
            apiKeyHeaderName: 'X-API-Key',
          },
          secrets: {
            apiKey: 'api-key-123',
            secretHeaders: {
              'X-API-Key': 'api-key-123',
            },
          },
        },
      });
    });

    it('should create MCP connector with basic auth type', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-basic',
        name: ".mcp stack connector for data connector 'test-connector'",
        actionTypeId: '.mcp',
      };

      const connectorConfigWithBasic = {
        type: '.mcp',
        config: {
          serverUrl: 'https://api.example.com/mcp/',
          hasAuth: true,
          authType: 'basic' as const,
        },
        importedTools: undefined,
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        connectorConfigWithBasic,
        'test-connector',
        mockToolIds,
        'username:password',
        mockLogger
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: ".mcp stack connector for data connector 'test-connector'",
          actionTypeId: '.mcp',
          config: {
            serverUrl: 'https://api.example.com/mcp/',
            hasAuth: true,
            authType: 'basic',
          },
          secrets: {
            user: 'username',
            password: 'password',
          },
        },
      });
    });

    it('should create MCP connector with no auth', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-no-auth',
        name: ".mcp stack connector for data connector 'test-connector'",
        actionTypeId: '.mcp',
      };

      const connectorConfigNoAuth = {
        type: '.mcp',
        config: {
          serverUrl: 'https://api.example.com/mcp/',
          hasAuth: false,
          authType: 'none' as const,
        },
        importedTools: undefined,
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        connectorConfigNoAuth,
        'test-connector',
        mockToolIds,
        '',
        mockLogger
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: ".mcp stack connector for data connector 'test-connector'",
          actionTypeId: '.mcp',
          config: {
            serverUrl: 'https://api.example.com/mcp/',
            hasAuth: false,
            authType: 'none',
          },
          secrets: {},
        },
      });
    });

    it('should create MCP tools when importedTools are provided', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-3',
        name: '.mcp stack connector',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithTools = {
        ...mockStackConnectorConfig,
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
      jest.spyOn(getMcpToolsModule, 'getNamedMcpTools').mockResolvedValue(mockMcpTools);
      jest
        .spyOn(bulkCreateMcpToolsModule, 'bulkCreateMcpTools')
        .mockResolvedValue(mockBulkCreateResults);

      const result = await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        connectorConfigWithTools,
        'test-connector',
        mockToolIds,
        'test-token',
        mockLogger
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockToolIds).toEqual([
        'test-connector.get_file_contents',
        'test-connector.list_issues',
        'test-connector.get_commit',
      ]);
      expect(getMcpToolsModule.getNamedMcpTools).toHaveBeenCalledWith({
        actions: mockActions,
        request: mockRequest,
        connectorId: 'mcp-connector-3',
        toolNames: ['get_file_contents', 'list_issues', 'get_commit'],
        logger: mockLogger,
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
        name: '.mcp stack connector',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithoutTools = {
        ...mockStackConnectorConfig,
        importedTools: undefined,
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        connectorConfigWithoutTools,
        'test-connector',
        mockToolIds,
        'test-token',
        mockLogger
      );

      expect(getMcpToolsModule.getNamedMcpTools).not.toHaveBeenCalled();
      expect(bulkCreateMcpToolsModule.bulkCreateMcpTools).not.toHaveBeenCalled();
    });

    it('should not create MCP tools when importedTools is empty array', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-5',
        name: '.mcp stack connector',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithEmptyTools = {
        ...mockStackConnectorConfig,
        importedTools: [],
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        connectorConfigWithEmptyTools,
        'test-connector',
        mockToolIds,
        'test-token',
        mockLogger
      );

      expect(getMcpToolsModule.getNamedMcpTools).not.toHaveBeenCalled();
      expect(bulkCreateMcpToolsModule.bulkCreateMcpTools).not.toHaveBeenCalled();
    });

    it('should handle errors when creating MCP tools and rethrow', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-6',
        name: '.mcp stack connector',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithTools = {
        ...mockStackConnectorConfig,
        importedTools: ['get_file_contents'],
      };

      const toolError = new Error('Failed to get MCP tools');
      mockActionsClient.create.mockResolvedValue(mockStackConnector);
      jest.spyOn(getMcpToolsModule, 'getNamedMcpTools').mockRejectedValue(toolError);

      await expect(
        createStackConnector(
          mockRegistry,
          mockActions as any,
          mockRequest,
          connectorConfigWithTools,
          'test-connector',
          mockToolIds,
          'test-token',
          mockLogger
        )
      ).rejects.toThrow('Failed to get MCP tools');
    });

    it('should handle errors when bulk creating MCP tools and rethrow', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-7',
        name: '.mcp stack connector',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithTools = {
        ...mockStackConnectorConfig,
        importedTools: ['get_file_contents'],
      };

      const mockMcpTools = [{ name: 'get_file_contents', description: 'Get file contents' }];
      const bulkCreateError = new Error('Failed to bulk create tools');

      mockActionsClient.create.mockResolvedValue(mockStackConnector);
      jest.spyOn(getMcpToolsModule, 'getNamedMcpTools').mockResolvedValue(mockMcpTools);
      jest.spyOn(bulkCreateMcpToolsModule, 'bulkCreateMcpTools').mockRejectedValue(bulkCreateError);

      await expect(
        createStackConnector(
          mockRegistry,
          mockActions as any,
          mockRequest,
          connectorConfigWithTools,
          'test-connector',
          mockToolIds,
          'test-token',
          mockLogger
        )
      ).rejects.toThrow(
        'Error bulk importing MCP tools for test-connector: Error: Failed to bulk create tools'
      );
    });

    it('should handle partial tool creation failures gracefully', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-8',
        name: '.mcp stack connector',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithTools = {
        ...mockStackConnectorConfig,
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
      jest.spyOn(getMcpToolsModule, 'getNamedMcpTools').mockResolvedValue(mockMcpTools);
      jest
        .spyOn(bulkCreateMcpToolsModule, 'bulkCreateMcpTools')
        .mockResolvedValue(mockBulkCreateResults as any);

      const result = await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        connectorConfigWithTools,
        'test-connector',
        mockToolIds,
        'test-token',
        mockLogger
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockToolIds).toEqual([
        'test-connector.get_file_contents',
        'test-connector.list_issues',
      ]);
    });

    it('should handle empty tool list from getMcpTools', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-9',
        name: '.mcp stack connector',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithTools = {
        ...mockStackConnectorConfig,
        importedTools: ['nonexistent_tool'],
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);
      jest.spyOn(getMcpToolsModule, 'getNamedMcpTools').mockResolvedValue([]);

      const result = await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        connectorConfigWithTools,
        'test-connector',
        mockToolIds,
        'test-token',
        mockLogger
      );

      expect(result).toEqual(mockStackConnector);
      expect(bulkCreateMcpToolsModule.bulkCreateMcpTools).not.toHaveBeenCalled();
    });

    it('should handle empty array return from getNamedMcpTools', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-10',
        name: '.mcp stack connector',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithTools = {
        ...mockStackConnectorConfig,
        importedTools: ['get_file_contents'],
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);
      jest.spyOn(getMcpToolsModule, 'getNamedMcpTools').mockResolvedValue([]);

      const result = await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        connectorConfigWithTools,
        'test-connector',
        mockToolIds,
        'test-token',
        mockLogger
      );

      expect(result).toEqual(mockStackConnector);
      expect(getMcpToolsModule.getNamedMcpTools).toHaveBeenCalledWith({
        actions: mockActions,
        request: mockRequest,
        connectorId: 'mcp-connector-10',
        toolNames: ['get_file_contents'],
        logger: mockLogger,
      });
      expect(bulkCreateMcpToolsModule.bulkCreateMcpTools).not.toHaveBeenCalled();
      expect(mockToolIds).toEqual([]);
    });
  });

  describe('stack connectors with connector v2 spec', () => {
    it('should create stack connector with connector v2 spec and bearer auth', async () => {
      const mockStackConnector = {
        id: 'notion-connector-1',
        name: ".notion stack connector for data connector 'test-connector'",
        actionTypeId: '.notion',
      };

      const notionConnectorConfig = {
        type: '.notion',
        config: {},
        importedTools: undefined,
      };

      // Mock the connector spec lookup
      const notionSpec = Object.values(connectorsSpecs).find(
        (spec) => spec.metadata.id === '.notion'
      );
      if (!notionSpec) {
        throw new Error('Notion spec not found');
      }

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        notionConnectorConfig,
        'test-connector',
        mockToolIds,
        'notion-token-123',
        mockLogger
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: ".notion stack connector for data connector 'test-connector'",
          actionTypeId: '.notion',
          config: {},
          secrets: expect.objectContaining({
            authType: 'bearer',
            token: 'notion-token-123',
          }),
        },
      });
    });

    it('should create stack connector with api_key_header auth', async () => {
      const mockStackConnector = {
        id: 'api-key-connector-1',
        name: ".test stack connector for data connector 'test-connector'",
        actionTypeId: '.test',
      };

      // Find a connector spec that uses api_key_header auth
      const apiKeySpec = Object.values(connectorsSpecs).find((spec) => {
        return spec.auth?.types.some((authType) => {
          const typeId = typeof authType === 'string' ? authType : authType.type;
          return typeId === 'api_key_header';
        });
      });

      if (!apiKeySpec) {
        // Skip test if no api_key_header connector exists
        return;
      }

      const apiKeyConnectorConfig = {
        type: apiKeySpec.metadata.id,
        config: {},
        importedTools: undefined,
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        apiKeyConnectorConfig,
        'test-connector',
        mockToolIds,
        'api-key-123',
        mockLogger
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: `${apiKeySpec.metadata.id} stack connector for data connector 'test-connector'`,
          actionTypeId: apiKeySpec.metadata.id,
          config: {},
          secrets: expect.objectContaining({
            authType: 'api_key_header',
            apiKey: 'api-key-123',
          }),
        },
      });
    });

    it('should throw error when connector v2 spec is not found', async () => {
      const invalidConnectorConfig = {
        type: '.nonexistent',
        config: {},
        importedTools: undefined,
      };

      await expect(
        createStackConnector(
          mockRegistry,
          mockActions as any,
          mockRequest,
          invalidConnectorConfig,
          'test-connector',
          mockToolIds,
          'token',
          mockLogger
        )
      ).rejects.toThrow('Stack connector spec not found for type ".nonexistent"');
    });

    it('should not create MCP tools for stack connectors with connector v2 spec', async () => {
      const mockStackConnector = {
        id: 'notion-connector-2',
        name: ".notion stack connector for data connector 'test-connector'",
        actionTypeId: '.notion',
      };

      const notionConnectorConfig = {
        type: '.notion',
        config: {},
        importedTools: ['some-tool'], // Even if importedTools is provided, it shouldn't be used for connector v2 spec connectors
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockRegistry,
        mockActions as any,
        mockRequest,
        notionConnectorConfig,
        'test-connector',
        mockToolIds,
        'notion-token-123',
        mockLogger
      );

      expect(result).toEqual(mockStackConnector);
      expect(getMcpToolsModule.getNamedMcpTools).not.toHaveBeenCalled();
      expect(bulkCreateMcpToolsModule.bulkCreateMcpTools).not.toHaveBeenCalled();
    });
  });
});
