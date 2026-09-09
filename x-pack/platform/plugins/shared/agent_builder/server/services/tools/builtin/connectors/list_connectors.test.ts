/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { OtherResult, ErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools/handler';
import { getConnectorSpec } from '@kbn/connector-specs';
import { createListConnectorsTool } from './list_connectors';
import type { ConnectorToolsOptions } from './types';

jest.mock('@kbn/connector-specs', () => ({
  ...jest.requireActual('@kbn/connector-specs'),
  getConnectorSpec: jest.fn(),
}));

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;

const mockGetAll = jest.fn();
const mockGetActionsClientWithRequest = jest.fn(() => Promise.resolve({ getAll: mockGetAll }));
const getActions: ConnectorToolsOptions['getActions'] = jest.fn(() =>
  Promise.resolve({
    getActionsClientWithRequest: mockGetActionsClientWithRequest,
  })
) as unknown as ConnectorToolsOptions['getActions'];

const getInference: ConnectorToolsOptions['getInference'] = jest.fn(() =>
  Promise.resolve({} as unknown as ReturnType<ConnectorToolsOptions['getInference']>)
);

const mockContext = {
  request: { id: 'test-request' },
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  uiSettings: { get: jest.fn().mockResolvedValue(true) },
} as unknown as ToolHandlerContext;

const slackSpec = {
  metadata: {
    id: '.slack2',
    displayName: 'Slack',
    description: 'Slack connector',
    minimumLicense: 'enterprise' as const,
    supportedFeatureIds: [],
  },
  actions: {
    searchMessages: {
      isTool: true,
      description: 'Search messages',
      input: z.object({ query: z.string() }),
      handler: jest.fn(),
    },
    sendMessage: {
      isTool: true,
      description: 'Send a message',
      scope: 'write' as const,
      input: z.object({ text: z.string() }),
      handler: jest.fn(),
    },
    deleteMessage: {
      isTool: true,
      description: 'Delete a message',
      scope: 'destroy' as const,
      handler: jest.fn(),
    },
    internalRefresh: {
      isTool: false,
      description: 'Not exposed to agents',
      handler: jest.fn(),
    },
  },
  test: { handler: jest.fn(), enabled: false },
};

describe('createListConnectorsTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getConnectorSpecMock.mockImplementation((typeId: string) =>
      typeId === '.slack2' ? (slackSpec as any) : undefined
    );
  });

  it('has correct id, type, and tags', () => {
    const tool = createListConnectorsTool({ getActions, getInference });
    expect(tool.id).toBe(platformCoreTools.listConnectors);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.tags).toEqual(['connector']);
  });

  it('calls getAll with includeSystemActions: false', async () => {
    mockGetAll.mockResolvedValue([]);
    const tool = createListConnectorsTool({ getActions, getInference });
    await tool.handler({}, mockContext);
    expect(mockGetAll).toHaveBeenCalledWith({ includeSystemActions: false });
  });

  it('returns an empty list when there are no connectors', async () => {
    mockGetAll.mockResolvedValue([]);
    const tool = createListConnectorsTool({ getActions, getInference });
    const result = await tool.handler({}, mockContext);

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    const data = ((result as ToolHandlerStandardReturn).results[0] as OtherResult).data as {
      total: number;
      connectors: unknown[];
    };
    expect(data).toEqual({ total: 0, connectors: [] });
  });

  it('filters out connectors with no registered connector spec (e.g. MCP)', async () => {
    mockGetAll.mockResolvedValue([
      { id: 'conn-mcp', name: 'My MCP', actionTypeId: '.mcp' },
      { id: 'conn-slack', name: 'My Slack', actionTypeId: '.slack2' },
    ]);

    const tool = createListConnectorsTool({ getActions, getInference });
    const result = await tool.handler({}, mockContext);

    const data = ((result as ToolHandlerStandardReturn).results[0] as OtherResult).data as {
      total: number;
      connectors: Array<{ connectorId: string }>;
    };
    expect(data.total).toBe(1);
    expect(data.connectors).toHaveLength(1);
    expect(data.connectors[0].connectorId).toBe('conn-slack');
  });

  it('only includes sub-actions marked isTool, with scope hints and parameter summaries', async () => {
    mockGetAll.mockResolvedValue([{ id: 'conn-slack', name: 'My Slack', actionTypeId: '.slack2' }]);

    const tool = createListConnectorsTool({ getActions, getInference });
    const result = await tool.handler({}, mockContext);

    const data = ((result as ToolHandlerStandardReturn).results[0] as OtherResult).data as {
      connectors: Array<{
        connectorId: string;
        name: string;
        connectorType: string;
        displayName: string;
        description: string;
        subActions: Array<{
          subAction: string;
          description: string;
          hint: string;
          parameters: string;
        }>;
      }>;
    };

    expect(data.connectors).toHaveLength(1);
    const connector = data.connectors[0];
    expect(connector).toMatchObject({
      connectorId: 'conn-slack',
      name: 'My Slack',
      connectorType: '.slack2',
      displayName: 'Slack',
      description: 'Slack connector',
    });

    const subActionNames = connector.subActions.map((a) => a.subAction);
    expect(subActionNames).toEqual(['searchMessages', 'sendMessage', 'deleteMessage']);
    expect(subActionNames).not.toContain('internalRefresh');

    const searchMessages = connector.subActions.find((a) => a.subAction === 'searchMessages')!;
    expect(searchMessages.hint).toBe('');
    expect(searchMessages.parameters).not.toBe('No parameters');

    const sendMessage = connector.subActions.find((a) => a.subAction === 'sendMessage')!;
    expect(sendMessage.hint).toBe('[WRITE]');

    const deleteMessage = connector.subActions.find((a) => a.subAction === 'deleteMessage')!;
    expect(deleteMessage.hint).toBe('[DESTROY]');
    expect(deleteMessage.parameters).toBe('No parameters');
  });

  it('returns an error result when the actions client rejects', async () => {
    mockGetAll.mockRejectedValue(new Error('boom'));
    const tool = createListConnectorsTool({ getActions, getInference });
    const result = await tool.handler({}, mockContext);

    expect((result as ToolHandlerStandardReturn).results).toHaveLength(1);
    const errorResult = (result as ToolHandlerStandardReturn).results[0] as ErrorResult;
    expect(errorResult.type).toBe(ToolResultType.error);
    expect(errorResult.data.message).toContain('boom');
  });

  describe('availability', () => {
    it('is unavailable when the experimental features flag is off', async () => {
      const tool = createListConnectorsTool({ getActions, getInference });
      const result = await tool.availability!.handler({
        uiSettings: { get: jest.fn().mockResolvedValue(false) },
      } as any);
      expect(result.status).toBe('unavailable');
    });

    it('is available when the experimental features flag is on', async () => {
      const tool = createListConnectorsTool({ getActions, getInference });
      const result = await tool.availability!.handler({
        uiSettings: { get: jest.fn().mockResolvedValue(true) },
      } as any);
      expect(result.status).toBe('available');
    });
  });
});
