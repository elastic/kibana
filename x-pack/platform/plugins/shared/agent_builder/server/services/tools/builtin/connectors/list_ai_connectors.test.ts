/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools/handler';
import { createListAiConnectorsTool } from './list_ai_connectors';
import type { ConnectorToolsOptions } from './types';

const mockGetConnectorList = jest.fn();

const getInference: ConnectorToolsOptions['getInference'] = jest.fn(() =>
  Promise.resolve({
    getConnectorList: mockGetConnectorList,
  } as unknown as ReturnType<ConnectorToolsOptions['getInference']>)
);

// execute_connector_sub_action requires getActions; list_ai_connectors only uses getInference,
// but ConnectorToolsOptions requires both, so provide a minimal stub.
const getActions: ConnectorToolsOptions['getActions'] = jest.fn(() =>
  Promise.resolve({} as unknown as ReturnType<ConnectorToolsOptions['getActions']>)
);

const mockContext = {
  spaceId: 'default',
  request: { id: 'test-request' },
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  callContext: {
    toolId: platformCoreTools.listAiConnectors,
    toolCallId: 'call-1',
    callSource: 'agent',
  },
} as unknown as ToolHandlerContext;

describe('createListAiConnectorsTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct id, type, and tags', () => {
    const tool = createListAiConnectorsTool({ getActions, getInference });
    expect(tool.id).toBe(platformCoreTools.listAiConnectors);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.tags).toEqual(['connector', 'ai']);
  });

  it('uses space-cached availability', () => {
    const tool = createListAiConnectorsTool({ getActions, getInference });
    expect(tool.availability?.cacheMode).toBe('space');
  });

  it('delegates to inference.getConnectorList and returns the connectors', async () => {
    const connectors = [
      { connectorId: 'c1', name: 'GPT-4', type: '.gen-ai' },
      { connectorId: 'c2', name: 'Claude', type: '.inference' },
    ];
    mockGetConnectorList.mockResolvedValueOnce(connectors);

    const tool = createListAiConnectorsTool({ getActions, getInference });
    const result = (await tool.handler({}, mockContext)) as ToolHandlerStandardReturn;

    expect(getInference).toHaveBeenCalled();
    expect(mockGetConnectorList).toHaveBeenCalledWith(mockContext.request);
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({ total: 2, connectors });
  });

  it('returns an empty list when inference resolves no connectors', async () => {
    mockGetConnectorList.mockResolvedValueOnce([]);

    const tool = createListAiConnectorsTool({ getActions, getInference });
    const result = (await tool.handler({}, mockContext)) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({ total: 0, connectors: [] });
  });

  it('returns an error result when getConnectorList throws', async () => {
    mockGetConnectorList.mockRejectedValueOnce(new Error('inference down'));

    const tool = createListAiConnectorsTool({ getActions, getInference });
    const result = (await tool.handler({}, mockContext)) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain('inference down');
  });
});
