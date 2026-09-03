/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, ReplaySubject } from 'rxjs';
import { ChatEventType, SubagentMode } from '@kbn/agent-builder-common';
import type { ChatEvent, ConversationRound } from '@kbn/agent-builder-common';
import { EffortLevels } from '@kbn/agent-builder-common/model_provider';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '../../../../mocks';
import type { ModelProviderMock } from '../../../../test_utils';
import { createSubagentTool } from './run_subagent';
import { SubagentTracker } from '../subagent_tracker';

const createMockContext = (selectedConnectorId = 'selected-connector') => {
  const modelProvider: ModelProviderMock = agentBuilderMocks.createModelProvider();
  modelProvider.selectModel.mockResolvedValue({
    connector: { connectorId: selectedConnectorId },
    chatModel: {},
    inferenceClient: {},
  } as never);

  return {
    context: {
      events: { reportProgress: jest.fn(), sendUiEvent: jest.fn() },
      modelProvider,
    } as any,
    modelProvider,
  };
};

const callHandler = async (
  tool: ReturnType<typeof createSubagentTool>,
  params: {
    description: string;
    prompt: string;
    run_in_background?: boolean;
    effort?: EffortLevels;
    mode?: SubagentMode;
    name?: string;
  },
  context: ReturnType<typeof createMockContext>['context']
) => tool.handler(params, context) as Promise<{ results: any[] }>;

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
      agentId: 'test-agent',
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
      agentId: 'test-agent',
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
      agentId: 'test-agent',
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
      agentId: 'test-agent',
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
      agentId: 'test-agent',
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
      agentId: 'test-agent',
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
        agentId: 'test-agent',
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
      expect(subagentTracker.get('researcher')).toBe(child);
    });

    it('rejects when the name is already taken by a live child', async () => {
      const subagentTracker = new SubagentTracker({ researcher: 'existing-child' });
      const createSubAgent = jest.fn();
      const conversationExists = jest.fn().mockResolvedValue(true);

      const tool = createSubagentTool({
        agentId: 'test-agent',
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
      expect(subagentTracker.get('researcher')).toBe('existing-child');
    });

    it('recovers from a stale tracker entry when the child conversation no longer exists', async () => {
      const events$ = roundCompleteEvents$();
      const subagentTracker = new SubagentTracker({ researcher: 'stale-child' });
      const createSubAgent = jest.fn().mockResolvedValue({
        executionId: 'new-exec',
        events$: events$.asObservable(),
      });
      const conversationExists = jest.fn().mockResolvedValue(false);

      const tool = createSubagentTool({
        agentId: 'test-agent',
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
      expect(subagentTracker.get('researcher')).toBe(newChildId);
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
        agentId: 'test-agent',
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
        agentId: 'test-agent',
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
  });
});
