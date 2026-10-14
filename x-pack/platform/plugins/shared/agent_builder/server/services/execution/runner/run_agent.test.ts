/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY } from 'rxjs';
import { getAgentFromRunContext, type ScopedRunnerRunAgentParams } from '@kbn/agent-builder-server';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';
import {
  ConversationOriginType,
  ConversationRoundStatus,
  type AgentApprovals,
  type AgentConfigurationOverrides,
} from '@kbn/agent-builder-common';

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
  createEmptyConversation,
  createRound,
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

  it('records the agent name on the run context stack', async () => {
    const createChild = jest.spyOn(runnerManager, 'createChild');

    await runAgent({
      agentExecutionParams: {
        agentId: 'test-agent',
        agentParams: { nextInput: { message: 'bar' } },
      },
      parentManager: runnerManager,
    });

    const childManager = createChild.mock.results[0].value as RunnerManager;
    expect(getAgentFromRunContext(childManager.context)).toEqual(
      expect.objectContaining({
        agentId: 'test-agent',
        agentName: agent.name,
      })
    );
  });

  describe('origin on the run context stack', () => {
    const runAndReadAgentEntry = async (agentParams: ScopedRunnerRunAgentParams['agentParams']) => {
      const createChild = jest.spyOn(runnerManager, 'createChild');

      await runAgent({
        agentExecutionParams: { agentId: 'test-agent', agentParams },
        parentManager: runnerManager,
      });

      const childManager = createChild.mock.results[0].value as RunnerManager;
      return getAgentFromRunContext(childManager.context);
    };

    const slackRound = (status: ConversationRoundStatus) =>
      createRound({
        id: 'round-1',
        status,
        origin: { type: ConversationOriginType.Slack },
      });

    it('records the origin the request carries', async () => {
      const entry = await runAndReadAgentEntry({
        nextInput: { message: 'bar' },
        origin: {
          type: ConversationOriginType.Slack,
          external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
        },
      });

      expect(entry).toEqual(expect.objectContaining({ origin: ConversationOriginType.Slack }));
    });

    it('falls back to the paused round origin when a resume request carries none', async () => {
      const entry = await runAndReadAgentEntry({
        nextInput: { prompts: {} },
        conversation: {
          ...createEmptyConversation({ id: 'conversation-1', agent_id: 'test-agent' }),
          rounds: [slackRound(ConversationRoundStatus.awaitingPrompt)],
        },
      });

      expect(entry).toEqual(expect.objectContaining({ origin: ConversationOriginType.Slack }));
    });

    it('leaves the origin unset for a fresh round on a conversation an external system started', async () => {
      const entry = await runAndReadAgentEntry({
        nextInput: { message: 'bar' },
        conversation: {
          ...createEmptyConversation({ id: 'conversation-1', agent_id: 'test-agent' }),
          rounds: [slackRound(ConversationRoundStatus.completed)],
        },
      });

      expect(entry).toEqual(expect.objectContaining({ origin: undefined }));
    });
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

  describe('auto-approval defaults', () => {
    const storedApprovals = { auto_approved_apis: { elasticsearch: ['indices.delete'] } };
    const callerGrant = { target: 'kibana' as const, api: 'alerting.delete-alerting-rule-id' };
    const executeAgent = jest.fn();
    const executionService: jest.Mocked<AgentExecutionService> = {
      executeAgent,
      maybeExecuteAgent: jest.fn(),
      getExecution: jest.fn(),
      abortExecution: jest.fn(),
      followExecution: jest.fn(),
      findExecutions: jest.fn(),
    };

    beforeEach(() => {
      executeAgent.mockReset();
      executeAgent.mockResolvedValue({ executionId: 'child-execution', events$: EMPTY });
    });

    const runWith = async ({
      approvals,
      configurationOverrides,
    }: {
      approvals: AgentApprovals | undefined;
      configurationOverrides?: AgentConfigurationOverrides;
    }) => {
      agent = createMockedInternalAgent({ configuration: { tools: [], approvals } });
      agentClient.get.mockResolvedValue(agent);
      const parentManager = new RunnerManager({
        ...runnerDeps,
        getExecutionService: () => executionService,
        interactivity: { enabled: false, auto_approved_apis: [callerGrant] },
      });
      const createChild = jest.spyOn(parentManager, 'createChild');

      await runAgent({
        agentExecutionParams: {
          agentId: 'test-agent',
          agentParams: { nextInput: { message: 'hi' }, configurationOverrides },
        },
        parentManager,
      });

      return {
        parentManager,
        childManager: createChild.mock.results[0].value as RunnerManager,
      };
    };

    it('adds the stored defaults to the caller grant for the child run', async () => {
      const { parentManager, childManager } = await runWith({ approvals: storedApprovals });

      expect(childManager.deps.interactivity).toEqual({
        enabled: false,
        auto_approved_apis: [callerGrant, { target: 'elasticsearch', api: 'indices.delete' }],
      });
      expect(parentManager.deps.interactivity).toEqual({
        enabled: false,
        auto_approved_apis: [callerGrant],
      });
    });

    it('builds the sub-agent executor from the effective grant', async () => {
      const { childManager } = await runWith({ approvals: storedApprovals });
      await childManager.deps.subAgentExecutor.executeSubAgent({
        agentId: 'sub-agent',
        prompt: 'go',
        parentExecutionId: 'parent-execution-id',
      });

      expect(childManager.deps.subAgentExecutor).not.toBe(runnerDeps.subAgentExecutor);
      expect(executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          interactive: {
            enabled: false,
            auto_approved_apis: [callerGrant, { target: 'elasticsearch', api: 'indices.delete' }],
          },
        })
      );
    });

    it('passes the effective configuration to the child run without mutating the parent deps', async () => {
      const { parentManager, childManager } = await runWith({ approvals: storedApprovals });

      expect(childManager.deps.agentConfiguration).toEqual(agent.configuration);
      expect(parentManager.deps.agentConfiguration).toBeUndefined();
    });

    it('keeps the caller grant unchanged when the agent has no stored defaults', async () => {
      const { childManager } = await runWith({ approvals: undefined });

      expect(childManager.deps.interactivity).toEqual({
        enabled: false,
        auto_approved_apis: [callerGrant],
      });
    });

    it('ignores approvals smuggled in through configuration overrides', async () => {
      const untypedOverrides = {
        instructions: 'override instructions',
        approvals: { auto_approved_apis: { elasticsearch: ['*'] } },
      };
      const { childManager } = await runWith({
        approvals: storedApprovals,
        configurationOverrides: untypedOverrides,
      });

      expect(childManager.deps.interactivity).toEqual({
        enabled: false,
        auto_approved_apis: [callerGrant, { target: 'elasticsearch', api: 'indices.delete' }],
      });
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
