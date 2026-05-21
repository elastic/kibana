/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, ReplaySubject } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { ChatEvent, ConversationRound } from '@kbn/agent-builder-common';
import { EffortLevels } from '@kbn/agent-builder-common/model_provider';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '../../../../mocks';
import type { ModelProviderMock } from '../../../../test_utils';
import { createSubagentTool } from './run_subagent';

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
      subAgentExecutor: { executeSubAgent, getExecution: jest.fn() },
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
      capabilities: undefined,
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
});
