/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE_ID } from '@kbn/connector-schemas/mcp/constants';
import { validateConnector, validateToolName, validateConfig } from './validate_configuration';

jest.mock('@kbn/agent-builder-common', () => ({
  createBadRequestError: jest.fn(),
}));

const mockCreateBadRequestError = createBadRequestError as jest.MockedFunction<
  typeof createBadRequestError
>;

describe('MCP validate_configuration', () => {
  let mockActions: jest.Mocked<ActionsPluginStart>;
  let mockActionsClient: {
    get: jest.Mock;
    execute: jest.Mock;
  };
  let mockRequest: KibanaRequest;

  const mockToolsResponse = {
    tools: [
      { name: 'tool_one', description: 'First tool', inputSchema: {} },
      { name: 'tool_two', description: 'Second tool', inputSchema: {} },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockActionsClient = {
      get: jest.fn(),
      execute: jest.fn(),
    };

    mockActions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
    } as unknown as jest.Mocked<ActionsPluginStart>;

    mockRequest = {} as KibanaRequest;

    mockCreateBadRequestError.mockImplementation((message: string) => {
      const error = new Error(message) as Error & { isBoom: boolean };
      error.name = 'AgentBuilderBadRequestError';
      error.isBoom = true;
      return error as any;
    });
  });

  describe('validateConnector', () => {
    it('should pass validation when connector exists and is MCP type', async () => {
      mockActionsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        actionTypeId: MCP_CONNECTOR_TYPE_ID,
        name: 'My MCP Connector',
      });

      await expect(
        validateConnector({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
        })
      ).resolves.toBeUndefined();

      expect(mockActions.getActionsClientWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockActionsClient.get).toHaveBeenCalledWith({ id: 'test-connector-id' });
    });

    it('should throw error when connector is not MCP type', async () => {
      mockActionsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        actionTypeId: '.gen-ai',
        name: 'Not an MCP Connector',
      });

      await expect(
        validateConnector({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
        })
      ).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        `Connector 'test-connector-id' is not an MCP connector. Expected type '${MCP_CONNECTOR_TYPE_ID}', got '.gen-ai'`
      );
    });

    it('should throw error when connector is not found', async () => {
      mockActionsClient.get.mockRejectedValue(new Error('Not found'));

      await expect(
        validateConnector({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'non-existent-connector',
        })
      ).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        `Connector 'non-existent-connector' not found or not accessible`
      );
    });

    it('should re-throw boom errors from wrong connector type check', async () => {
      mockActionsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        actionTypeId: '.slack',
        name: 'Slack Connector',
      });

      const thrownError = await validateConnector({
        actions: mockActions,
        request: mockRequest,
        connectorId: 'test-connector-id',
      }).catch((e) => e);

      expect(thrownError.isBoom).toBe(true);
    });
  });

  describe('validateToolName', () => {
    it('should pass validation when tool exists on connector', async () => {
      mockActionsClient.execute.mockResolvedValue({
        status: 'ok',
        data: mockToolsResponse,
      });

      await expect(
        validateToolName({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
          toolName: 'tool_one',
        })
      ).resolves.toBeUndefined();

      expect(mockActionsClient.execute).toHaveBeenCalledWith({
        actionId: 'test-connector-id',
        params: {
          subAction: 'listTools',
          subActionParams: {},
        },
      });
    });

    it('should throw error when tool is not found on connector', async () => {
      mockActionsClient.execute.mockResolvedValue({
        status: 'ok',
        data: mockToolsResponse,
      });

      await expect(
        validateToolName({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
          toolName: 'non_existent_tool',
        })
      ).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        `Tool 'non_existent_tool' not found on MCP connector 'test-connector-id'. Available tools: tool_one, tool_two`
      );
    });

    it('should show "none" when no tools are available', async () => {
      mockActionsClient.execute.mockResolvedValue({
        status: 'ok',
        data: { tools: [] },
      });

      await expect(
        validateToolName({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
          toolName: 'some_tool',
        })
      ).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        `Tool 'some_tool' not found on MCP connector 'test-connector-id'. Available tools: none`
      );
    });

    it('should throw error when listTools fails', async () => {
      mockActionsClient.execute.mockResolvedValue({
        status: 'error',
        message: 'Connection failed',
      });

      await expect(
        validateToolName({
          actions: mockActions,
          request: mockRequest,
          connectorId: 'test-connector-id',
          toolName: 'some_tool',
        })
      ).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        `Unable to verify tool 'some_tool' on connector 'test-connector-id'. ` +
          `Ensure the connector has successfully connected to the MCP server.`
      );
    });

    it('should re-throw boom errors from tool not found check', async () => {
      mockActionsClient.execute.mockResolvedValue({
        status: 'ok',
        data: { tools: [] },
      });

      const thrownError = await validateToolName({
        actions: mockActions,
        request: mockRequest,
        connectorId: 'test-connector-id',
        toolName: 'missing_tool',
      }).catch((e) => e);

      expect(thrownError.isBoom).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should pass validation when both connector and tool are valid', async () => {
      mockActionsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        actionTypeId: MCP_CONNECTOR_TYPE_ID,
        name: 'My MCP Connector',
      });

      mockActionsClient.execute.mockResolvedValue({
        status: 'ok',
        data: {
          tools: [{ name: 'search_documents', description: 'Search tool', inputSchema: {} }],
        },
      });

      await expect(
        validateConfig({
          actions: mockActions,
          request: mockRequest,
          config: {
            connector_id: 'test-connector-id',
            tool_name: 'search_documents',
          },
        })
      ).resolves.toBeUndefined();
    });

    it('should fail validation if connector is invalid', async () => {
      mockActionsClient.get.mockRejectedValue(new Error('Not found'));

      await expect(
        validateConfig({
          actions: mockActions,
          request: mockRequest,
          config: {
            connector_id: 'invalid-connector',
            tool_name: 'some_tool',
          },
        })
      ).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        `Connector 'invalid-connector' not found or not accessible`
      );
      // Tool validation should not be called if connector validation fails
      expect(mockActionsClient.execute).not.toHaveBeenCalled();
    });

    it('should fail validation if tool is not found', async () => {
      mockActionsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        actionTypeId: MCP_CONNECTOR_TYPE_ID,
        name: 'My MCP Connector',
      });

      mockActionsClient.execute.mockResolvedValue({
        status: 'ok',
        data: {
          tools: [{ name: 'other_tool', description: 'Other tool', inputSchema: {} }],
        },
      });

      await expect(
        validateConfig({
          actions: mockActions,
          request: mockRequest,
          config: {
            connector_id: 'test-connector-id',
            tool_name: 'missing_tool',
          },
        })
      ).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        `Tool 'missing_tool' not found on MCP connector 'test-connector-id'. Available tools: other_tool`
      );
    });

    it('should validate connector before tool', async () => {
      mockActionsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        actionTypeId: '.gen-ai', // Wrong type
        name: 'Not MCP Connector',
      });

      await expect(
        validateConfig({
          actions: mockActions,
          request: mockRequest,
          config: {
            connector_id: 'test-connector-id',
            tool_name: 'some_tool',
          },
        })
      ).rejects.toThrow();

      // Connector validation should fail first
      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        expect.stringContaining('is not an MCP connector')
      );
      // Tool validation should not be called
      expect(mockActionsClient.execute).not.toHaveBeenCalled();
    });
  });
});
