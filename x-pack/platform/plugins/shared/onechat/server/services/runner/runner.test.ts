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
} from '@kbn/onechat-server';
import {
  createScopedRunnerDepsMock,
  createMockedTool,
  createMockedAgent,
  CreateScopedRunnerDepsMock,
  MockedTool,
  MockedAgent,
} from '../../test_utils';
import { createScopedRunner, createRunner } from './runner';

describe('Onechat runner', () => {
  let runnerDeps: CreateScopedRunnerDepsMock;

  beforeEach(() => {
    runnerDeps = createScopedRunnerDepsMock();
  });

  describe('runTool', () => {
    let tool: MockedTool;

    beforeEach(() => {
      const {
        toolsService: { registry },
      } = runnerDeps;

      tool = createMockedTool({
        schema: z.object({
          foo: z.string(),
        }),
      });
      registry.get.mockResolvedValue(tool);
    });

    it('can be invoked through a scoped runner', async () => {
      tool.handler.mockReturnValue({ result: { someProp: 'someValue' } });

      const params: ScopedRunnerRunToolsParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
      };

      const runner = createScopedRunner(runnerDeps);
      const response = await runner.runTool(params);

      expect(tool.handler).toHaveBeenCalledTimes(1);
      expect(tool.handler).toHaveBeenCalledWith(params.toolParams, expect.any(Object));

      expect(response).toEqual({
        runId: expect.any(String),
        result: { someProp: 'someValue' },
      });
    });

    it('can be invoked through a runner', async () => {
      tool.handler.mockReturnValue({ result: { someProp: 'someValue' } });

      const { request, ...otherRunnerDeps } = runnerDeps;

      const params: RunToolParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
        request,
      };

      const runner = createRunner(otherRunnerDeps);
      const response = await runner.runTool(params);

      expect(tool.handler).toHaveBeenCalledTimes(1);
      expect(tool.handler).toHaveBeenCalledWith(params.toolParams, expect.any(Object));

      expect(response).toEqual({
        runId: expect.any(String),
        result: { someProp: 'someValue' },
      });
    });
  });

  describe('runAgent', () => {
    let agent: MockedAgent;

    beforeEach(() => {
      const {
        agentsService: { registry },
      } = runnerDeps;

      agent = createMockedAgent();
      registry.get.mockResolvedValue(agent);
    });

    it('can be invoked through a scoped runner', async () => {
      agent.handler.mockResolvedValue({ result: 'someResult' as any });

      const params: ScopedRunnerRunAgentParams = {
        agentId: 'test-tool',
        agentParams: { foo: 'bar' },
      };

      const runner = createScopedRunner(runnerDeps);
      const response = await runner.runAgent(params);

      expect(agent.handler).toHaveBeenCalledTimes(1);
      expect(agent.handler).toHaveBeenCalledWith(
        {
          runId: expect.any(String),
          agentParams: params.agentParams,
        },
        expect.any(Object)
      );

      expect(response).toEqual({
        runId: expect.any(String),
        result: 'someResult',
      });
    });

    it('can be invoked through a runner', async () => {
      agent.handler.mockResolvedValue({ result: 'someResult' as any });

      const { request, ...otherRunnerDeps } = runnerDeps;

      const params: RunAgentParams = {
        agentId: 'test-tool',
        agentParams: { foo: 'bar' },
        request,
      };

      const runner = createRunner(otherRunnerDeps);
      const response = await runner.runAgent(params);

      expect(agent.handler).toHaveBeenCalledTimes(1);
      expect(agent.handler).toHaveBeenCalledWith(
        {
          runId: expect.any(String),
          agentParams: params.agentParams,
        },
        expect.any(Object)
      );

      expect(response).toEqual({
        runId: expect.any(String),
        result: 'someResult',
      });
    });
  });
});
