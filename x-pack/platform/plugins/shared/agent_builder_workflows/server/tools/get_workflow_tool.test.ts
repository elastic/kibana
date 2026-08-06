/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common';
import { registerGetWorkflowTool } from './get_workflow_tool';

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

describe('registerGetWorkflowTool', () => {
  let registeredTool: BuiltinToolDefinition;

  const mockApi = {
    getWorkflow: jest.fn(),
  } as any;

  const mockSecurity = {
    authz: {
      actions: {
        api: {
          get: jest.fn((action: string) => action),
        },
      },
      checkPrivilegesWithRequest: jest.fn(),
    },
  } as any;

  const getSecurity = () => mockSecurity;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSecurity.authz.checkPrivilegesWithRequest.mockReturnValue({
      atSpace: jest.fn().mockReturnValue({
        hasAllRequested: true,
      }),
    });

    mockApi.getWorkflow.mockResolvedValue({
      id: 'wf-support-cases',
      name: 'Support cases KI',
      description: 'Bottom-up KIs for support tickets',
      enabled: true,
      yaml: 'version: "1"\nname: Support cases KI\n',
    });

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;

    registerGetWorkflowTool(agentBuilder, mockApi, getSecurity);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.get_workflow');
  });

  it('returns metadata without yaml by default', async () => {
    const context = { spaceId: 'default', request: { headers: {} } } as any;

    const result = await invokeHandler(registeredTool, { workflowId: 'wf-support-cases' }, context);

    expect(mockApi.getWorkflow).toHaveBeenCalledWith('wf-support-cases', 'default');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual({
      type: ToolResultType.other,
      data: {
        id: 'wf-support-cases',
        name: 'Support cases KI',
        description: 'Bottom-up KIs for support tickets',
        enabled: true,
      },
    });
  });

  it('returns yaml when includeYaml is true', async () => {
    const context = { spaceId: 'default', request: { headers: {} } } as any;

    const result = await invokeHandler(
      registeredTool,
      { workflowId: 'wf-support-cases', includeYaml: true },
      context
    );

    expect(result.results[0]).toEqual({
      type: ToolResultType.other,
      data: {
        id: 'wf-support-cases',
        name: 'Support cases KI',
        description: 'Bottom-up KIs for support tickets',
        enabled: true,
        yaml: 'version: "1"\nname: Support cases KI\n',
      },
    });
  });

  it('returns an error when the workflow is not found', async () => {
    mockApi.getWorkflow.mockResolvedValue(null);
    const context = { spaceId: 'default', request: { headers: {} } } as any;

    const result = await invokeHandler(registeredTool, { workflowId: 'wf-missing' }, context);

    expect(result.results[0]?.type).toBe(ToolResultType.error);
  });

  it('returns an error when the caller lacks read privilege', async () => {
    mockSecurity.authz.checkPrivilegesWithRequest.mockReturnValue({
      atSpace: jest.fn().mockReturnValue({
        hasAllRequested: false,
      }),
    });

    const context = { spaceId: 'default', request: { headers: {} } } as any;

    const result = await invokeHandler(registeredTool, { workflowId: 'wf-support-cases' }, context);

    expect(mockApi.getWorkflow).not.toHaveBeenCalled();
    expect(result.results[0]?.type).toBe(ToolResultType.error);
  });
});
