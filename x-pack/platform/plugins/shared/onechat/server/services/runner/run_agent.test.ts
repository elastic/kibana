/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedRunnerRunAgentParams } from '@kbn/onechat-server';

import { RunnerManager } from './runner';
import { runAgent } from './run_agent';
import {
  createScopedRunnerDepsMock,
  createMockedAgent,
  CreateScopedRunnerDepsMock,
  MockedAgent,
} from '../../test_utils';

describe('runAgent', () => {
  let runnerDeps: CreateScopedRunnerDepsMock;
  let runnerManager: RunnerManager;
  let agent: MockedAgent;

  beforeEach(() => {
    runnerDeps = createScopedRunnerDepsMock();
    runnerManager = new RunnerManager(runnerDeps);
    agent = createMockedAgent();

    const {
      agentsService: { registry },
    } = runnerDeps;
    registry.get.mockResolvedValue(agent);
  });

  it('calls the agent registry with the expected parameters', async () => {
    const {
      agentsService: { registry },
    } = runnerDeps;

    const params: ScopedRunnerRunAgentParams = {
      agentId: 'test-agent',
      agentParams: { foo: 'bar' },
    };

    await runAgent({
      agentExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(registry.get).toHaveBeenCalledTimes(1);
    expect(registry.get).toHaveBeenCalledWith({
      agentId: params.agentId,
      request: runnerDeps.request,
    });
  });

  it('calls the agent handler with the expected parameters', async () => {
    const params: ScopedRunnerRunAgentParams = {
      agentId: 'test-agent',
      agentParams: { hello: 'dolly' },
    };

    await runAgent({
      agentExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(agent.handler).toHaveBeenCalledTimes(1);
    expect(agent.handler).toHaveBeenCalledWith(
      {
        runId: runnerManager.context.runId,
        agentParams: params.agentParams,
      },
      expect.any(Object)
    );
  });

  it('returns the expected value', async () => {
    const params: ScopedRunnerRunAgentParams = {
      agentId: 'test-agent',
      agentParams: { over: '9000' },
    };

    agent.handler.mockResolvedValue({
      result: { success: true, data: { foo: 'bar' } } as any,
    });

    const { result } = await runAgent({
      agentExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(result).toEqual({ success: true, data: { foo: 'bar' } });
  });
});
