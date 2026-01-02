/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { getMcpToolType, listMcpTools } from './tool_type';

jest.mock('@n8n/json-schema-to-zod', () => ({
  jsonSchemaToZod: jest.fn(),
}));

import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';

const mockJsonSchemaToZod = jsonSchemaToZod as jest.MockedFunction<typeof jsonSchemaToZod>;

describe('MCP tool_type', () => {
  let mockActions: jest.Mocked<ActionsPluginStart>;
  let mockActionsClient: {
    execute: jest.Mock;
    get: jest.Mock;
  };
  let mockRequest: KibanaRequest;
  let mockLogger: {
    debug: jest.Mock;
    error: jest.Mock;
  };

  const testConfig = {
    connector_id: 'test-connector-id',
    tool_name: 'test_tool',
  };

  const mockToolsResponse = {
    tools: [
      {
        name: 'test_tool',
        description: 'Test tool description',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'other_tool',
        description: 'Other tool',
        inputSchema: {},
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockActionsClient = {
      execute: jest.fn(),
      get: jest.fn(),
    };

    mockActions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
    } as unknown as jest.Mocked<ActionsPluginStart>;

    mockRequest = {} as KibanaRequest;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };
  });

  describe('listMcpTools', () => {
    it('should call listTools subAction on the connector', async () => {
      mockActionsClient.execute.mockResolvedValue({
        status: 'ok',
        data: mockToolsResponse,
      });

      const result = await listMcpTools({
        actions: mockActions,
        request: mockRequest,
        connectorId: 'test-connector-id',
      });

      expect(mockActions.getActionsClientWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockActionsClient.execute).toHaveBeenCalledWith({
        actionId: 'test-connector-id',
        params: {
          subAction: 'listTools',
          subActionParams: {},
        },
      });
      expect(result).toEqual(mockToolsResponse);
    });

    it('should throw error when listTools fails', async () => {
      mockActionsClient.execute.mockResolvedValue({
        status: 'error',
        message: 'Failed to connect to MCP server',
      });

      await expect(
        listMcpTools({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
        })
      ).rejects.toThrow('Failed to connect to MCP server');
    });

    it('should throw default error message when no message provided', async () => {
      mockActionsClient.execute.mockResolvedValue({
        status: 'error',
      });

      await expect(
        listMcpTools({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
        })
      ).rejects.toThrow('Failed to list MCP tools');
    });
  });

  describe('getMcpToolType', () => {
    it('should return a tool type definition with correct toolType', () => {
      const toolType = getMcpToolType({ actions: mockActions });

      expect(toolType.toolType).toBe(ToolType.mcp);
      expect(toolType.createSchema).toBeDefined();
      expect(toolType.updateSchema).toBeDefined();
      expect(toolType.validateForCreate).toBeDefined();
      expect(toolType.validateForUpdate).toBeDefined();
      expect(toolType.getDynamicProps).toBeDefined();
    });

    it('should have trackHealth enabled for external service monitoring', () => {
      const toolType = getMcpToolType({ actions: mockActions });

      expect(toolType.trackHealth).toBe(true);
    });
  });

  describe('getDynamicProps', () => {
    describe('getHandler', () => {
      it('should execute MCP tool successfully and return results', async () => {
        const toolType = getMcpToolType({ actions: mockActions });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'ok',
          data: { result: 'success', value: 42 },
        });

        const handler = await dynamicProps.getHandler();
        const params = { query: 'test query' };
        const context = {
          logger: mockLogger,
        };

        const result = await handler(params, context as any);

        expect(mockActions.getActionsClientWithRequest).toHaveBeenCalledWith(mockRequest);
        expect(mockActionsClient.execute).toHaveBeenCalledWith({
          actionId: 'test-connector-id',
          params: {
            subAction: 'callTool',
            subActionParams: {
              name: 'test_tool',
              arguments: { query: 'test query' },
            },
          },
        });
        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.other,
              data: { result: 'success', value: 42 },
            },
          ],
        });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Executing MCP tool: connector=test-connector-id, tool=test_tool'
        );
      });

      it('should return error result when connector execution returns error status', async () => {
        const toolType = getMcpToolType({ actions: mockActions });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'error',
          message: 'Tool execution failed: invalid parameters',
        });

        const handler = await dynamicProps.getHandler();
        const result = await handler({}, {
          logger: mockLogger,
        } as any);

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'Tool execution failed: invalid parameters',
              },
            },
          ],
        });
      });

      it('should return error result with default message when connector error has no message', async () => {
        const toolType = getMcpToolType({ actions: mockActions });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'error',
        });

        const handler = await dynamicProps.getHandler();
        const result = await handler({}, {
          logger: mockLogger,
        } as any);

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'MCP tool execution failed',
              },
            },
          ],
        });
      });

      it('should catch exceptions and return error result', async () => {
        const toolType = getMcpToolType({ actions: mockActions });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        const testError = new Error('Connection timeout');
        mockActions.getActionsClientWithRequest.mockRejectedValue(testError);

        const handler = await dynamicProps.getHandler();
        const result = await handler({}, {
          logger: mockLogger,
        } as any);

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'Failed to execute MCP tool: Connection timeout',
              },
            },
          ],
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('MCP tool execution failed')
        );
      });

      it('should handle non-Error exceptions', async () => {
        const toolType = getMcpToolType({ actions: mockActions });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActions.getActionsClientWithRequest.mockRejectedValue('string error');

        const handler = await dynamicProps.getHandler();
        const result = await handler({}, {
          logger: mockLogger,
        } as any);

        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: 'Failed to execute MCP tool: string error',
              },
            },
          ],
        });
      });
    });

    describe('getSchema', () => {
      it('should retrieve and convert input schema from listTools', async () => {
        const toolType = getMcpToolType({ actions: mockActions });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'ok',
          data: mockToolsResponse,
        });

        const mockZodSchema = { _def: { typeName: 'ZodObject' } };
        mockJsonSchemaToZod.mockReturnValue(mockZodSchema as any);

        const schema = await dynamicProps.getSchema();

        expect(mockActionsClient.execute).toHaveBeenCalledWith({
          actionId: 'test-connector-id',
          params: {
            subAction: 'listTools',
            subActionParams: {},
          },
        });
        expect(mockJsonSchemaToZod).toHaveBeenCalledWith(mockToolsResponse.tools[0].inputSchema);
        expect(schema).toBe(mockZodSchema);
      });

      it('should return empty schema when listTools fails', async () => {
        const toolType = getMcpToolType({ actions: mockActions });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'error',
          message: 'Connection failed',
        });

        const schema = await dynamicProps.getSchema();
        expect(schema).toBeDefined();
        expect(mockJsonSchemaToZod).not.toHaveBeenCalled();
      });

      it('should return empty schema when tool not found in listTools response', async () => {
        const toolType = getMcpToolType({ actions: mockActions });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'ok',
          data: {
            tools: [{ name: 'other_tool', description: 'Other tool', inputSchema: {} }],
          },
        });

        const schema = await dynamicProps.getSchema();
        expect(schema).toBeDefined();
        expect(mockJsonSchemaToZod).not.toHaveBeenCalled();
      });

      it('should throw error when jsonSchemaToZod fails', async () => {
        const toolType = getMcpToolType({ actions: mockActions });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'ok',
          data: mockToolsResponse,
        });

        mockJsonSchemaToZod.mockImplementation(() => {
          throw new Error('Invalid JSON Schema');
        });

        await expect(dynamicProps.getSchema()).rejects.toThrow('Invalid JSON Schema');
      });
    });

    describe('getLlmDescription', () => {
      it('should return formatted description with MCP-specific information', async () => {
        const toolType = getMcpToolType({ actions: mockActions });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        const result = dynamicProps.getLlmDescription!({
          description: 'Search documents in the knowledge base',
          config: testConfig,
        });

        expect(result).toContain('Search documents in the knowledge base');
        expect(result).toContain('MCP (Model Context Protocol) server');
        expect(result).toContain("Server tool name: 'test_tool'");
      });

      it('should include the correct tool name from config', async () => {
        const toolType = getMcpToolType({ actions: mockActions });
        const customConfig = {
          connector_id: 'my-connector',
          tool_name: 'custom_search_tool',
        };
        const dynamicProps = await toolType.getDynamicProps(customConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        const result = dynamicProps.getLlmDescription!({
          description: 'Custom tool description',
          config: customConfig,
        });

        expect(result).toContain("Server tool name: 'custom_search_tool'");
      });
    });
  });
});
