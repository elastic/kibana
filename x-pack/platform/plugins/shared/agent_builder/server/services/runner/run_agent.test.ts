/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedRunnerRunAgentParams } from '@kbn/agent-builder-server';

import { RunnerManager } from './runner';
import { runAgent } from './run_agent';
import type {
  CreateScopedRunnerDepsMock,
  MockedInternalAgent,
  AgentRegistryMock,
} from '../../test_utils';
import {
  createScopedRunnerDepsMock,
  createMockedInternalAgent,
  createMockedAgentRegistry,
} from '../../test_utils';
import { createAgentHandler } from '../agents/modes/create_handler';

jest.mock('../agents/modes/create_handler');

const createAgentHandlerMock = createAgentHandler as jest.MockedFn<typeof createAgentHandler>;

describe('runAgent', () => {
  let runnerDeps: CreateScopedRunnerDepsMock;
  let runnerManager: RunnerManager;
  let agent: MockedInternalAgent;
  let agentClient: AgentRegistryMock;
  let agentHandler: jest.MockedFn<any>;

  beforeEach(() => {
    runnerDeps = createScopedRunnerDepsMock();
    runnerManager = new RunnerManager(runnerDeps);
    agent = createMockedInternalAgent();

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

  it('calls the client registry with the expected parameters', async () => {
    const params: ScopedRunnerRunAgentParams = {
      agentId: 'test-agent',
      agentParams: { nextInput: { message: 'bar' } },
    };

    await runAgent({
      agentExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(agentClient.get).toHaveBeenCalledTimes(1);
    expect(agentClient.get).toHaveBeenCalledWith(params.agentId);
  });

  it('calls the agent handler with the expected parameters', async () => {
    const abortSignal = new AbortController().signal;
    const managerWithAbortSignal = new RunnerManager({ ...runnerDeps, abortSignal });
    const params: ScopedRunnerRunAgentParams = {
      agentId: 'test-agent',
      agentParams: { nextInput: { message: 'dolly' } },
    };

    await runAgent({
      agentExecutionParams: params,
      parentManager: managerWithAbortSignal,
    });

    expect(agentHandler).toHaveBeenCalledTimes(1);
    expect(agentHandler).toHaveBeenCalledWith(
      {
        runId: managerWithAbortSignal.context.runId,
        agentParams: params.agentParams,
        abortSignal: expect.any(AbortSignal),
      },
      expect.any(Object)
    );
  });

  it('propagates the abort signal when provided', async () => {
    const abortCtrl = new AbortController();
    const managerWithAbortSignal = new RunnerManager({
      ...runnerDeps,
      abortSignal: abortCtrl.signal,
    });
    const params: ScopedRunnerRunAgentParams = {
      agentId: 'test-agent',
      agentParams: { nextInput: { message: 'dolly' } },
    };

    await runAgent({
      agentExecutionParams: params,
      parentManager: managerWithAbortSignal,
    });

    expect(agentHandler).toHaveBeenCalledTimes(1);
    expect(agentHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        abortSignal: abortCtrl.signal,
      }),
      expect.any(Object)
    );
  });

  it('returns the expected value', async () => {
    const params: ScopedRunnerRunAgentParams = {
      agentId: 'test-agent',
      agentParams: { nextInput: { message: 'dolly' } },
    };

    agentHandler.mockResolvedValue({
      result: { success: true, data: { foo: 'bar' } } as any,
    });

    const { result } = await runAgent({
      agentExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(result).toEqual({ success: true, data: { foo: 'bar' } });
  });
});
