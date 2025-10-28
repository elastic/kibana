/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type {
  ScopedRunnerRunToolsParams,
  ScopedRunnerRunAgentParams,
  RunToolParams,
  RunAgentParams,
  ToolHandlerFn,
} from '@kbn/onechat-server';
import type {
  CreateScopedRunnerDepsMock,
  MockedTool,
  MockedAgent,
  AgentRegistryMock,
  ToolRegistryMock,
} from '../../test_utils';
import {
  createScopedRunnerDepsMock,
  createMockedTool,
  createMockedAgent,
  createMockedAgentRegistry,
  createToolRegistryMock,
} from '../../test_utils';
import { createScopedRunner, createRunner } from './runner';
import { createAgentHandler } from '../agents/modes/create_handler';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { getToolResultId } from '@kbn/onechat-server/tools/utils';

jest.mock('../agents/modes/create_handler');
jest.mock('@kbn/onechat-server/tools/utils');

const getToolResultIdMock = getToolResultId as jest.MockedFn<typeof getToolResultId>;
const createAgentHandlerMock = createAgentHandler as jest.MockedFn<typeof createAgentHandler>;

describe('Onechat runner', () => {
  let runnerDeps: CreateScopedRunnerDepsMock;
  let toolHandler: jest.MockedFunction<ToolHandlerFn>;

  beforeEach(() => {
    runnerDeps = createScopedRunnerDepsMock();
    getToolResultIdMock.mockReturnValue('some-result-id');
  });

  describe('runTool', () => {
    let tool: MockedTool;
    let registry: ToolRegistryMock;

    beforeEach(() => {
      registry = createToolRegistryMock();
      const {
        toolsService: { getRegistry },
      } = runnerDeps;
      getRegistry.mockResolvedValue(registry);

      toolHandler = jest.fn().mockReturnValue({ results: [] });

      tool = createMockedTool({});
      tool.getSchema.mockReturnValue(
        z.object({
          foo: z.string(),
        })
      );
      tool.getHandler.mockReturnValue(toolHandler);
      registry.get.mockResolvedValue(tool);
    });

    it('can be invoked through a scoped runner', async () => {
      toolHandler.mockReturnValue({
        results: [{ type: ToolResultType.other, data: { someProp: 'someValue' } }],
      });

      const params: ScopedRunnerRunToolsParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
      };

      const runner = createScopedRunner(runnerDeps);
      const response = await runner.runTool(params);

      expect(toolHandler).toHaveBeenCalledTimes(1);
      expect(toolHandler).toHaveBeenCalledWith(params.toolParams, expect.any(Object));

      expect(response).toEqual({
        results: [
          {
            tool_result_id: 'some-result-id',
            type: ToolResultType.other,
            data: { someProp: 'someValue' },
          },
        ],
      });
    });

    it('can be invoked through a runner', async () => {
      toolHandler.mockReturnValue({
        results: [{ type: ToolResultType.other, data: { someProp: 'someValue' } }],
      });

      const { request, ...otherRunnerDeps } = runnerDeps;

      const params: RunToolParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
        request,
      };

      const runner = createRunner(otherRunnerDeps);
      const response = await runner.runTool(params);

      expect(toolHandler).toHaveBeenCalledTimes(1);
      expect(toolHandler).toHaveBeenCalledWith(params.toolParams, expect.any(Object));

      expect(response).toEqual({
        results: [
          {
            tool_result_id: 'some-result-id',
            type: ToolResultType.other,
            data: { someProp: 'someValue' },
          },
        ],
      });
    });
  });

  describe('runAgent', () => {
    let agent: MockedAgent;
    let agentClient: AgentRegistryMock;
    let agentHandler: jest.MockedFn<any>;

    beforeEach(() => {
      agent = createMockedAgent();

      agentClient = createMockedAgentRegistry();
      agentClient.get.mockResolvedValue(agent);

      const {
        agentsService: { getRegistry },
      } = runnerDeps;
      getRegistry.mockResolvedValue(agentClient);

      agentHandler = jest.fn();
      agentHandler.mockResolvedValue({
        result: { success: true },
      });
      createAgentHandlerMock.mockReturnValue(agentHandler);
    });

    afterEach(() => {
      createAgentHandlerMock.mockReset();
    });

    it('can be invoked through a scoped runner', async () => {
      agentHandler.mockResolvedValue({ result: 'someResult' as any });

      const params: ScopedRunnerRunAgentParams = {
        agentId: 'test-tool',
        agentParams: { nextInput: { message: 'dolly' } },
      };

      const runner = createScopedRunner(runnerDeps);
      const response = await runner.runAgent(params);

      expect(agentHandler).toHaveBeenCalledTimes(1);
      expect(agentHandler).toHaveBeenCalledWith(
        {
          runId: expect.any(String),
          agentParams: params.agentParams,
        },
        expect.any(Object)
      );

      expect(response).toEqual({
        result: 'someResult',
      });
    });

    it('can be invoked through a runner', async () => {
      agentHandler.mockResolvedValue({ result: 'someResult' as any });

      const { request, ...otherRunnerDeps } = runnerDeps;

      const params: RunAgentParams = {
        agentId: 'test-tool',
        agentParams: { nextInput: { message: 'dolly' } },
        request,
      };

      const runner = createRunner(otherRunnerDeps);
      const response = await runner.runAgent(params);

      expect(agentHandler).toHaveBeenCalledTimes(1);
      expect(agentHandler).toHaveBeenCalledWith(
        {
          runId: expect.any(String),
          agentParams: params.agentParams,
        },
        expect.any(Object)
      );

      expect(response).toEqual({
        result: 'someResult',
      });
    });
  });
});
