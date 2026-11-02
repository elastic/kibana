/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { z } from '@kbn/zod/v4';
import { registerGetTriggerDefinitionsTool } from './get_trigger_definitions_tool';

type GetRegisteredTriggersApi = Pick<
  WorkflowsServerPluginSetup['management'],
  'getRegisteredTriggers'
>;

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

const mockCasesTrigger = {
  id: 'cases.caseUpdated',
  eventSchema: z.object({
    caseId: z.string(),
    owner: z.string(),
  }),
};

describe('registerGetTriggerDefinitionsTool', () => {
  let registeredTool: BuiltinToolDefinition;
  let mockApi: jest.Mocked<GetRegisteredTriggersApi>;

  beforeEach(() => {
    mockApi = {
      getRegisteredTriggers: jest.fn().mockResolvedValue([mockCasesTrigger]),
    };

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;
    registerGetTriggerDefinitionsTool(agentBuilder, mockApi);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.get_trigger_definitions');
  });

  it('wraps lookup result in agent builder tool response shape', async () => {
    const result = await invokeHandler(registeredTool, { triggerType: 'manual' }, {});

    expect(mockApi.getRegisteredTriggers).toHaveBeenCalled();
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    expect(result.results[0].data).toEqual({
      count: 1,
      triggerTypes: [expect.objectContaining({ id: 'manual' })],
    });
  });
});
