/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { Logger } from '@kbn/core/server';
import type { ChatCompleteCacheControl } from '@kbn/inference-common';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { ConversationRoundStepType, type ConversationRoundStep } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import { createAgentGraph } from './graph';
import type { PromptFactory } from './prompts';
import { RunTracker, type ToolExecutionBuffer } from './run_tracker';
import type { StateType } from './state';
import type { ProcessedConversation } from './utils/prepare_conversation';

jest.mock('@langchain/langgraph/prebuilt', () => ({
  ToolNode: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue([]),
  })),
}));

const askName = internalTools.askUserQuestion.replace(/\./g, '_');

const mockToolNodeOnce = (messages: ToolMessage[]) => {
  const { ToolNode } = jest.requireMock('@langchain/langgraph/prebuilt');
  ToolNode.mockImplementationOnce(() => ({
    invoke: jest.fn().mockResolvedValue(messages),
  }));
};

const createTestGraph = ({
  structuredOutput = false,
  outputSchema,
  sessionId,
  cacheControl,
  toolExecutionBuffer,
}: {
  structuredOutput?: boolean;
  outputSchema?: Record<string, unknown>;
  sessionId?: string;
  cacheControl?: ChatCompleteCacheControl;
  toolExecutionBuffer?: ToolExecutionBuffer;
} = {}) => {
  const researchInvoke = jest.fn();
  const structuredInvoke = jest.fn();
  const researchWithConfig = jest.fn((_config: Record<string, unknown>) => ({
    invoke: researchInvoke,
  }));
  const chatModel = {
    bindTools: jest.fn(() => ({
      withConfig: researchWithConfig,
    })),
    withStructuredOutput: jest.fn(() => ({
      withConfig: jest.fn(() => ({ invoke: structuredInvoke })),
    })),
  } as unknown as InferenceChatModel;
  const toolManager = {
    list: jest.fn(() => []),
    recordToolUse: jest.fn(),
    getToolIdMapping: jest.fn(
      () =>
        new Map([
          ['my_tool', 'my_tool'],
          ['test-tool', 'test-tool'],
          [askName, internalTools.askUserQuestion],
        ])
    ),
    getToolMeta: jest.fn(() => ({ origin: undefined, type: undefined })),
  } as unknown as ToolManager;
  const promptFactory = {
    getMainPrompt: jest.fn().mockResolvedValue([]),
    getStructuredAnswerPrompt: jest.fn().mockResolvedValue([]),
  } as jest.Mocked<PromptFactory>;

  const graph = createAgentGraph({
    chatModel,
    toolManager,
    configuration: { instructions: '', aiIndices: [] },
    logger: {} as Logger,
    events: { emit: jest.fn() } as unknown as AgentEventEmitter,
    structuredOutput,
    outputSchema,
    processedConversation: {} as ProcessedConversation,
    promptFactory,
    roundId: 'test-round',
    sessionId,
    cacheControl,
    toolExecutionBuffer,
  });

  return {
    graph,
    researchInvoke,
    structuredInvoke,
    toolManager,
    researchWithConfig,
    promptFactory,
    chatModel,
  };
};

describe('createAgentGraph', () => {
  it('stops after two retries and surfaces emptyResponse for empty research responses', async () => {
    const { graph, researchInvoke } = createTestGraph();
    researchInvoke.mockResolvedValue(new AIMessage({ content: '' }));

    await expect(graph.invoke({ cycleLimit: 10 }, { recursionLimit: 20 })).rejects.toMatchObject({
      meta: { errCode: AgentExecutionErrorCode.emptyResponse },
    });
    expect(researchInvoke).toHaveBeenCalledTimes(3);
  });

  it('resets the consecutive error counter after a valid research response and keeps the retry notice', async () => {
    const { graph, researchInvoke, promptFactory } = createTestGraph();
    researchInvoke
      .mockResolvedValueOnce(new AIMessage({ content: '' }))
      .mockResolvedValueOnce(new AIMessage({ content: 'the answer' }));

    const result = await graph.invoke({ cycleLimit: 10 });

    expect(result.errorCount).toBe(0);
    expect(result.finalAnswer).toBe('the answer');
    expect(result.steps).toEqual([]);
    expect(result.retryNotices).toEqual([
      {
        phase: 'research',
        afterNonTodosStepCount: 0,
        error: expect.objectContaining({
          meta: expect.objectContaining({ errCode: AgentExecutionErrorCode.emptyResponse }),
        }),
      },
    ]);
    // the retry turn sees the notice
    expect(promptFactory.getMainPrompt).toHaveBeenLastCalledWith({
      run: expect.objectContaining({ retryNotices: result.retryNotices }),
    });
  });

  it('preserves valid tool-call and handover behavior', async () => {
    const { graph, researchInvoke, toolManager } = createTestGraph();
    researchInvoke
      .mockResolvedValueOnce(
        new AIMessage({
          content: '',
          tool_calls: [{ id: 'call-1', name: 'test-tool', args: {}, type: 'tool_call' }],
        })
      )
      .mockResolvedValueOnce(new AIMessage({ content: 'answer after tool call' }));

    const result = await graph.invoke({ cycleLimit: 10 });

    expect(toolManager.recordToolUse).toHaveBeenCalledWith('test-tool');
    expect(result.finalAnswer).toBe('answer after tool call');
    expect(result.errorCount).toBe(0);
  });

  it('records tool calls as pending steps, resolves them after execution and clears pending ids', async () => {
    const { graph, researchInvoke } = createTestGraph();
    researchInvoke
      .mockResolvedValueOnce(
        new AIMessage({
          content: 'looking',
          tool_calls: [{ id: 'c1', name: 'my_tool', args: { q: 1 } }],
        })
      )
      .mockResolvedValueOnce(new AIMessage({ content: 'done' }));
    mockToolNodeOnce([
      new ToolMessage({
        tool_call_id: 'c1',
        content: JSON.stringify({ results: [{ type: 'other', data: { ok: true } }] }),
        artifact: { results: [{ type: 'other', data: { ok: true } }] },
      }),
    ]);

    const result = await graph.invoke({ cycleLimit: 5 });

    expect(result.steps.map((s: ConversationRoundStep) => s.type)).toEqual([
      ConversationRoundStepType.reasoning,
      ConversationRoundStepType.toolCall,
    ]);
    expect(result.steps[1]).toMatchObject({
      tool_call_id: 'c1',
      results: [{ type: 'other', data: { ok: true } }],
    });
    expect(result.pendingToolCallIds).toEqual([]);
    expect(result.toolRenderState.c1).toMatchObject({
      toolName: 'my_tool',
      kind: 'server',
      cycle: 1,
    });
    expect(result.toolRenderState.c1.content).toContain('"ok":true');
    expect(result.toolOutcome).toEqual({ type: 'completed' });
    expect(result.finalAnswer).toBe('done');
  });

  it('lets the model repair an ask_user_question call whose arguments failed validation', async () => {
    const { graph, researchInvoke } = createTestGraph();
    researchInvoke
      .mockResolvedValueOnce(
        new AIMessage({
          content: '',
          tool_calls: [{ id: 'a1', name: askName, args: { questions: 'not-an-array' } }],
        })
      )
      .mockResolvedValueOnce(new AIMessage({ content: 'done' }));
    mockToolNodeOnce([
      // what ToolNode returns on a schema-validation failure: no artifact, no interrupt
      new ToolMessage({
        tool_call_id: 'a1',
        content: 'Error: Received tool input did not match expected schema',
      }),
    ]);

    const result = await graph.invoke({ cycleLimit: 5 });

    expect(result.steps).toEqual([
      expect.objectContaining({
        type: ConversationRoundStepType.toolCall,
        tool_call_id: 'a1',
        results: [expect.objectContaining({ type: 'error' })],
      }),
    ]);
    expect(result.toolRenderState.a1).toMatchObject({
      kind: 'dedicated',
      content: expect.stringContaining('Error:'),
    });
    expect(result.pendingToolCallIds).toEqual([]);
    expect(result.toolOutcome).toEqual({ type: 'completed' });
    expect(result.finalAnswer).toBe('done');
    expect(researchInvoke).toHaveBeenCalledTimes(2);
  });

  it('interrupts the run when a tool returns a prompt', async () => {
    const { graph, researchInvoke } = createTestGraph();
    researchInvoke.mockResolvedValueOnce(
      new AIMessage({
        content: '',
        tool_calls: [{ id: 'c1', name: 'my_tool', args: {} }],
      })
    );
    const prompt = { id: 'p1', type: 'confirmation', title: 't', message: 'm' };
    mockToolNodeOnce([new ToolMessage({ tool_call_id: 'c1', content: '', artifact: { prompt } })]);

    const result = await graph.invoke({ cycleLimit: 5 });

    expect(result.interrupted).toBe(true);
    expect(result.prompts).toEqual([prompt]);
    expect(result.pendingToolCallIds).toEqual(['c1']);
    expect(result.steps[0]).toMatchObject({ tool_call_id: 'c1', results: [] });
    expect(result.finalAnswer).toBeUndefined();
    expect(researchInvoke).toHaveBeenCalledTimes(1);
  });

  it('throws cycleLimitExceeded when the research agent keeps calling tools past its budget', async () => {
    const { graph, researchInvoke } = createTestGraph();
    let call = 0;
    researchInvoke.mockImplementation(async () => {
      call += 1;
      return new AIMessage({
        content: '',
        tool_calls: [{ id: `c${call}`, name: 'my_tool', args: {} }],
      });
    });

    await expect(graph.invoke({ cycleLimit: 2 }, { recursionLimit: 50 })).rejects.toMatchObject({
      meta: { errCode: AgentExecutionErrorCode.cycleLimitExceeded },
    });
  });

  it('forcefully hands over to the answer agent past the budget in structured mode', async () => {
    const { graph, researchInvoke, structuredInvoke, promptFactory } = createTestGraph({
      structuredOutput: true,
    });
    let call = 0;
    researchInvoke.mockImplementation(async () => {
      call += 1;
      return new AIMessage({
        content: '',
        tool_calls: [{ id: `c${call}`, name: 'my_tool', args: {} }],
      });
    });
    structuredInvoke.mockResolvedValue({ response: 'forced' });

    const result = await graph.invoke({ cycleLimit: 2 }, { recursionLimit: 50 });

    expect(result.finalAnswer).toEqual({ response: 'forced' });
    expect(result.researchOutcome).toEqual({ type: 'handover', message: '', forceful: true });
    expect(promptFactory.getStructuredAnswerPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ handover: { message: '', forceful: true } })
    );
  });

  it('stops after two retries and surfaces emptyResponse for empty structured answers', async () => {
    const { graph, researchInvoke, structuredInvoke } = createTestGraph({
      structuredOutput: true,
    });
    researchInvoke.mockResolvedValue(new AIMessage({ content: 'research complete' }));
    structuredInvoke.mockResolvedValue({});

    await expect(graph.invoke({ cycleLimit: 10 }, { recursionLimit: 20 })).rejects.toMatchObject({
      meta: { errCode: AgentExecutionErrorCode.emptyResponse },
    });
    expect(researchInvoke).toHaveBeenCalledTimes(1);
    expect(structuredInvoke).toHaveBeenCalledTimes(3);
  });

  it('resets the consecutive error counter after a valid structured answer', async () => {
    const { graph, researchInvoke, structuredInvoke } = createTestGraph({
      structuredOutput: true,
    });
    researchInvoke.mockResolvedValue(new AIMessage({ content: 'research complete' }));
    structuredInvoke
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ response: 'structured answer' });

    const result = await graph.invoke({ cycleLimit: 10 });

    expect(result.errorCount).toBe(0);
    expect(result.finalAnswer).toEqual({ response: 'structured answer' });
    expect(result.answerOutcome).toEqual({
      type: 'structured_answer',
      data: { response: 'structured answer' },
    });
    expect(result.retryNotices).toEqual([
      expect.objectContaining({ phase: 'answer', afterNonTodosStepCount: 0 }),
    ]);
  });

  it('unwraps the structured answer when a non-object output schema was wrapped', async () => {
    const { graph, researchInvoke, structuredInvoke } = createTestGraph({
      structuredOutput: true,
      outputSchema: { type: 'array', items: { type: 'string' } },
    });
    researchInvoke.mockResolvedValue(new AIMessage({ content: 'research complete' }));
    structuredInvoke.mockResolvedValue({ response: ['a', 'b'] });

    const result = await graph.invoke({ cycleLimit: 10 });

    expect(result.finalAnswer).toEqual(['a', 'b']);
  });

  it('passes sessionId and cacheControl to the research model when sessionId is provided', async () => {
    const { graph, researchInvoke, researchWithConfig } = createTestGraph({
      sessionId: 'round-42',
      cacheControl: { type: 'ephemeral' },
    });
    researchInvoke.mockResolvedValue(new AIMessage({ content: 'answer' }));

    await graph.invoke({ cycleLimit: 10 });

    expect(researchWithConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'round-42',
        cacheControl: { type: 'ephemeral' },
      })
    );
  });

  it('passes cacheControl independently when sessionId is not provided', async () => {
    const { graph, researchInvoke, researchWithConfig } = createTestGraph({
      cacheControl: { type: 'ephemeral' },
    });
    researchInvoke.mockResolvedValue(new AIMessage({ content: 'answer' }));

    await graph.invoke({ cycleLimit: 10 });

    expect(researchWithConfig).toHaveBeenCalled();
    const config = researchWithConfig.mock.calls[0][0];
    expect(config.sessionId).toBeUndefined();
    expect(config.cacheControl).toEqual({ type: 'ephemeral' });
  });

  it('omits cacheControl when not provided', async () => {
    const { graph, researchInvoke, researchWithConfig } = createTestGraph();
    researchInvoke.mockResolvedValue(new AIMessage({ content: 'answer' }));

    await graph.invoke({ cycleLimit: 10 });

    expect(researchWithConfig).toHaveBeenCalled();
    const config = researchWithConfig.mock.calls[0][0];
    expect(config.sessionId).toBeUndefined();
    expect(config.cacheControl).toBeUndefined();
  });

  it('streams the full state as root on_chain_stream chunks in values mode, matching the final state', async () => {
    // Pins what `RunTracker` relies on: with `streamMode: 'values'` passed to `streamEvents`, each
    // root `on_chain_stream` chunk is the bare graph state after a super-step, and the last one is
    // deep-equal to the root `on_chain_end` output. Runs a retried empty response, two parallel tool
    // calls and a second cycle, feeding the tracker exactly as `run_chat_agent` does.
    const graphName = 'values-mode-test-graph';
    const tracker = new RunTracker({ graphName });
    const { graph, researchInvoke } = createTestGraph({ toolExecutionBuffer: tracker });
    const toolResult = (data: Record<string, unknown>) => ({
      results: [{ type: 'other', data }],
    });
    researchInvoke
      .mockResolvedValueOnce(new AIMessage({ content: '' }))
      .mockResolvedValueOnce(
        new AIMessage({
          content: 'looking',
          tool_calls: [
            { id: 'c1', name: 'my_tool', args: { q: 1 } },
            { id: 'c2', name: 'my_tool', args: { q: 2 } },
          ],
        })
      )
      .mockResolvedValueOnce(
        new AIMessage({
          content: 'one more',
          tool_calls: [{ id: 'c3', name: 'my_tool', args: { q: 3 } }],
        })
      )
      .mockResolvedValueOnce(new AIMessage({ content: 'done' }));
    mockToolNodeOnce([
      new ToolMessage({ tool_call_id: 'c1', content: 'r1', artifact: toolResult({ n: 1 }) }),
      new ToolMessage({ tool_call_id: 'c2', content: 'r2', artifact: toolResult({ n: 2 }) }),
    ]);
    mockToolNodeOnce([
      new ToolMessage({ tool_call_id: 'c3', content: 'r3', artifact: toolResult({ n: 3 }) }),
    ]);
    tracker.seed({ steps: [] });

    let finalState: StateType | undefined;
    const chunkStepCounts: number[] = [];
    const stream = graph.streamEvents(
      { cycleLimit: 5 },
      {
        version: 'v2',
        streamMode: 'values',
        runName: graphName,
        metadata: { graphName },
        recursionLimit: 50,
      }
    );
    for await (const event of stream) {
      tracker.observeGraphEvent(event);
      if (event.event === 'on_chain_stream' && event.name === graphName) {
        chunkStepCounts.push((event.data.chunk as StateType).steps.length);
      }
      if (event.event === 'on_chain_end' && event.name === graphName) {
        finalState = event.data.output as StateType;
      }
    }

    expect(finalState).toBeDefined();
    expect(finalState!.steps.map((step) => step.type)).toEqual([
      ConversationRoundStepType.reasoning,
      ConversationRoundStepType.toolCall,
      ConversationRoundStepType.toolCall,
      ConversationRoundStepType.reasoning,
      ConversationRoundStepType.toolCall,
    ]);
    // one full state per super-step, growing as the run progresses
    expect(chunkStepCounts).toEqual([...chunkStepCounts].sort((a, b) => a - b));
    expect(chunkStepCounts.at(-1)).toBe(5);
    // the last chunk is the final state
    expect(tracker.latestState()).toEqual(finalState);
    expect(tracker.latestState().steps).toEqual(finalState!.steps);
    expect(tracker.executionProjection()).toEqual(finalState!.steps);
  });

  it('fails a mid-run tool error but streams the state as of the last completed super-step', async () => {
    const graphName = 'values-mode-failure-graph';
    const tracker = new RunTracker({ graphName });
    const { graph, researchInvoke } = createTestGraph({ toolExecutionBuffer: tracker });
    researchInvoke
      .mockResolvedValueOnce(
        new AIMessage({ content: 'a', tool_calls: [{ id: 'c1', name: 'my_tool', args: {} }] })
      )
      .mockResolvedValueOnce(
        new AIMessage({ content: 'b', tool_calls: [{ id: 'c2', name: 'my_tool', args: {} }] })
      );
    mockToolNodeOnce([
      new ToolMessage({ tool_call_id: 'c1', content: 'r1', artifact: { results: [] } }),
    ]);
    const { ToolNode } = jest.requireMock('@langchain/langgraph/prebuilt');
    ToolNode.mockImplementationOnce(() => ({
      invoke: jest.fn().mockRejectedValue(new Error('boom')),
    }));
    tracker.seed({ steps: [] });

    const stream = graph.streamEvents(
      { cycleLimit: 5 },
      { version: 'v2', streamMode: 'values', runName: graphName, recursionLimit: 50 }
    );
    await expect(
      (async () => {
        for await (const event of stream) {
          tracker.observeGraphEvent(event);
        }
      })()
    ).rejects.toThrow('boom');

    // the state after researchAgent: c2 pending, c1 resolved, nothing from the failed executeTool
    const latest = tracker.latestState();
    expect(latest.steps.map((s) => (s.type === 'tool_call' ? s.tool_call_id : s.type))).toEqual([
      'reasoning',
      'c1',
      'reasoning',
      'c2',
    ]);
    expect(tracker.executionProjection()).toEqual(latest.steps);
  });
});
