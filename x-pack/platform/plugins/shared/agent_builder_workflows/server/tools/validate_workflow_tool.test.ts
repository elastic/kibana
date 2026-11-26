/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { z } from '@kbn/zod/v4';
import { registerValidateWorkflowTool } from './validate_workflow_tool';

const mockConnectors = [
  {
    type: 'custom.openStep',
    summary: 'Open step',
    paramsSchema: z.object({ message: z.string() }),
  },
  {
    type: 'custom.managedOnlyStep',
    summary: 'Managed-only step',
    paramsSchema: z.object({ message: z.string() }),
  },
];
const mockGetStepExposure = jest.fn();
jest.mock('@kbn/workflows-management-plugin/common/schema', () => ({
  addDynamicConnectorsToCache: jest.fn(),
  getAllConnectors: () => mockConnectors,
  getCachedAllConnectorsMap: () =>
    new Map(mockConnectors.map((connector) => [connector.type, connector])),
  getDeprecatedStepMetadata: () => undefined,
  getStepExposure: (...args: unknown[]) => mockGetStepExposure(...args),
}));

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerValidateWorkflowTool', () => {
  let registeredTool: BuiltinToolDefinition;

  const mockApi = {
    validateWorkflow: jest.fn(),
    getAvailableConnectors: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStepExposure.mockReturnValue('open');
    mockApi.getAvailableConnectors.mockResolvedValue({ connectorTypes: {}, totalConnectors: 0 });
    mockApi.validateWorkflow.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    });

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    registerValidateWorkflowTool(agentBuilder, mockApi);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.validate_workflow');
  });

  it('calls api.validateWorkflow with yaml, spaceId, request', async () => {
    const yaml = `version: '1'\nname: test\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n  - name: log\n    type: console\n    with:\n      message: test\n`;
    const context = { spaceId: 'default', request: { headers: { foo: 'bar' } } } as any;

    await invokeHandler(registeredTool, { yaml }, context);

    expect(mockApi.validateWorkflow).toHaveBeenCalledTimes(1);
    expect(mockApi.validateWorkflow).toHaveBeenCalledWith(yaml, 'default', context.request);
  });

  it('returns results in expected shape', async () => {
    const yaml = `version: '1'\nname: test\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n  - name: log\n    type: console\n    with:\n      message: test\n`;
    const context = { spaceId: 'default', request: {} } as any;

    const result = await invokeHandler(registeredTool, { yaml }, context);

    expect(result).toHaveProperty('results');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    expect(result.results[0]).toHaveProperty('data');
    expect((result.results[0].data as any).result).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
  });

  it('leaves managed-only steps out of the step definitions it adds when validation fails', async () => {
    mockApi.validateWorkflow.mockResolvedValue({ valid: false, errors: ['invalid'], warnings: [] });
    mockGetStepExposure.mockImplementation((stepType: string) =>
      stepType === 'custom.managedOnlyStep' ? 'managed_only' : 'open'
    );
    const yaml = `version: '1'\nname: test\ntriggers:\n  - type: manual\nsteps:\n  - name: open\n    type: custom.openStep\n  - name: managed\n    type: custom.managedOnlyStep\n`;

    const result = await invokeHandler(
      registeredTool,
      { yaml },
      { spaceId: 'default', request: {} }
    );

    const { stepDefinitions } = result.results[0].data as {
      stepDefinitions: Array<{ id: string }>;
    };
    expect(stepDefinitions.map(({ id }) => id)).toEqual(['custom.openStep']);
  });
});
