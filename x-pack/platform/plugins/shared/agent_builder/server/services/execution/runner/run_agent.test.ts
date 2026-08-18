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
} from '../../../test_utils';
import {
  createScopedRunnerDepsMock,
  createMockedInternalAgent,
  createMockedAgentRegistry,
} from '../../../test_utils';
import { createAgentHandler } from '../run_agent/create_handler';

jest.mock('../run_agent/create_handler');

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

    const { agentsService } = runnerDeps;
    agentsService.getRegistry.mockResolvedValue(agentClient);
    // by default the resolver returns the agent's own config (empty chat base = no-op merge)
    agentsService.resolveAgentConfiguration.mockImplementation(
      async ({ agent: a }) => a.configuration
    );

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
    expect(agentClient.get).toHaveBeenCalledWith(params.agentId, { access: 'use' });
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

  it('layers runtime overrides onto the agent config before resolving, so the type base survives', async () => {
    agent = createMockedInternalAgent({
      configuration: { tools: [], instructions: 'agent instructions', skill_ids: ['my-skill'] },
    });
    agentClient.get.mockResolvedValue(agent);
    const resolvedConfiguration = {
      tools: [],
      instructions: 'resolved',
      skill_ids: ['base-skill', 'my-skill'],
    };
    runnerDeps.agentsService.resolveAgentConfiguration.mockResolvedValue(resolvedConfiguration);

    const params: ScopedRunnerRunAgentParams = {
      agentId: 'test-agent',
      agentParams: {
        nextInput: { message: 'dolly' },
        configurationOverrides: { instructions: 'override instructions' },
      },
    };

    await runAgent({
      agentExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(runnerDeps.agentsService.resolveAgentConfiguration).toHaveBeenCalledWith({
      agent: {
        ...agent,
        configuration: {
          ...agent.configuration,
          instructions: 'override instructions',
        },
      },
      request: runnerDeps.request,
    });
    expect(createAgentHandlerMock).toHaveBeenCalledWith({
      agent,
      effectiveConfiguration: resolvedConfiguration,
    });
  });

  describe('agentWithOverrides configuration merging', () => {
    const runWithOverrides = (
      agentConfig: Record<string, any>,
      configurationOverrides?: Record<string, any>
    ) => {
      agent = createMockedInternalAgent({ configuration: { tools: [], ...agentConfig } });
      agentClient.get.mockResolvedValue(agent);
      return runAgent({
        agentExecutionParams: {
          agentId: 'test-agent',
          agentParams: { nextInput: { message: 'hi' }, configurationOverrides } as any,
        },
        parentManager: runnerManager,
      });
    };

    const resolveArg = () =>
      runnerDeps.agentsService.resolveAgentConfiguration.mock.calls[0][0].agent.configuration;

    it('passes the agent config unchanged when no overrides are provided', async () => {
      await runWithOverrides({ instructions: 'original', skill_ids: ['s1'] });
      expect(resolveArg()).toEqual({ tools: [], instructions: 'original', skill_ids: ['s1'] });
    });

    it('replaces instructions when an instructions override is provided', async () => {
      await runWithOverrides({ instructions: 'original' }, { instructions: 'overridden' });
      expect(resolveArg().instructions).toBe('overridden');
    });

    it('replaces tools when a tools override is provided', async () => {
      const overrideTools = [{ tool_ids: ['new-tool'] }];
      await runWithOverrides({ tools: [{ tool_ids: ['old-tool'] }] }, { tools: overrideTools });
      expect(resolveArg().tools).toEqual(overrideTools);
    });

    describe('skill_ids override (straight replace, no intersection)', () => {
      it('replaces skill_ids with the override when agent skill_ids is undefined (all skills allowed)', async () => {
        await runWithOverrides({}, { skill_ids: ['elastic-builtin', 'custom'] });
        expect(resolveArg().skill_ids).toEqual(['elastic-builtin', 'custom']);
      });

      it('replaces skill_ids with the override when agent skill_ids is an empty list', async () => {
        await runWithOverrides({ skill_ids: [] }, { skill_ids: ['elastic-builtin'] });
        expect(resolveArg().skill_ids).toEqual(['elastic-builtin']);
      });

      it("replaces skill_ids with the override verbatim, even when it names IDs outside the agent's explicit list — the type merge downstream (mergeAgentConfiguration) re-adds any base skill_ids regardless, so intersecting here bought no containment (PR #280617 review)", async () => {
        await runWithOverrides(
          { skill_ids: ['allowed-1', 'allowed-2'] },
          { skill_ids: ['allowed-1', 'rogue'] }
        );
        expect(resolveArg().skill_ids).toEqual(['allowed-1', 'rogue']);
      });

      it('does not change agent skill_ids when no skill_ids override is provided', async () => {
        await runWithOverrides(
          { skill_ids: ['s1', 's2'] },
          { instructions: 'override instructions' }
        );
        expect(resolveArg().skill_ids).toEqual(['s1', 's2']);
      });

      it('applies instructions and skill_ids overrides independently in the same call', async () => {
        await runWithOverrides(
          { instructions: 'original', skill_ids: ['s1', 's2'] },
          { instructions: 'new', skill_ids: ['s1', 'not-allowed'] }
        );
        const config = resolveArg();
        expect(config.instructions).toBe('new');
        expect(config.skill_ids).toEqual(['s1', 'not-allowed']);
      });
    });
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

  it('scopes the ES client to the run project routing expression when one is provided', async () => {
    const managerWithRouting = new RunnerManager({ ...runnerDeps, projectRouting: '_alias:*' });
    const params: ScopedRunnerRunAgentParams = {
      agentId: 'test-agent',
      agentParams: { nextInput: { message: 'hi' } },
    };

    await runAgent({
      agentExecutionParams: params,
      parentManager: managerWithRouting,
    });

    expect(runnerDeps.elasticsearch.client.asScoped).toHaveBeenCalledWith(runnerDeps.request, {
      projectRouting: 'expression',
      value: '_alias:*',
    });
  });

  it('defaults the ES client to space routing when no project routing is provided', async () => {
    const params: ScopedRunnerRunAgentParams = {
      agentId: 'test-agent',
      agentParams: { nextInput: { message: 'hi' } },
    };

    await runAgent({
      agentExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(runnerDeps.elasticsearch.client.asScoped).toHaveBeenCalledWith(runnerDeps.request, {
      projectRouting: 'space',
    });
  });
});
