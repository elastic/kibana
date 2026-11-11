/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE_ID } from '@kbn/connector-schemas/mcp/constants';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { createToolHandlerContextMock } from '../../../../test_utils/runner';
import { getMcpToolType, listMcpTools, getNamedMcpTools } from './tool_type';

jest.mock('@kbn/zod/v4/from_json_schema', () => ({
  fromJSONSchema: jest.fn(),
}));

import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';

const mockFromJSONSchema = fromJSONSchema as jest.MockedFunction<typeof fromJSONSchema>;

describe('MCP tool_type', () => {
  let mockActions: jest.Mocked<ActionsPluginStart>;
  let mockActionsClient: {
    execute: jest.Mock;
    get: jest.Mock;
  };
  let mockRequest: KibanaRequest;
  let mockLogger: MockedLogger;

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
      get: jest.fn().mockResolvedValue({
        id: 'test-connector-id',
        actionTypeId: MCP_CONNECTOR_TYPE_ID,
      }),
    };

    mockActions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
    } as unknown as jest.Mocked<ActionsPluginStart>;

    mockRequest = {} as KibanaRequest;

    mockLogger = loggerMock.create();
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
      expect(mockActionsClient.get).toHaveBeenCalledWith({ id: 'test-connector-id' });
      expect(mockActionsClient.execute).toHaveBeenCalledWith({
        actionId: 'test-connector-id',
        params: {
          subAction: 'listTools',
          subActionParams: {},
        },
      });
      expect(result).toEqual(mockToolsResponse);
    });

    it('should throw without calling listTools when the connector is not an MCP connector', async () => {
      mockActionsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        actionTypeId: '.pagerduty_mcp',
      });

      await expect(
        listMcpTools({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
        })
      ).rejects.toThrow(
        `Connector 'test-connector-id' is not an MCP connector. Expected type '${MCP_CONNECTOR_TYPE_ID}', got '.pagerduty_mcp'`
      );
      expect(mockActionsClient.execute).not.toHaveBeenCalled();
    });

    it('should throw when the connector does not exist', async () => {
      mockActionsClient.get.mockRejectedValue(new Error('Saved object not found'));

      await expect(
        listMcpTools({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
        })
      ).rejects.toThrow('Saved object not found');
      expect(mockActionsClient.execute).not.toHaveBeenCalled();
    });

    it.each([
      ['undefined', undefined],
      ['an object without tools', {}],
      ['a bare tools array', mockToolsResponse.tools],
      ['an array of non-tool values', ['test_tool']],
      ['a tool without an input schema', { tools: [{ name: 'test_tool' }] }],
    ])('should throw when the connector returns %s', async (_label, data) => {
      mockActionsClient.execute.mockResolvedValue({ status: 'ok', data });

      await expect(
        listMcpTools({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
        })
      ).rejects.toThrow("Unexpected listTools response from connector 'test-connector-id'");
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

    it('should prefer serviceMessage over message when both are present', async () => {
      mockActionsClient.execute.mockResolvedValue({
        status: 'error',
        message: 'an error occurred while running the action',
        serviceMessage: 'Streamable HTTP error: missing required Authorization header',
      });

      await expect(
        listMcpTools({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
        })
      ).rejects.toThrow('Streamable HTTP error: missing required Authorization header');
    });
  });

  describe('getNamedMcpTools', () => {
    it('should return filtered tools matching the requested names', async () => {
      mockActionsClient.execute.mockResolvedValue({
        status: 'ok',
        data: mockToolsResponse,
      });

      const result = await getNamedMcpTools({
        actions: mockActions,
        request: mockRequest,
        connectorId: 'test-connector-id',
        toolNames: ['test_tool'],
        logger: mockLogger,
      });

      expect(result).toEqual([{ name: 'test_tool', description: 'Test tool description' }]);
    });

    it('should throw and log when the connector execution fails', async () => {
      mockActionsClient.execute.mockResolvedValue({
        status: 'error',
        message: 'an error occurred while running the action',
        serviceMessage: 'Streamable HTTP error: missing required Authorization header',
      });

      await expect(
        getNamedMcpTools({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
          toolNames: ['test_tool'],
          logger: mockLogger,
        })
      ).rejects.toThrow('Streamable HTTP error: missing required Authorization header');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getMcpToolType', () => {
    it('should return a tool type definition with correct toolType', () => {
      const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });

      expect(toolType.toolType).toBe(ToolType.mcp);
      expect(toolType.createSchema).toBeDefined();
      expect(toolType.updateSchema).toBeDefined();
      expect(toolType.validateForCreate).toBeDefined();
      expect(toolType.validateForUpdate).toBeDefined();
      expect(toolType.getDynamicProps).toBeDefined();
    });

    it('should have trackHealth enabled for external service monitoring', () => {
      const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });

      expect(toolType.trackHealth).toBe(true);
    });
  });

  describe('getDynamicProps', () => {
    describe('getHandler', () => {
      it('should execute MCP tool successfully and return results', async () => {
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
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

      it('should return error result without calling the connector when it is not an MCP connector', async () => {
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.get.mockResolvedValue({
          id: 'test-connector-id',
          actionTypeId: '.pagerduty_mcp',
        });

        const handler = await dynamicProps.getHandler();
        const result = await handler({ query: 'test query' }, createToolHandlerContextMock());

        expect(mockActionsClient.get).toHaveBeenCalledWith({ id: 'test-connector-id' });
        expect(mockActionsClient.execute).not.toHaveBeenCalled();
        expect(result).toEqual({
          results: [
            {
              type: ToolResultType.error,
              data: {
                message:
                  `Connector 'test-connector-id' is not an MCP connector. Expected type '${MCP_CONNECTOR_TYPE_ID}', got '.pagerduty_mcp', ` +
                  "so MCP tool 'test_tool' cannot run. Do not retry. Tell the user this tool must be deleted or updated to use an MCP connector.",
              },
            },
          ],
        });
      });

      it('should return error result when connector execution returns error status', async () => {
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
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

      it('should prefer serviceMessage over message when connector execution returns error status', async () => {
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'error',
          message: 'an error occurred while running the action',
          serviceMessage: 'redacted upstream tool error',
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
                message: 'redacted upstream tool error',
              },
            },
          ],
        });
      });

      it('should return error result with default message when connector error has no message', async () => {
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
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
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
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
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
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
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'ok',
          data: mockToolsResponse,
        });

        const mockZodSchema = { _zod: { typeName: 'ZodObject' } };
        mockFromJSONSchema.mockReturnValue(mockZodSchema as any);

        const schema = await dynamicProps.getSchema();

        expect(mockActionsClient.execute).toHaveBeenCalledWith({
          actionId: 'test-connector-id',
          params: {
            subAction: 'listTools',
            subActionParams: {},
          },
        });
        expect(mockFromJSONSchema).toHaveBeenCalledWith(mockToolsResponse.tools[0].inputSchema);
        expect(schema).toBe(mockZodSchema);
      });

      it('should return empty schema without calling listTools when the connector is not an MCP connector', async () => {
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.get.mockResolvedValue({
          id: 'test-connector-id',
          actionTypeId: '.pagerduty_mcp',
        });

        const schema = await dynamicProps.getSchema();

        expect(schema.shape).toEqual({});
        expect(mockActionsClient.execute).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Failed to list tools for MCP tool 'test_tool' on connector 'test-connector-id', falling back to an empty schema: " +
            `Connector 'test-connector-id' is not an MCP connector. Expected type '${MCP_CONNECTOR_TYPE_ID}', got '.pagerduty_mcp'`
        );
      });

      it('should return empty schema when fromJSONSchema throws', async () => {
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'ok',
          data: mockToolsResponse,
        });

        mockFromJSONSchema.mockImplementationOnce(() => {
          throw new Error('Unsupported JSON schema');
        });

        const schema = await dynamicProps.getSchema();

        expect(schema.shape).toEqual({});
        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Failed to resolve input schema for MCP tool 'test_tool' on connector 'test-connector-id', falling back to an empty schema: Unsupported JSON schema"
        );
      });

      it('should return empty schema when listTools fails', async () => {
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
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
        expect(mockFromJSONSchema).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          "Failed to list tools for MCP tool 'test_tool' on connector 'test-connector-id', falling back to an empty schema: Connection failed"
        );
      });

      it('should return empty schema when tool not found in listTools response', async () => {
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
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
        expect(mockFromJSONSchema).not.toHaveBeenCalled();
      });

      it('should return empty schema when fromJSONSchema returns undefined', async () => {
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
        const dynamicProps = await toolType.getDynamicProps(testConfig, {
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'ok',
          data: mockToolsResponse,
        });

        mockFromJSONSchema.mockReturnValue(undefined);

        const schema = await dynamicProps.getSchema();
        expect(schema).toBeDefined();
      });
    });

    describe('getLlmDescription', () => {
      it('should return formatted description with MCP-specific information', async () => {
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
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
        const toolType = getMcpToolType({ actions: mockActions, logger: mockLogger });
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
