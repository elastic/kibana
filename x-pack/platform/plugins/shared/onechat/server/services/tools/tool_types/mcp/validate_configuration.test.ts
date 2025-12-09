/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { createBadRequestError } from '@kbn/onechat-common';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE_ID } from '@kbn/connector-schemas/mcp/constants';
import { MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE } from '@kbn/stack-connectors-plugin/server/saved_objects';
import { validateConnector, validateToolName, validateConfig } from './validate_configuration';

jest.mock('@kbn/onechat-common', () => ({
  createBadRequestError: jest.fn(),
}));

const mockCreateBadRequestError = createBadRequestError as jest.MockedFunction<
  typeof createBadRequestError
>;

describe('MCP validate_configuration', () => {
  let mockActions: jest.Mocked<ActionsPluginStart>;
  let mockActionsClient: {
    get: jest.Mock;
  };
  let mockRequest: KibanaRequest;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockActionsClient = {
      get: jest.fn(),
    };

    mockActions = {
      getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient),
    } as unknown as jest.Mocked<ActionsPluginStart>;

    mockRequest = {} as KibanaRequest;

    mockSavedObjectsClient = {
      get: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsClientContract>;

    mockCreateBadRequestError.mockImplementation((message: string) => {
      const error = new Error(message) as Error & { isBoom: boolean };
      error.name = 'OnechatBadRequestError';
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
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        type: MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        attributes: {
          connectorId: 'test-connector-id',
          tools: [
            { name: 'tool_one', description: 'First tool', inputSchema: {} },
            { name: 'tool_two', description: 'Second tool', inputSchema: {} },
          ],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        references: [],
      });

      await expect(
        validateToolName({
          savedObjectsClient: mockSavedObjectsClient,
          connectorId: 'test-connector-id',
          toolName: 'tool_one',
        })
      ).resolves.toBeUndefined();

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        'test-connector-id'
      );
    });

    it('should throw error when tool is not found on connector', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        type: MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        attributes: {
          connectorId: 'test-connector-id',
          tools: [
            { name: 'tool_one', description: 'First tool', inputSchema: {} },
            { name: 'tool_two', description: 'Second tool', inputSchema: {} },
          ],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        references: [],
      });

      await expect(
        validateToolName({
          savedObjectsClient: mockSavedObjectsClient,
          connectorId: 'test-connector-id',
          toolName: 'non_existent_tool',
        })
      ).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        `Tool 'non_existent_tool' not found on MCP connector 'test-connector-id'. Available tools: tool_one, tool_two`
      );
    });

    it('should show "none" when no tools are available', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        type: MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        attributes: {
          connectorId: 'test-connector-id',
          tools: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        references: [],
      });

      await expect(
        validateToolName({
          savedObjectsClient: mockSavedObjectsClient,
          connectorId: 'test-connector-id',
          toolName: 'some_tool',
        })
      ).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        `Tool 'some_tool' not found on MCP connector 'test-connector-id'. Available tools: none`
      );
    });

    it('should throw error when tools saved object does not exist', async () => {
      mockSavedObjectsClient.get.mockRejectedValue(new Error('Saved object not found'));

      await expect(
        validateToolName({
          savedObjectsClient: mockSavedObjectsClient,
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
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        type: MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        attributes: {
          connectorId: 'test-connector-id',
          tools: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        references: [],
      });

      const thrownError = await validateToolName({
        savedObjectsClient: mockSavedObjectsClient,
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

      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        type: MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        attributes: {
          connectorId: 'test-connector-id',
          tools: [{ name: 'search_documents', description: 'Search tool', inputSchema: {} }],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        references: [],
      });

      await expect(
        validateConfig({
          actions: mockActions,
          request: mockRequest,
          savedObjectsClient: mockSavedObjectsClient,
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
          savedObjectsClient: mockSavedObjectsClient,
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
      expect(mockSavedObjectsClient.get).not.toHaveBeenCalled();
    });

    it('should fail validation if tool is not found', async () => {
      mockActionsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        actionTypeId: MCP_CONNECTOR_TYPE_ID,
        name: 'My MCP Connector',
      });

      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'test-connector-id',
        type: MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
        attributes: {
          connectorId: 'test-connector-id',
          tools: [{ name: 'other_tool', description: 'Other tool', inputSchema: {} }],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        references: [],
      });

      await expect(
        validateConfig({
          actions: mockActions,
          request: mockRequest,
          savedObjectsClient: mockSavedObjectsClient,
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
          savedObjectsClient: mockSavedObjectsClient,
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
      expect(mockSavedObjectsClient.get).not.toHaveBeenCalled();
    });
  });
});
