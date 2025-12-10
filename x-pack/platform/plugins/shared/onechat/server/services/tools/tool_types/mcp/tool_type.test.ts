/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE } from '@kbn/stack-connectors-plugin/server/saved_objects';
import { getMcpToolType } from './tool_type';

jest.mock('@n8n/json-schema-to-zod', () => ({
  jsonSchemaToZod: jest.fn(),
}));

import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';

const mockJsonSchemaToZod = jsonSchemaToZod as jest.MockedFunction<typeof jsonSchemaToZod>;

describe('MCP tool_type', () => {
  let mockActions: jest.Mocked<ActionsPluginStart>;
  let mockActionsClient: {
    execute: jest.Mock;
  };
  let mockRequest: KibanaRequest;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockLogger: {
    debug: jest.Mock;
    error: jest.Mock;
  };

  const testConfig = {
    connector_id: 'test-connector-id',
    tool_name: 'test_tool',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockActionsClient = {
      execute: jest.fn(),
    };

    mockActions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
    } as unknown as jest.Mocked<ActionsPluginStart>;

    mockRequest = {} as KibanaRequest;

    mockSavedObjectsClient = {
      get: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsClientContract>;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };
  });

  describe('getMcpToolType', () => {
    it('should return a tool type definition with correct toolType', () => {
      const toolType = getMcpToolType();

      expect(toolType.toolType).toBe(ToolType.mcp);
      expect(toolType.createSchema).toBeDefined();
      expect(toolType.updateSchema).toBeDefined();
      expect(toolType.validateForCreate).toBeDefined();
      expect(toolType.validateForUpdate).toBeDefined();
      expect(toolType.getDynamicProps).toBeDefined();
    });
  });

  describe('getDynamicProps', () => {
    describe('getHandler', () => {
      it('should execute MCP tool successfully and return results', async () => {
        const toolType = getMcpToolType();
        const dynamicProps = toolType.getDynamicProps(testConfig, {
          savedObjectsClient: mockSavedObjectsClient,
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'ok',
          data: { result: 'success', value: 42 },
        });

        const handler = dynamicProps.getHandler();
        const params = { query: 'test query' };
        const context = {
          logger: mockLogger,
          actions: mockActions,
          request: mockRequest,
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
        const toolType = getMcpToolType();
        const dynamicProps = toolType.getDynamicProps(testConfig, {
          savedObjectsClient: mockSavedObjectsClient,
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'error',
          message: 'Tool execution failed: invalid parameters',
        });

        const handler = dynamicProps.getHandler();
        const result = await handler({}, {
          logger: mockLogger,
          actions: mockActions,
          request: mockRequest,
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
        const toolType = getMcpToolType();
        const dynamicProps = toolType.getDynamicProps(testConfig, {
          savedObjectsClient: mockSavedObjectsClient,
          request: mockRequest,
          spaceId: 'default',
        });

        mockActionsClient.execute.mockResolvedValue({
          status: 'error',
        });

        const handler = dynamicProps.getHandler();
        const result = await handler({}, {
          logger: mockLogger,
          actions: mockActions,
          request: mockRequest,
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
        const toolType = getMcpToolType();
        const dynamicProps = toolType.getDynamicProps(testConfig, {
          savedObjectsClient: mockSavedObjectsClient,
          request: mockRequest,
          spaceId: 'default',
        });

        const testError = new Error('Connection timeout');
        mockActions.getActionsClientWithRequest.mockRejectedValue(testError);

        const handler = dynamicProps.getHandler();
        const result = await handler({}, {
          logger: mockLogger,
          actions: mockActions,
          request: mockRequest,
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
        const toolType = getMcpToolType();
        const dynamicProps = toolType.getDynamicProps(testConfig, {
          savedObjectsClient: mockSavedObjectsClient,
          request: mockRequest,
          spaceId: 'default',
        });

        mockActions.getActionsClientWithRequest.mockRejectedValue('string error');

        const handler = dynamicProps.getHandler();
        const result = await handler({}, {
          logger: mockLogger,
          actions: mockActions,
          request: mockRequest,
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
      it('should retrieve and convert input schema from saved object', async () => {
        const toolType = getMcpToolType();
        const dynamicProps = toolType.getDynamicProps(testConfig, {
          savedObjectsClient: mockSavedObjectsClient,
          request: mockRequest,
          spaceId: 'default',
        });

        const mockInputSchema = {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        };

        mockSavedObjectsClient.get.mockResolvedValue({
          id: 'test-connector-id',
          type: MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
          attributes: {
            connectorId: 'test-connector-id',
            tools: [
              { name: 'test_tool', description: 'Test tool', inputSchema: mockInputSchema },
              { name: 'other_tool', description: 'Other tool', inputSchema: {} },
            ],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          references: [],
        });

        const mockZodSchema = { _def: { typeName: 'ZodObject' } };
        mockJsonSchemaToZod.mockReturnValue(mockZodSchema as any);

        const schema = await dynamicProps.getSchema();

        expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
          MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
          'test-connector-id'
        );
        expect(mockJsonSchemaToZod).toHaveBeenCalledWith(mockInputSchema);
        expect(schema).toBe(mockZodSchema);
      });

      it('should throw error when saved object not found', async () => {
        const toolType = getMcpToolType();
        const dynamicProps = toolType.getDynamicProps(testConfig, {
          savedObjectsClient: mockSavedObjectsClient,
          request: mockRequest,
          spaceId: 'default',
        });

        mockSavedObjectsClient.get.mockRejectedValue(new Error('Saved object not found'));

        await expect(dynamicProps.getSchema()).rejects.toThrow(
          `Failed to retrieve input schema for MCP tool 'test_tool' from connector 'test-connector-id'`
        );
      });

      it('should throw error when tool not found in saved object', async () => {
        const toolType = getMcpToolType();
        const dynamicProps = toolType.getDynamicProps(testConfig, {
          savedObjectsClient: mockSavedObjectsClient,
          request: mockRequest,
          spaceId: 'default',
        });

        mockSavedObjectsClient.get.mockResolvedValue({
          id: 'test-connector-id',
          type: MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
          attributes: {
            connectorId: 'test-connector-id',
            tools: [
              { name: 'other_tool', description: 'Other tool', inputSchema: {} },
            ],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          references: [],
        });

        await expect(dynamicProps.getSchema()).rejects.toThrow(
          `Failed to retrieve input schema for MCP tool 'test_tool' from connector 'test-connector-id'`
        );
        expect(mockJsonSchemaToZod).not.toHaveBeenCalled();
      });

      it('should throw error when jsonSchemaToZod fails', async () => {
        const toolType = getMcpToolType();
        const dynamicProps = toolType.getDynamicProps(testConfig, {
          savedObjectsClient: mockSavedObjectsClient,
          request: mockRequest,
          spaceId: 'default',
        });

        const malformedSchema = { invalid: 'schema' };
        mockSavedObjectsClient.get.mockResolvedValue({
          id: 'test-connector-id',
          type: MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
          attributes: {
            connectorId: 'test-connector-id',
            tools: [
              { name: 'test_tool', description: 'Test tool', inputSchema: malformedSchema },
            ],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          references: [],
        });

        mockJsonSchemaToZod.mockImplementation(() => {
          throw new Error('Invalid JSON Schema');
        });

        await expect(dynamicProps.getSchema()).rejects.toThrow(
          `Failed to convert JSON Schema to Zod for MCP tool 'test_tool': Invalid JSON Schema`
        );
        expect(mockJsonSchemaToZod).toHaveBeenCalledWith(malformedSchema);
      });
    });

    describe('getLlmDescription', () => {
      it('should return formatted description with MCP-specific information', () => {
        const toolType = getMcpToolType();
        const dynamicProps = toolType.getDynamicProps(testConfig, {
          savedObjectsClient: mockSavedObjectsClient,
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

      it('should include the correct tool name from config', () => {
        const toolType = getMcpToolType();
        const customConfig = {
          connector_id: 'my-connector',
          tool_name: 'custom_search_tool',
        };
        const dynamicProps = toolType.getDynamicProps(customConfig, {
          savedObjectsClient: mockSavedObjectsClient,
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

