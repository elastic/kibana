/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools/handler';
import { createListInferenceEndpointsTool } from './list_inference_endpoints';
import type { ConnectorToolsOptions } from './types';

const mockGetConnectorList = jest.fn();

const getInference: ConnectorToolsOptions['getInference'] = jest.fn(() =>
  Promise.resolve({
    getConnectorList: mockGetConnectorList,
  } as unknown as ReturnType<ConnectorToolsOptions['getInference']>)
);

// execute_connector_sub_action requires getActions; list_inference_endpoints only uses getInference,
// but ConnectorToolsOptions requires both, so provide a minimal stub.
const getActions: ConnectorToolsOptions['getActions'] = jest.fn(() =>
  Promise.resolve({} as unknown as ReturnType<ConnectorToolsOptions['getActions']>)
);

const mockContext = {
  spaceId: 'default',
  request: { id: 'test-request' },
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  callContext: {
    toolId: platformCoreTools.listInferenceEndpoints,
    toolCallId: 'call-1',
    callSource: 'agent',
  },
} as unknown as ToolHandlerContext;

describe('createListInferenceEndpointsTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return only identifiers, names, and types for all inference-compatible entries', async () => {
    mockGetConnectorList.mockResolvedValueOnce([
      {
        connectorId: 'endpoint-1',
        name: 'Claude',
        type: '.inference',
        config: {
          inferenceId: 'endpoint-1',
          service: 'elastic',
          serviceSettings: { model_id: 'claude' },
        },
        capabilities: {},
        isInferenceEndpoint: true,
        isPreconfigured: true,
        isEis: true,
        metadata: { display: { name: 'Claude', model_creator: 'Anthropic' } },
      },
      {
        connectorId: 'connector-1',
        name: 'GPT-4',
        type: '.gen-ai',
        config: { apiProvider: 'OpenAI' },
        capabilities: { contextWindowSize: 128000 },
        isInferenceEndpoint: false,
        isPreconfigured: false,
        isDeprecated: true,
        isMissingSecrets: false,
      },
    ]);

    const tool = createListInferenceEndpointsTool({ getActions, getInference });
    const result = (await tool.handler({}, mockContext)) as ToolHandlerStandardReturn;

    expect(getInference).toHaveBeenCalled();
    expect(mockGetConnectorList).toHaveBeenCalledWith(mockContext.request);
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({
      total: 2,
      endpoints: [
        { connectorId: 'endpoint-1', name: 'Claude', type: '.inference' },
        { connectorId: 'connector-1', name: 'GPT-4', type: '.gen-ai' },
      ],
    });
  });

  it('should return an empty list when inference resolves no endpoints', async () => {
    mockGetConnectorList.mockResolvedValueOnce([]);

    const tool = createListInferenceEndpointsTool({ getActions, getInference });
    const result = (await tool.handler({}, mockContext)) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({ total: 0, endpoints: [] });
  });

  it('should return an error result when getConnectorList throws', async () => {
    mockGetConnectorList.mockRejectedValueOnce(new Error('inference down'));

    const tool = createListInferenceEndpointsTool({ getActions, getInference });
    const result = (await tool.handler({}, mockContext)) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toContain('inference down');
  });
});
