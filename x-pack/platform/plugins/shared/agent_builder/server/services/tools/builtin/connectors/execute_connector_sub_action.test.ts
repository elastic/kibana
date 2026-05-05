/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ErrorResult, OtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools/handler';
import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';
import { createExecuteConnectorSubActionTool } from './execute_connector_sub_action';
import type { ConnectorToolsOptions } from './types';

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
  isToolAction: jest.fn(),
}));

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;
const isToolActionMock = isToolAction as jest.MockedFunction<typeof isToolAction>;

const mockExecute = jest.fn();
const mockGet = jest.fn();
const mockGetActionsClientWithRequest = jest.fn(() =>
  Promise.resolve({ execute: mockExecute, get: mockGet })
);
const getActions: ConnectorToolsOptions['getActions'] = jest.fn(() =>
  Promise.resolve({
    getActionsClientWithRequest: mockGetActionsClientWithRequest,
  })
) as unknown as ConnectorToolsOptions['getActions'];

const mockContext = {
  spaceId: 'default',
  esClient: { asCurrentUser: {} },
  request: { id: 'test-request' },
  savedObjectsClient: {},
  attachments: {},
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
} as unknown as ToolHandlerContext;

describe('createExecuteConnectorSubActionTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: connector resolves to .slack2, spec found, action is a tool
    mockGet.mockResolvedValue({ id: 'conn-123', actionTypeId: '.slack2' });
    getConnectorSpecMock.mockReturnValue({
      metadata: {
        id: '.slack2',
        displayName: 'Slack',
        description: 'Slack connector',
        minimumLicense: 'enterprise' as const,
        supportedFeatureIds: [],
      },
      actions: {
        searchMessages: { isTool: true, input: {} as any, handler: jest.fn() },
        listChannels: { isTool: true, input: {} as any, handler: jest.fn() },
        sendMessage: { isTool: true, input: {} as any, handler: jest.fn() },
      },
    });
    isToolActionMock.mockReturnValue(true);
  });

  it('has correct id, type, and tags', () => {
    const tool = createExecuteConnectorSubActionTool({ getActions });
    expect(tool.id).toBe(platformCoreTools.executeConnectorSubAction);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.tags).toEqual(['connector', 'sub-action']);
  });

  it('executes a sub-action successfully', async () => {
    mockExecute.mockResolvedValue({
      status: 'ok',
      data: { messages: [{ text: 'hello' }] },
    });

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'searchMessages',
        params: { query: 'hello' },
      },
      mockContext
    );

    expect(getActions).toHaveBeenCalled();
    expect(mockGetActionsClientWithRequest).toHaveBeenCalledWith(mockContext.request);
    expect(mockGet).toHaveBeenCalledWith({ id: 'conn-123' });
    expect(mockExecute).toHaveBeenCalledWith({
      actionId: 'conn-123',
      params: {
        subAction: 'searchMessages',
        subActionParams: { query: 'hello' },
      },
    });
    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect((result as ToolHandlerStandardReturn).results[0].type).toBe(ToolResultType.other);
    expect(((result as ToolHandlerStandardReturn).results[0] as OtherResult).data).toEqual({
      messages: [{ text: 'hello' }],
    });
  });

  it('defaults params to empty object', async () => {
    mockExecute.mockResolvedValue({ status: 'ok', data: { ok: true } });

    const tool = createExecuteConnectorSubActionTool({ getActions });
    await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'listChannels',
        params: {},
      },
      mockContext
    );

    expect(mockExecute).toHaveBeenCalledWith({
      actionId: 'conn-123',
      params: {
        subAction: 'listChannels',
        subActionParams: {},
      },
    });
  });

  it('rejects sub-actions not marked as isTool', async () => {
    getConnectorSpecMock.mockReturnValue({
      metadata: {
        id: '.slack2',
        displayName: 'Slack',
        description: 'Slack connector',
        minimumLicense: 'enterprise' as const,
        supportedFeatureIds: [],
      },
      actions: { internalAction: { isTool: false, input: {} as any, handler: jest.fn() } },
    });
    isToolActionMock.mockReturnValue(false);

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'internalAction',
        params: {},
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect((result as ToolHandlerStandardReturn).results[0].type).toBe(ToolResultType.error);
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain("Sub-action 'internalAction' is not available as a tool");
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when no connector spec is found for the type', async () => {
    mockGet.mockResolvedValue({ id: 'conn-123', actionTypeId: '.unknown' });
    getConnectorSpecMock.mockReturnValue(undefined);

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'doSomething',
        params: {},
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect((result as ToolHandlerStandardReturn).results[0].type).toBe(ToolResultType.error);
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain("No connector spec found for type '.unknown'");
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when connector resolution fails', async () => {
    mockGet.mockRejectedValue(new Error('Saved object not found'));

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'bad-id',
        subAction: 'search',
        params: {},
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect((result as ToolHandlerStandardReturn).results[0].type).toBe(ToolResultType.error);
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain("Failed to resolve connector 'bad-id'");
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error result when execute throws', async () => {
    mockExecute.mockRejectedValue(new Error('Connector execution failed'));

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'search',
        params: {},
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain('Connector execution failed');
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain("sub-action 'search'");
  });

  it('returns error result when connector returns error status', async () => {
    mockExecute.mockResolvedValue({
      status: 'error',
      message: 'Rate limited',
      serviceMessage: 'Too many requests',
    });

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'sendMessage',
        params: { text: 'hi' },
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect(
      ((result as ToolHandlerStandardReturn).results[0] as ErrorResult).data.message
    ).toContain('Rate limited');
  });

  it('returns success message when data is null', async () => {
    mockExecute.mockResolvedValue({ status: 'ok', data: null });

    const tool = createExecuteConnectorSubActionTool({ getActions });
    const result = await tool.handler(
      {
        connectorId: 'conn-123',
        subAction: 'sendMessage',
        params: { text: 'hi' },
      },
      mockContext
    );

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    expect(((result as ToolHandlerStandardReturn).results[0] as OtherResult).data).toEqual({
      message: 'Sub-action executed successfully',
    });
  });
});
