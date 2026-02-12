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
} from '@kbn/agent-builder-server';
import type {
  CreateScopedRunnerDepsMock,
  MockedTool,
  MockedInternalAgent,
  AgentRegistryMock,
  ToolRegistryMock,
} from '../../test_utils';
import {
  createScopedRunnerDepsMock,
  createRunnerDepsMock,
  createMockedTool,
  createMockedInternalAgent,
  createMockedAgentRegistry,
  createToolRegistryMock,
} from '../../test_utils';
import { createScopedRunner, createRunner } from './runner';
import { createAgentHandler } from '../agents/modes/create_handler';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server/tools/utils';
import { HookLifecycle } from '@kbn/agent-builder-common';

jest.mock('../agents/modes/create_handler');
jest.mock('@kbn/agent-builder-server/tools/utils');

const getToolResultIdMock = getToolResultId as jest.MockedFn<typeof getToolResultId>;
const createAgentHandlerMock = createAgentHandler as jest.MockedFn<typeof createAgentHandler>;

describe('AgentBuilder runner', () => {
  let scopedRunnerDeps: CreateScopedRunnerDepsMock;
  let toolHandler: jest.MockedFunction<ToolHandlerFn>;

  beforeEach(() => {
    scopedRunnerDeps = createScopedRunnerDepsMock();
    getToolResultIdMock.mockReturnValue('some-result-id');
  });

  describe('runTool', () => {
    let tool: MockedTool;
    let registry: ToolRegistryMock;

    beforeEach(() => {
      registry = createToolRegistryMock();
      const {
        toolsService: { getRegistry },
      } = scopedRunnerDeps;
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

      const runner = createScopedRunner(scopedRunnerDeps);
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

      const runnerDeps = createRunnerDepsMock();
      runnerDeps.toolsService.getRegistry.mockResolvedValue(registry);

      const params: RunToolParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
        request: scopedRunnerDeps.request,
      };

      const runner = createRunner(runnerDeps);
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

    it('executes beforeToolCall hook and aborts when it throws', async () => {
      scopedRunnerDeps.hooks.run = jest.fn(async () => {
        throw new Error('blocked by beforeToolCall');
      });

      const params: ScopedRunnerRunToolsParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
      };

      const runner = createScopedRunner(scopedRunnerDeps);
      await expect(runner.runTool(params)).rejects.toMatchObject({
        message: 'blocked by beforeToolCall',
      });
      expect(scopedRunnerDeps.hooks.run).toHaveBeenCalledWith(
        HookLifecycle.beforeToolCall,
        expect.objectContaining({ toolId: 'test-tool' })
      );
    });
  });

  describe('runAgent', () => {
    let agent: MockedInternalAgent;
    let agentClient: AgentRegistryMock;
    let agentHandler: jest.MockedFn<any>;

    beforeEach(() => {
      agent = createMockedInternalAgent();

      agentClient = createMockedAgentRegistry();
      agentClient.get.mockResolvedValue(agent);

      const {
        agentsService: { getRegistry },
      } = scopedRunnerDeps;
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

      const runner = createScopedRunner(scopedRunnerDeps);
      const response = await runner.runAgent(params);

      expect(agentHandler).toHaveBeenCalledTimes(1);
      expect(agentHandler).toHaveBeenCalledWith(
        {
          runId: expect.any(String),
          agentParams: params.agentParams,
          abortSignal: undefined,
        },
        expect.any(Object)
      );

      expect(response).toEqual({
        result: 'someResult',
      });
    });

    it('can be invoked through a runner', async () => {
      agentHandler.mockResolvedValue({ result: 'someResult' as any });

      const runnerDeps = createRunnerDepsMock();
      runnerDeps.agentsService.getRegistry.mockResolvedValue(agentClient);

      const params: RunAgentParams = {
        agentId: 'test-tool',
        agentParams: { nextInput: { message: 'dolly' } },
        request: scopedRunnerDeps.request,
      };

      const runner = createRunner(runnerDeps);
      const response = await runner.runAgent(params);

      expect(agentHandler).toHaveBeenCalledTimes(1);
      expect(agentHandler).toHaveBeenCalledWith(
        {
          runId: expect.any(String),
          agentParams: params.agentParams,
          abortSignal: undefined,
        },
        expect.any(Object)
      );

      expect(response).toEqual({
        result: 'someResult',
      });
    });
  });
});
