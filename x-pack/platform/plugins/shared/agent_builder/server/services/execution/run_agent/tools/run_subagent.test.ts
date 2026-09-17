/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, ReplaySubject } from 'rxjs';
import { ChatEventType, SELF_AGENT_ID, SubagentMode } from '@kbn/agent-builder-common';
import type {
  AutoApprovedApi,
  ChatEvent,
  ConversationRound,
  InteractivityConfig,
} from '@kbn/agent-builder-common';
import { EffortLevels } from '@kbn/agent-builder-common/model_provider';
import { AgentPromptType, ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { isToolHandlerInterruptReturn } from '@kbn/agent-builder-server/tools';
import { agentBuilderMocks } from '../../../../mocks';
import type { ModelProviderMock } from '../../../../test_utils';
import type { ToolPromptManagerMock } from '../../../../test_utils/runner';
import { createToolPromptManagerMock } from '../../../../test_utils/runner';
import { createSubagentTool } from './run_subagent';
import { SubagentTracker } from '../subagent_tracker';

const createMockContext = (
  selectedConnectorId = 'selected-connector',
  interactivity: InteractivityConfig = { enabled: true }
) => {
  const modelProvider: ModelProviderMock = agentBuilderMocks.createModelProvider();
  modelProvider.selectModel.mockResolvedValue({
    connector: { connectorId: selectedConnectorId },
    chatModel: {},
    inferenceClient: {},
  } as never);

  const prompts: ToolPromptManagerMock = createToolPromptManagerMock();
  prompts.checkConfirmationStatus.mockReturnValue({ status: ConfirmationStatus.unprompted });
  prompts.askForConfirmation.mockImplementation((confirm) => ({
    prompt: { type: AgentPromptType.confirmation, ...confirm },
  }));

  return {
    context: {
      events: { reportProgress: jest.fn(), sendUiEvent: jest.fn() },
      modelProvider,
      prompts,
      interactivity,
      callContext: {
        toolId: 'run_subagent',
        toolCallId: 'tool-call-id',
        callSource: 'agent',
      },
    } as any,
    modelProvider,
    prompts,
  };
};

const callHandler = async (
  tool: ReturnType<typeof createSubagentTool>,
  params: {
    agent_id?: string;
    description: string;
    prompt: string;
    run_in_background?: boolean;
    effort?: EffortLevels;
    mode?: SubagentMode;
    name?: string;
    auto_approved_apis?: { elasticsearch?: string[]; kibana?: string[] };
  },
  context: ReturnType<typeof createMockContext>['context']
) => tool.handler({ agent_id: 'test-agent', ...params }, context) as Promise<{ results: any[] }>;

describe('createSubagentTool', () => {
  const mockRound = {
    id: 'round-1',
    status: 'completed',
    input: { message: 'test' },
    steps: [],
    response: { message: 'Sub-agent response text' },
    started_at: new Date().toISOString(),
    time_to_first_token: 100,
    time_to_last_token: 500,
    model_usage: { input_tokens: 10, output_tokens: 20 },
  } as unknown as ConversationRound;

  it('returns the sub-agent final response on success', async () => {
    // Use ReplaySubject so events are replayed to late subscribers (after await resolves)
    const events$ = new ReplaySubject<ChatEvent>();
    events$.next({
      type: ChatEventType.roundComplete,
      data: { round: mockRound },
    } as ChatEvent);
    events$.complete();

    const tool = createSubagentTool({
      ownerAgentId: 'test-agent',
      allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
      executionId: 'parent-exec-id',
      subAgentExecutor: {
        executeSubAgent: jest.fn().mockResolvedValue({
          executionId: 'sub-exec-id',
          events$: events$.asObservable(),
        }),
        getExecution: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent: jest.fn(),
      },
      abortSignal: new AbortController().signal,
    });

    const { context } = createMockContext();
    const result = await callHandler(
      tool,
      { description: 'test task', prompt: 'Do something' },
      context
    );
    expect(result.results).toHaveLength(1);
    expect(result.results![0].type).toBe(ToolResultType.other);
    expect(result.results![0].data).toEqual({
      agent_execution_id: 'sub-exec-id',
      response: { message: 'Sub-agent response text' },
      mode: 'foreground',
      status: 'completed',
    });
  });

  it('returns error result when sub-agent execution fails', async () => {
    const tool = createSubagentTool({
      ownerAgentId: 'test-agent',
      allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
      executionId: 'parent-exec-id',
      subAgentExecutor: {
        executeSubAgent: jest.fn().mockRejectedValue(new Error('LLM timeout')),
        getExecution: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent: jest.fn(),
      },
      abortSignal: new AbortController().signal,
    });

    const { context } = createMockContext();
    const result = await callHandler(
      tool,
      { description: 'test', prompt: 'Do something' },
      context
    );
    expect(result.results).toHaveLength(1);
    expect(result.results![0].type).toBe(ToolResultType.error);
    expect(result.results![0].data).toEqual(
      expect.objectContaining({ message: expect.stringContaining('LLM timeout') })
    );
  });

  it('returns error result when no round complete event is emitted', async () => {
    const events$ = new Subject<ChatEvent>();

    const tool = createSubagentTool({
      ownerAgentId: 'test-agent',
      allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
      executionId: 'parent-exec-id',
      subAgentExecutor: {
        executeSubAgent: jest.fn().mockResolvedValue({
          executionId: 'sub-exec-id',
          events$: events$.asObservable(),
        }),
        getExecution: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent: jest.fn(),
      },
    });

    const { context } = createMockContext();
    const resultPromise = callHandler(
      tool,
      { description: 'test', prompt: 'Do something' },
      context
    );

    // Complete without emitting roundComplete
    events$.complete();

    const result = await resultPromise;
    expect(result.results).toHaveLength(1);
    expect(result.results![0].type).toBe(ToolResultType.error);
    expect(result.results![0].data).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('without a round complete event'),
      })
    );
  });

  it('passes correct params to executeSubAgent', async () => {
    const events$ = new ReplaySubject<ChatEvent>();
    events$.next({
      type: ChatEventType.roundComplete,
      data: { round: mockRound },
    } as ChatEvent);
    events$.complete();

    const executeSubAgent = jest.fn().mockResolvedValue({
      executionId: 'sub-exec-id',
      events$: events$.asObservable(),
    });

    const abortSignal = new AbortController().signal;
    const tool = createSubagentTool({
      ownerAgentId: 'test-agent',
      allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
      executionId: 'parent-exec-id',
      subAgentExecutor: {
        executeSubAgent,
        getExecution: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent: jest.fn(),
      },
      abortSignal,
    });

    const { context, modelProvider } = createMockContext('selected-connector');
    await callHandler(
      tool,
      {
        description: 'Summarize data',
        prompt: 'Summarize the following data...',
        effort: EffortLevels.high,
      },
      context
    );

    expect(modelProvider.selectModel).toHaveBeenCalledWith({ effortLevel: 'high' });
    expect(executeSubAgent).toHaveBeenCalledWith({
      agentId: 'test-agent',
      connectorId: 'selected-connector',
      parentExecutionId: 'parent-exec-id',
      prompt: 'Summarize data\n\nSummarize the following data...',
      abortSignal,
    });
  });

  it('defaults effort to medium when not provided', async () => {
    const events$ = new ReplaySubject<ChatEvent>();
    events$.next({
      type: ChatEventType.roundComplete,
      data: { round: mockRound },
    } as ChatEvent);
    events$.complete();

    const tool = createSubagentTool({
      ownerAgentId: 'test-agent',
      allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
      executionId: 'parent-exec-id',
      subAgentExecutor: {
        executeSubAgent: jest.fn().mockResolvedValue({
          executionId: 'sub-exec-id',
          events$: events$.asObservable(),
        }),
        getExecution: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent: jest.fn(),
      },
      abortSignal: new AbortController().signal,
    });

    const { context, modelProvider } = createMockContext();
    await callHandler(tool, { description: 'test', prompt: 'Do something' }, context);

    expect(modelProvider.selectModel).toHaveBeenCalledWith({ effortLevel: 'medium' });
  });

  it('returns execution_id immediately when run_in_background is true', async () => {
    const events$ = new ReplaySubject<ChatEvent>();
    const registerExecution = jest.fn();

    const tool = createSubagentTool({
      ownerAgentId: 'test-agent',
      allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
      executionId: 'parent-exec-id',
      subAgentExecutor: {
        executeSubAgent: jest.fn().mockResolvedValue({
          executionId: 'bg-exec-id',
          events$: events$.asObservable(),
        }),
        getExecution: jest.fn(),
        createSubAgent: jest.fn(),
        sendToSubAgent: jest.fn(),
      },
      backgroundExecutionService: {
        registerExecution,
        getState: jest.fn(),
        hasPending: jest.fn(),
        checkForCompletions: jest.fn(),
      } as any,
    });

    const { context } = createMockContext();
    const result = await callHandler(
      tool,
      {
        description: 'background task',
        prompt: 'Do something in background',
        run_in_background: true,
      },
      context
    );

    expect(result.results).toHaveLength(1);
    expect(result.results[0].data).toEqual({
      agent_execution_id: 'bg-exec-id',
      mode: 'background',
      status: 'queued',
    });
    expect(registerExecution).toHaveBeenCalledWith('bg-exec-id');

    // Clean up — complete the observable (it's still running in the background)
    events$.complete();
  });

  describe('persistent mode', () => {
    const persistentMockRound = {
      id: 'round-p',
      status: 'completed',
      input: { message: 'hello' },
      steps: [],
      response: { message: 'Hi from researcher' },
      started_at: new Date().toISOString(),
      time_to_first_token: 100,
      time_to_last_token: 500,
      model_usage: { input_tokens: 5, output_tokens: 10 },
    } as unknown as ConversationRound;

    const roundCompleteEvents$ = () => {
      const events$ = new ReplaySubject<ChatEvent>();
      events$.next({
        type: ChatEventType.roundComplete,
        data: { round: persistentMockRound },
      } as ChatEvent);
      events$.complete();
      return events$;
    };

    it('creates a new persistent sub-agent (foreground) and registers on tracker', async () => {
      const events$ = roundCompleteEvents$();
      const createSubAgent = jest.fn().mockResolvedValue({
        executionId: 'child-exec',
        events$: events$.asObservable(),
      });
      const subagentTracker = new SubagentTracker();
      const conversationExists = jest.fn().mockResolvedValue(false);

      const tool = createSubagentTool({
        ownerAgentId: 'test-agent',
        allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
        executionId: 'parent-exec',
        subAgentExecutor: {
          executeSubAgent: jest.fn(),
          createSubAgent,
          sendToSubAgent: jest.fn(),
          getExecution: jest.fn(),
        },
        parentConversationId: 'parent-convo',
        subagentTracker,
        conversationExists,
      });

      const { context } = createMockContext('conn-x');
      const result = await callHandler(
        tool,
        {
          description: 'find flaky tests',
          prompt: 'Look into CI',
          mode: SubagentMode.persistent,
          name: 'researcher',
        },
        context
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual({
        agent_execution_id: 'child-exec',
        mode: 'foreground',
        status: 'completed',
        response: { message: 'Hi from researcher' },
      });

      expect(createSubAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'test-agent',
          parentConversationId: 'parent-convo',
          parentExecutionId: 'parent-exec',
          subagentName: 'researcher',
          subagentPurpose: 'find flaky tests',
          connectorId: 'conn-x',
        })
      );
      // Fresh tracker → conversationExists probe not invoked (nothing to check).
      expect(conversationExists).not.toHaveBeenCalled();
      // Roster updated with the freshly created child.
      const child = createSubAgent.mock.calls[0][0].conversationId as string;
      expect(subagentTracker.get('researcher')).toEqual({
        conversation_id: child,
        agent_id: 'test-agent',
      });
    });

    it('rejects when the name is already taken by a live child', async () => {
      const subagentTracker = new SubagentTracker({
        researcher: { conversation_id: 'existing-child', agent_id: 'test-agent' },
      });
      const createSubAgent = jest.fn();
      const conversationExists = jest.fn().mockResolvedValue(true);

      const tool = createSubagentTool({
        ownerAgentId: 'test-agent',
        allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
        executionId: 'parent-exec',
        subAgentExecutor: {
          executeSubAgent: jest.fn(),
          createSubAgent,
          sendToSubAgent: jest.fn(),
          getExecution: jest.fn(),
        },
        parentConversationId: 'parent-convo',
        subagentTracker,
        conversationExists,
      });

      const { context } = createMockContext();
      const result = await callHandler(
        tool,
        {
          description: 'x',
          prompt: 'y',
          mode: SubagentMode.persistent,
          name: 'researcher',
        },
        context
      );

      expect(conversationExists).toHaveBeenCalledWith('existing-child');
      expect(createSubAgent).not.toHaveBeenCalled();
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('already exists in this conversation'),
        })
      );
      // Tracker entry preserved.
      expect(subagentTracker.get('researcher')).toEqual({
        conversation_id: 'existing-child',
        agent_id: 'test-agent',
      });
    });

    it('recovers from a stale tracker entry when the child conversation no longer exists', async () => {
      const events$ = roundCompleteEvents$();
      const subagentTracker = new SubagentTracker({
        researcher: { conversation_id: 'stale-child', agent_id: 'test-agent' },
      });
      const createSubAgent = jest.fn().mockResolvedValue({
        executionId: 'new-exec',
        events$: events$.asObservable(),
      });
      const conversationExists = jest.fn().mockResolvedValue(false);

      const tool = createSubagentTool({
        ownerAgentId: 'test-agent',
        allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
        executionId: 'parent-exec',
        subAgentExecutor: {
          executeSubAgent: jest.fn(),
          createSubAgent,
          sendToSubAgent: jest.fn(),
          getExecution: jest.fn(),
        },
        parentConversationId: 'parent-convo',
        subagentTracker,
        conversationExists,
      });

      const { context } = createMockContext();
      const result = await callHandler(
        tool,
        {
          description: 'x',
          prompt: 'y',
          mode: SubagentMode.persistent,
          name: 'researcher',
        },
        context
      );

      expect(conversationExists).toHaveBeenCalledWith('stale-child');
      expect(createSubAgent).toHaveBeenCalled();
      // Tracker now points at the freshly created child, not the stale id.
      const newChildId = createSubAgent.mock.calls[0][0].conversationId as string;
      expect(subagentTracker.get('researcher')).toEqual({
        conversation_id: newChildId,
        agent_id: 'test-agent',
      });
      expect(newChildId).not.toBe('stale-child');
      expect(result.results[0].type).toBe(ToolResultType.other);
    });

    it('background persistent creation registers with backgroundExecutionService', async () => {
      const events$ = new ReplaySubject<ChatEvent>();
      const registerExecution = jest.fn();
      const subagentTracker = new SubagentTracker();
      const createSubAgent = jest.fn().mockResolvedValue({
        executionId: 'bg-child',
        events$: events$.asObservable(),
      });

      const tool = createSubagentTool({
        ownerAgentId: 'test-agent',
        allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
        executionId: 'parent-exec',
        subAgentExecutor: {
          executeSubAgent: jest.fn(),
          createSubAgent,
          sendToSubAgent: jest.fn(),
          getExecution: jest.fn(),
        },
        parentConversationId: 'parent-convo',
        subagentTracker,
        backgroundExecutionService: {
          registerExecution,
          getState: jest.fn(),
          hasPending: jest.fn(),
          checkForCompletions: jest.fn(),
        } as any,
      });

      const { context } = createMockContext();
      const result = await callHandler(
        tool,
        {
          description: 'bg',
          prompt: 'run in bg',
          mode: SubagentMode.persistent,
          name: 'bg-agent',
          run_in_background: true,
        },
        context
      );

      expect(result.results[0].data).toEqual({
        agent_execution_id: 'bg-child',
        mode: 'background',
        status: 'queued',
      });
      expect(registerExecution).toHaveBeenCalledWith('bg-child');
      expect(subagentTracker.get('bg-agent')).toBeDefined();

      events$.complete();
    });

    it('returns error when persistent creation is invoked without tracker or parent conversation', async () => {
      const tool = createSubagentTool({
        ownerAgentId: 'test-agent',
        allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
        executionId: 'parent-exec',
        subAgentExecutor: {
          executeSubAgent: jest.fn(),
          createSubAgent: jest.fn(),
          sendToSubAgent: jest.fn(),
          getExecution: jest.fn(),
        },
        // No parentConversationId, no subagentTracker — persistent mode is unavailable.
      });

      const { context } = createMockContext();
      const result = await callHandler(
        tool,
        {
          description: 'x',
          prompt: 'y',
          mode: SubagentMode.persistent,
        },
        context
      );

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('not available'),
        })
      );
    });

    it('stores the raw _self sentinel on the tracker entry, not the resolved owner id', async () => {
      const events$ = roundCompleteEvents$();
      const createSubAgent = jest.fn().mockResolvedValue({
        executionId: 'child-exec',
        events$: events$.asObservable(),
      });
      const subagentTracker = new SubagentTracker();

      const tool = createSubagentTool({
        ownerAgentId: 'owner-real',
        allowedSubagents: [{ id: SELF_AGENT_ID, description: 'Self.' }],
        executionId: 'parent-exec',
        subAgentExecutor: {
          executeSubAgent: jest.fn(),
          createSubAgent,
          sendToSubAgent: jest.fn(),
          getExecution: jest.fn(),
        },
        parentConversationId: 'parent-convo',
        subagentTracker,
        conversationExists: jest.fn().mockResolvedValue(false),
      });

      const { context } = createMockContext();
      await callHandler(
        tool,
        {
          agent_id: SELF_AGENT_ID,
          description: 'x',
          prompt: 'y',
          mode: SubagentMode.persistent,
          name: 'self-copy',
        },
        context
      );

      // Executor receives the resolved real id...
      expect(createSubAgent).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'owner-real' })
      );
      // ...but the tracker keeps the sentinel so the reachability check in
      // send_message matches against the allowlist's own representation.
      expect(subagentTracker.get('self-copy')?.agent_id).toBe(SELF_AGENT_ID);
    });
  });

  describe('agent_id resolution and allowlist enforcement', () => {
    it('substitutes _self to ownerAgentId on the executor call', async () => {
      const events$ = new ReplaySubject<ChatEvent>();
      events$.next({
        type: ChatEventType.roundComplete,
        data: { round: mockRound },
      } as ChatEvent);
      events$.complete();

      const executeSubAgent = jest.fn().mockResolvedValue({
        executionId: 'sub-exec-id',
        events$: events$.asObservable(),
      });

      const tool = createSubagentTool({
        ownerAgentId: 'owner-real',
        allowedSubagents: [{ id: SELF_AGENT_ID, description: 'Self.' }],
        executionId: 'parent-exec-id',
        subAgentExecutor: {
          executeSubAgent,
          getExecution: jest.fn(),
          createSubAgent: jest.fn(),
          sendToSubAgent: jest.fn(),
        },
      });

      const { context } = createMockContext();
      await callHandler(tool, { agent_id: SELF_AGENT_ID, description: 't', prompt: 'p' }, context);

      expect(executeSubAgent).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'owner-real' })
      );
    });

    it('passes a real agent_id through unchanged to the executor', async () => {
      const events$ = new ReplaySubject<ChatEvent>();
      events$.next({
        type: ChatEventType.roundComplete,
        data: { round: mockRound },
      } as ChatEvent);
      events$.complete();

      const executeSubAgent = jest.fn().mockResolvedValue({
        executionId: 'sub-exec-id',
        events$: events$.asObservable(),
      });

      const tool = createSubagentTool({
        ownerAgentId: 'owner-real',
        allowedSubagents: [{ id: 'coder', description: 'Coder.' }],
        executionId: 'parent-exec-id',
        subAgentExecutor: {
          executeSubAgent,
          getExecution: jest.fn(),
          createSubAgent: jest.fn(),
          sendToSubAgent: jest.fn(),
        },
      });

      const { context } = createMockContext();
      await callHandler(tool, { agent_id: 'coder', description: 't', prompt: 'p' }, context);

      expect(executeSubAgent).toHaveBeenCalledWith(expect.objectContaining({ agentId: 'coder' }));
    });

    it('lists _self first in the description when present', () => {
      const tool = createSubagentTool({
        ownerAgentId: 'owner',
        allowedSubagents: [
          { id: 'coder', description: 'Writes code.' },
          { id: SELF_AGENT_ID, description: 'Self.' },
        ],
        executionId: 'parent-exec-id',
        subAgentExecutor: {
          executeSubAgent: jest.fn(),
          getExecution: jest.fn(),
          createSubAgent: jest.fn(),
          sendToSubAgent: jest.fn(),
        },
      });
      const selfIdx = tool.description.indexOf(`- ${SELF_AGENT_ID}:`);
      const coderIdx = tool.description.indexOf('- coder:');
      expect(selfIdx).toBeGreaterThan(-1);
      expect(coderIdx).toBeGreaterThan(selfIdx);
    });

    it('rejects an agent_id outside the allowlist (defense-in-depth)', async () => {
      const executeSubAgent = jest.fn();
      const tool = createSubagentTool({
        ownerAgentId: 'owner',
        allowedSubagents: [{ id: 'coder', description: 'Coder.' }],
        executionId: 'parent-exec-id',
        subAgentExecutor: {
          executeSubAgent,
          getExecution: jest.fn(),
          createSubAgent: jest.fn(),
          sendToSubAgent: jest.fn(),
        },
      });

      const { context } = createMockContext();
      const result = await callHandler(
        tool,
        // Bypass the Zod enum by casting; the handler must reject on its own.
        { agent_id: 'evil' as unknown as string, description: 't', prompt: 'p' } as never,
        context
      );

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          message: expect.stringMatching(/not in this agent's allowlist/i),
        })
      );
      expect(executeSubAgent).not.toHaveBeenCalled();
    });
  });

  describe('destructive API grants', () => {
    const grantedApis: AutoApprovedApi[] = [
      { target: 'elasticsearch', api: 'indices.create' },
      { target: 'kibana', api: 'alerting.delete-alerting-rule-id' },
    ];

    const requestedApis = {
      elasticsearch: ['indices.create'],
      kibana: ['alerting.delete-alerting-rule-id'],
    };

    const completedEvents$ = () => {
      const events$ = new ReplaySubject<ChatEvent>();
      events$.next({
        type: ChatEventType.roundComplete,
        data: { round: mockRound },
      } as ChatEvent);
      events$.complete();
      return events$.asObservable();
    };

    const createTool = ({
      executeSubAgent = jest.fn(),
      createSubAgent = jest.fn(),
      subagentTracker,
      parentConversationId,
      childConversationExists = false,
    }: {
      executeSubAgent?: jest.Mock;
      createSubAgent?: jest.Mock;
      subagentTracker?: SubagentTracker;
      parentConversationId?: string;
      childConversationExists?: boolean;
    } = {}) =>
      createSubagentTool({
        ownerAgentId: 'test-agent',
        allowedSubagents: [{ id: 'test-agent', description: 'Test.' }],
        executionId: 'parent-exec-id',
        subAgentExecutor: {
          executeSubAgent,
          createSubAgent,
          sendToSubAgent: jest.fn(),
          getExecution: jest.fn(),
        },
        subagentTracker,
        parentConversationId,
        conversationExists: jest.fn().mockResolvedValue(childConversationExists),
      });

    it('asks the user to confirm the grant before spawning the sub-agent', async () => {
      const executeSubAgent = jest.fn();
      const tool = createTool({ executeSubAgent });
      const { context, prompts } = createMockContext();

      const result = await tool.handler(
        {
          agent_id: 'test-agent',
          description: 'rotate the index',
          prompt: 'Point the alias at a new index',
          auto_approved_apis: requestedApis,
        },
        context
      );

      expect(executeSubAgent).not.toHaveBeenCalled();
      expect(isToolHandlerInterruptReturn(result)).toBe(true);
      expect(prompts.askForConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'run_subagent.tool-call-id.auto_approved_apis' })
      );
      const { message } = prompts.askForConfirmation.mock.calls[0][0];
      expect(message).toContain('rotate the index');
      expect(message).toContain('Elasticsearch: `indices.create`');
      expect(message).toContain('Kibana: `alerting.delete-alerting-rule-id`');
      expect(message).toContain('The task still runs either way');
    });

    it('lists a selector once when the delegating agent repeats it', async () => {
      const executeSubAgent = jest.fn();
      const tool = createTool({ executeSubAgent });
      const { context, prompts } = createMockContext();

      await callHandler(
        tool,
        {
          description: 'x',
          prompt: 'y',
          auto_approved_apis: { elasticsearch: ['indices.create', 'indices.create'] },
        },
        context
      );

      const { message } = prompts.askForConfirmation.mock.calls[0][0];
      expect(message).toContain('Elasticsearch: `indices.create`');
      expect(message).not.toContain('`indices.create`, `indices.create`');
    });

    it('passes the approved grant to a transient sub-agent', async () => {
      const executeSubAgent = jest
        .fn()
        .mockResolvedValue({ executionId: 'sub-exec-id', events$: completedEvents$() });
      const tool = createTool({ executeSubAgent });
      const { context, prompts } = createMockContext();
      prompts.checkConfirmationStatus.mockReturnValue({ status: ConfirmationStatus.accepted });

      const result = await callHandler(
        tool,
        { description: 'x', prompt: 'y', auto_approved_apis: requestedApis },
        context
      );

      expect(executeSubAgent).toHaveBeenCalledWith(
        expect.objectContaining({ autoApprovedApis: grantedApis })
      );
      expect(prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(result.results[0].data).toEqual(
        expect.objectContaining({ destructive_access: 'granted' })
      );
    });

    it('passes the approved grant to a persistent sub-agent', async () => {
      const createSubAgent = jest
        .fn()
        .mockResolvedValue({ executionId: 'child-exec', events$: completedEvents$() });
      const tool = createTool({
        createSubAgent,
        subagentTracker: new SubagentTracker(),
        parentConversationId: 'parent-convo',
      });
      const { context, prompts } = createMockContext();
      prompts.checkConfirmationStatus.mockReturnValue({ status: ConfirmationStatus.accepted });

      const result = await callHandler(
        tool,
        {
          description: 'x',
          prompt: 'y',
          mode: SubagentMode.persistent,
          name: 'rotator',
          auto_approved_apis: requestedApis,
        },
        context
      );

      expect(createSubAgent).toHaveBeenCalledWith(
        expect.objectContaining({ autoApprovedApis: grantedApis })
      );
      expect(result.results[0].data).toEqual(
        expect.objectContaining({ destructive_access: 'granted' })
      );
    });

    it('still runs the sub-agent without the grant once the user has denied it', async () => {
      const executeSubAgent = jest
        .fn()
        .mockResolvedValue({ executionId: 'sub-exec-id', events$: completedEvents$() });
      const tool = createTool({ executeSubAgent });
      const { context } = createMockContext();
      context.prompts.checkConfirmationStatus.mockReturnValue({
        status: ConfirmationStatus.rejected,
      });

      const result = await callHandler(
        tool,
        { description: 'x', prompt: 'y', auto_approved_apis: requestedApis },
        context
      );

      expect(executeSubAgent).toHaveBeenCalledWith(
        expect.not.objectContaining({ autoApprovedApis: expect.anything() })
      );
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({ destructive_access: 'denied' })
      );
    });

    it('reports the grant as unavailable when the delegating run has no user to ask', async () => {
      const executeSubAgent = jest
        .fn()
        .mockResolvedValue({ executionId: 'sub-exec-id', events$: completedEvents$() });
      const tool = createTool({ executeSubAgent });
      const { context, prompts } = createMockContext('selected-connector', { enabled: false });

      const result = await callHandler(
        tool,
        { description: 'x', prompt: 'y', auto_approved_apis: requestedApis },
        context
      );

      expect(prompts.checkConfirmationStatus).not.toHaveBeenCalled();
      expect(prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(executeSubAgent).toHaveBeenCalledWith(
        expect.not.objectContaining({ autoApprovedApis: expect.anything() })
      );
      expect(result.results[0].data).toEqual(
        expect.objectContaining({ destructive_access: 'unavailable' })
      );
    });

    it('skips the prompt for APIs the delegating run already carries', async () => {
      const executeSubAgent = jest
        .fn()
        .mockResolvedValue({ executionId: 'sub-exec-id', events$: completedEvents$() });
      const tool = createTool({ executeSubAgent });
      // A workflow step granted `indices.*`, which the executor already forwards to sub-agents.
      const { context, prompts } = createMockContext('selected-connector', {
        enabled: false,
        auto_approved_apis: [{ target: 'elasticsearch', api: 'indices.*' }],
      });

      const result = await callHandler(
        tool,
        {
          description: 'x',
          prompt: 'y',
          auto_approved_apis: { elasticsearch: ['indices.create'] },
        },
        context
      );

      expect(prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(executeSubAgent).toHaveBeenCalledWith(
        expect.not.objectContaining({ autoApprovedApis: expect.anything() })
      );
      expect(result.results[0].data).toEqual(
        expect.objectContaining({ destructive_access: 'granted' })
      );
    });

    it('rejects an API identifier that exists on neither backend, without prompting', async () => {
      const executeSubAgent = jest.fn();
      const tool = createTool({ executeSubAgent });
      const { context, prompts } = createMockContext();

      const result = await callHandler(
        tool,
        {
          description: 'x',
          prompt: 'y',
          auto_approved_apis: { elasticsearch: ['indices.create', 'indices.nope'] },
        },
        context
      );

      expect(prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(executeSubAgent).not.toHaveBeenCalled();
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('"indices.nope" (elasticsearch)'),
        })
      );
    });

    it('does not prompt for a grant when a persistent name is already taken', async () => {
      const createSubAgent = jest.fn();
      const tool = createTool({
        createSubAgent,
        subagentTracker: new SubagentTracker({
          rotator: { conversation_id: 'existing-child', agent_id: 'test-agent' },
        }),
        parentConversationId: 'parent-convo',
        childConversationExists: true,
      });
      const { context, prompts } = createMockContext();

      const result = await callHandler(
        tool,
        {
          description: 'x',
          prompt: 'y',
          mode: SubagentMode.persistent,
          name: 'rotator',
          auto_approved_apis: requestedApis,
        },
        context
      );

      expect(prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(createSubAgent).not.toHaveBeenCalled();
      expect(result.results[0].type).toBe(ToolResultType.error);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({ message: expect.stringContaining('already exists') })
      );
    });

    it('leaves the sub-agent untouched when no grant is requested', async () => {
      const executeSubAgent = jest
        .fn()
        .mockResolvedValue({ executionId: 'sub-exec-id', events$: completedEvents$() });
      const tool = createTool({ executeSubAgent });
      const { context, prompts } = createMockContext();

      const result = await callHandler(tool, { description: 'x', prompt: 'y' }, context);

      expect(prompts.checkConfirmationStatus).not.toHaveBeenCalled();
      expect(executeSubAgent).toHaveBeenCalledWith(
        expect.not.objectContaining({ autoApprovedApis: expect.anything() })
      );
      expect(result.results[0].data).not.toHaveProperty('destructive_access');
    });
  });
});
