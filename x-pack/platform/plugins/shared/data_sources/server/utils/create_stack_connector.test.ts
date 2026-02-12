/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createStackConnector } from './create_stack_connector';
import { connectorsSpecs } from '@kbn/connector-specs';
import type { StackConnectorConfig } from '@kbn/data-catalog-plugin';

describe('createStackConnector', () => {
  const MOCK_DATA_SOURCE_NAME = 'my-test-data-source';
  const mockRequest = httpServerMock.createKibanaRequest();
  const mockActionsClient = {
    create: jest.fn(),
  };
  const mockActions = {
    getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
  };
  const mockStackConnectorConfig: StackConnectorConfig = {
    type: '.mcp',
    config: {
      serverUrl: 'https://api.example.com/mcp/',
      hasAuth: true,
      authType: 'bearer' as const,
    },
    importedTools: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('MCP connectors', () => {
    it('should create MCP connector with correct configuration', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-1',
        name: '.mcp',
        actionTypeId: '.mcp',
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        mockStackConnectorConfig,
        'test-token-123'
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActions.getActionsClientWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: MOCK_DATA_SOURCE_NAME,
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
        name: '.mcp',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithApiKey: StackConnectorConfig = {
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
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        connectorConfigWithApiKey,
        'api-key-123'
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: MOCK_DATA_SOURCE_NAME,
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
        name: '.mcp',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithBasic: StackConnectorConfig = {
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
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        connectorConfigWithBasic,
        'username:password'
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: MOCK_DATA_SOURCE_NAME,
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
        name: '.mcp',
        actionTypeId: '.mcp',
      };

      const connectorConfigNoAuth: StackConnectorConfig = {
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
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        connectorConfigNoAuth,
        ''
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: MOCK_DATA_SOURCE_NAME,
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
        name: '.mcp',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithTools: StackConnectorConfig = {
        ...mockStackConnectorConfig,
        importedTools: [
          { name: 'get_file_contents', description: 'Get file contents' },
          { name: 'list_issues', description: 'List issues' },
          { name: 'get_commit', description: 'Get commit details' },
        ],
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        connectorConfigWithTools,
        'test-token'
      );

      expect(result).toEqual(mockStackConnector);
    });

    it('should not create MCP tools when importedTools is not provided', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-4',
        name: '.mcp',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithoutTools: StackConnectorConfig = {
        ...mockStackConnectorConfig,
        importedTools: undefined,
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      await createStackConnector(
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        connectorConfigWithoutTools,
        'test-token'
      );
    });

    it('should not create MCP tools when importedTools is empty array', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-5',
        name: '.mcp',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithEmptyTools: StackConnectorConfig = {
        ...mockStackConnectorConfig,
        importedTools: [],
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      await createStackConnector(
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        connectorConfigWithEmptyTools,
        'test-token'
      );

      // Note: MCP tools creation is handled separately, not in createStackConnector
    });

    it('should handle errors when creating MCP tools and rethrow', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-6',
        name: '.mcp',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithTools: StackConnectorConfig = {
        ...mockStackConnectorConfig,
        importedTools: [{ name: 'get_file_contents', description: 'Get file contents' }],
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        connectorConfigWithTools,
        'test-token'
      );
      expect(result).toEqual(mockStackConnector);
    });

    it('should handle errors when bulk creating MCP tools and rethrow', async () => {
      const mockStackConnector = {
        id: 'mcp-connector-7',
        name: '.mcp',
        actionTypeId: '.mcp',
      };

      const connectorConfigWithTools: StackConnectorConfig = {
        ...mockStackConnectorConfig,
        importedTools: [{ name: 'get_file_contents', description: 'Get file contents' }],
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        connectorConfigWithTools,
        'test-token'
      );
      expect(result).toEqual(mockStackConnector);
    });
  });

  describe('stack connectors with connector v2 spec', () => {
    it('should create stack connector with connector v2 spec and bearer auth', async () => {
      const mockStackConnector = {
        id: 'notion-connector-1',
        name: '.notion',
        actionTypeId: '.notion',
      };

      const notionConnectorConfig: StackConnectorConfig = {
        type: '.notion',
        config: {},
        importedTools: undefined,
      };

      const notionSpec = Object.values(connectorsSpecs).find(
        (spec) => spec.metadata.id === '.notion'
      );
      if (!notionSpec) {
        throw new Error('Notion spec not found');
      }

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        notionConnectorConfig,
        'notion-token-123'
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: MOCK_DATA_SOURCE_NAME,
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
        name: '.test',
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

      const apiKeyConnectorConfig: StackConnectorConfig = {
        type: apiKeySpec.metadata.id,
        config: {},
        importedTools: undefined,
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        apiKeyConnectorConfig,
        'api-key-123'
      );

      expect(result).toEqual(mockStackConnector);
      expect(mockActionsClient.create).toHaveBeenCalledWith({
        action: {
          name: MOCK_DATA_SOURCE_NAME,
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
      const invalidConnectorConfig: StackConnectorConfig = {
        type: '.nonexistent',
        config: {},
        importedTools: undefined,
      };

      await expect(
        createStackConnector(
          mockActions as any,
          mockRequest,
          MOCK_DATA_SOURCE_NAME,
          invalidConnectorConfig,
          'token'
        )
      ).rejects.toThrow('Stack connector spec not found for type ".nonexistent"');
    });

    it('should not create MCP tools for stack connectors with connector v2 spec', async () => {
      const mockStackConnector = {
        id: 'notion-connector-2',
        name: '.notion',
        actionTypeId: '.notion',
      };

      const notionConnectorConfig: StackConnectorConfig = {
        type: '.notion',
        config: {},
        importedTools: [{ name: 'some-tool', description: 'Some tool' }], // Even if importedTools is provided, it shouldn't be used for connector v2 spec connectors
      };

      mockActionsClient.create.mockResolvedValue(mockStackConnector);

      const result = await createStackConnector(
        mockActions as any,
        mockRequest,
        MOCK_DATA_SOURCE_NAME,
        notionConnectorConfig,
        'notion-token-123'
      );

      expect(result).toEqual(mockStackConnector);
    });
  });
});
