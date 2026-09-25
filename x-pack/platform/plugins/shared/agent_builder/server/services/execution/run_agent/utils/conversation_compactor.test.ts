/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { BaseMessage } from '@langchain/core/messages';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import type {
  CompactionStructuredData,
  CompactionSummary,
  ToolCallStep,
} from '@kbn/agent-builder-common';
import { timelineFromRounds } from '../../../../test_utils/timeline';
import { createToolResultStoreMock } from '../../../../test_utils/runner';
import type { CurrentRun, ToolRenderStateMap } from '../transient_state';
import type { ProcessedConversation } from './prepare_conversation';
import type { ProcessedTimelineEvent } from './context_timeline';
import {
  compactContext,
  extractProgrammaticSummary,
  type CompactContextDeps,
} from './conversation_compactor';
import { serializeCompactionSummary } from './compaction_serialize';
import type { LlmCompactionOutput } from './compaction_schema';
import { estimateMessagesTokens } from './estimate_conversation_tokens';

const logger = loggerMock.create();

// ~15k tokens once rendered (4 chars per token)
const BIG = 60_000;

const call = (
  id: string,
  size = 10,
  params: Record<string, unknown> = { q: id }
): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'my.tool',
  tool_call_group_id: `g-${id}`,
  params,
  results: [
    { type: ToolResultType.other, tool_result_id: `r-${id}`, data: { v: 'x'.repeat(size) } },
  ],
  progression: [],
});

const conversationOf = (timeline: ProcessedTimelineEvent[]): ProcessedConversation => ({
  timeline,
  nextInput: { message: 'CURRENT_REQUEST', attachments: [] },
  attachmentTypes: [],
  attachmentStateManager: {} as ProcessedConversation['attachmentStateManager'],
});

/** Rounds `A`, `B`, `C`, one big tool call each. */
const bigHistory = () =>
  conversationOf(
    timelineFromRounds(
      ['A', 'B', 'C'].map((id) => ({
        id,
        input: { message: `hello ${id}`, attachments: [] },
        steps: [call(id.toLowerCase(), BIG)],
        response: { message: `answer ${id}` },
      }))
    )
  );

const renderStateOf = (
  steps: ToolCallStep[],
  kinds: Record<string, 'server' | 'browser'> = {}
): ToolRenderStateMap =>
  Object.fromEntries(
    steps.map((step, index) => [
      step.tool_call_id,
      {
        toolName: 'my_tool',
        kind: kinds[step.tool_call_id] ?? 'server',
        cycle: index + 1,
        content: JSON.stringify({ results: step.results }),
      },
    ])
  );

const run = (
  steps: ToolCallStep[],
  {
    compactionSummary,
    kinds,
  }: { compactionSummary?: CompactionSummary; kinds?: Record<string, 'server' | 'browser'> } = {}
): CurrentRun => ({
  steps,
  cycleLimit: 30,
  renderState: renderStateOf(steps, kinds),
  pendingToolCallIds: [],
  retryNotices: [],
  compactionSummary,
});

const llmOutput = (discussion = 'LLM_SUMMARY'): LlmCompactionOutput => ({
  discussion_summary: discussion,
  user_intent: 'intent',
  key_topics: [],
  entities: [],
  outcomes_and_decisions: [],
  unanswered_questions: [],
});

const structuredData = (
  overrides: Partial<CompactionStructuredData> = {}
): CompactionStructuredData => ({
  ...llmOutput('PRIOR_SUMMARY'),
  tool_calls_summary: [],
  agent_actions: [],
  ...overrides,
});

const setup = ({ historyBudget = 1_000_000 }: { historyBudget?: number } = {}) => {
  const invoke = jest.fn().mockResolvedValue(llmOutput());
  const chatModel = {
    withStructuredOutput: jest.fn(() => ({ invoke })),
  } as unknown as InferenceChatModel;
  const deps: CompactContextDeps = {
    chatModel,
    budget: { totalBudget: historyBudget * 2, historyBudget },
    resultStore: createToolResultStoreMock(),
    resultTransformer: async (toolCall) => toolCall.results,
    logger,
  };
  return { invoke, deps };
};

const requestText = (invoke: jest.Mock, index: number) =>
  JSON.stringify((invoke.mock.calls[index][0] as BaseMessage[]).map((m) => m.content));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('extractProgrammaticSummary', () => {
  it('lists every tool call with a params summary and an agent action', () => {
    const result = extractProgrammaticSummary([
      call('a', 1, { indices: ['test-index'], query: 'FROM test-index' }),
      call('b', 1, { n: 1 }),
    ]);
    expect(result.tool_calls_summary).toEqual([
      { tool_id: 'my.tool', params_summary: 'indices=[test-index], query=FROM test-index' },
      { tool_id: 'my.tool', params_summary: 'n=1' },
    ]);
    expect(result.agent_actions[0]).toBe(
      'Called my.tool(indices=[test-index], query=FROM test-index)'
    );
    expect(result).not.toHaveProperty('entities');
  });

  it('returns empty lists without tool calls', () => {
    expect(extractProgrammaticSummary([])).toEqual({ tool_calls_summary: [], agent_actions: [] });
  });

  it('truncates long params summaries', () => {
    const result = extractProgrammaticSummary([call('a', 1, { query: 'x'.repeat(200) })]);
    expect(result.tool_calls_summary[0].params_summary.length).toBeLessThanOrEqual(121);
  });
});

describe('serializeCompactionSummary', () => {
  it('serializes structured data into readable text', () => {
    const result = serializeCompactionSummary({
      discussion_summary: 'User investigated slow queries.',
      user_intent: 'Debug query performance',
      key_topics: ['performance', 'queries'],
      outcomes_and_decisions: ['Root cause was missing mappings'],
      agent_actions: ['Called search(index=orders)'],
      entities: [{ type: 'index', name: 'orders' }],
      unanswered_questions: ['How to optimize further?'],
      tool_calls_summary: [{ tool_id: 'search', params_summary: 'index=orders' }],
    });

    expect(result).toContain('Conversation Summary');
    expect(result).toContain('Debug query performance');
    expect(result).toContain('performance, queries');
    expect(result).toContain('[search]');
    expect(result).toContain('How to optimize further?');
  });

  it('omits empty sections', () => {
    const result = serializeCompactionSummary(structuredData());
    expect(result).not.toContain('Key Topics');
    expect(result).not.toContain('Entities');
    expect(result).not.toContain('Tool Call History');
  });
});

describe('compactContext', () => {
  it('does nothing when only the current cycle is visible', async () => {
    const { invoke, deps } = setup();
    const result = await compactContext(
      { conversation: conversationOf([]), run: run([call('x1', BIG * 4)]), tailCapTokens: 1 },
      deps
    );
    expect(result).toBeUndefined();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('calls onStart once it covers something, never on a no-op', async () => {
    const { deps } = setup();
    const onStart = jest.fn();
    await compactContext(
      { conversation: conversationOf([]), run: run([call('x1')]), tailCapTokens: 1, onStart },
      deps
    );
    expect(onStart).not.toHaveBeenCalled();

    await compactContext(
      { conversation: bigHistory(), run: run([call('x1')]), tailCapTokens: 20_000, onStart },
      deps
    );
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('does nothing below the token floor', async () => {
    const { invoke, deps } = setup();
    const result = await compactContext(
      {
        conversation: conversationOf(
          timelineFromRounds([{ id: 'A', input: { message: 'hi', attachments: [] } }])
        ),
        run: run([call('x1')]),
        tailCapTokens: 0,
      },
      deps
    );
    expect(result).toBeUndefined();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('covers the history cycles beyond the tail cap and keeps the current cycle', async () => {
    const { invoke, deps } = setup();
    const result = await compactContext(
      { conversation: bigHistory(), run: run([call('x1')]), tailCapTokens: 20_000 },
      deps
    );

    expect(result?.summary).toMatchObject({
      summarized_up_to: { tool_call_id: 'b' },
      covered_round_ids: ['A', 'B'],
      summarized_round_count: 2,
      structured_data: expect.objectContaining({
        discussion_summary: 'LLM_SUMMARY',
        tool_calls_summary: [
          { tool_id: 'my.tool', params_summary: 'q=a' },
          { tool_id: 'my.tool', params_summary: 'q=b' },
        ],
      }),
    });
    expect(result?.summarizedCycleCount).toBe(2);
    expect(result?.tokensAfter).toBeLessThan(result?.tokensBefore ?? 0);

    expect(invoke).toHaveBeenCalledTimes(1);
    const request = requestText(invoke, 0);
    expect(request).toContain('hello A');
    expect(request).toContain('hello B');
    expect(request).not.toContain('hello C');
    expect(request).toContain('CURRENT_REQUEST');
  });

  it('covers cycles of the current run, anchored on their last call', async () => {
    const { deps } = setup();
    const steps = ['x1', 'x2', 'x3', 'x4'].map((id) => call(id, BIG));
    const result = await compactContext(
      { conversation: conversationOf([]), run: run(steps), tailCapTokens: 20_000 },
      deps
    );

    expect(result?.summary.summarized_up_to).toEqual({ tool_call_id: 'x2' });
    expect(result?.summary.covered_round_ids).toEqual([]);
    expect(result?.summarizedCycleCount).toBe(2);
  });

  it('stops the covered range at the last cycle with a persisted anchor', async () => {
    const { invoke, deps } = setup();
    const steps = ['x1', 'x2', 'x3', 'x4'].map((id) => call(id, BIG));
    const result = await compactContext(
      {
        conversation: conversationOf([]),
        run: run(steps, { kinds: { x2: 'browser' } }),
        tailCapTokens: 20_000,
      },
      deps
    );

    expect(result?.summary.summarized_up_to).toEqual({ tool_call_id: 'x1' });
    expect(result?.summarizedCycleCount).toBe(1);
    expect(requestText(invoke, 0)).not.toContain('"x2"');
  });

  it('builds on the existing summary: only the visible cycles are sent and tool calls accumulate', async () => {
    const { invoke, deps } = setup();
    const existing: CompactionSummary = {
      summarized_up_to: { tool_call_id: 'a' },
      summarized_round_count: 1,
      covered_round_ids: ['A'],
      created_at: '2026-01-01T00:00:00.000Z',
      token_count: 10,
      structured_data: structuredData({
        tool_calls_summary: [{ tool_id: 'my.tool', params_summary: 'q=a' }],
        agent_actions: ['Called my.tool(q=a)'],
      }),
    };
    const result = await compactContext(
      {
        conversation: bigHistory(),
        run: run([call('x1')], { compactionSummary: existing }),
        tailCapTokens: 20_000,
      },
      deps
    );

    const request = requestText(invoke, 0);
    expect(request).toContain('PRIOR_SUMMARY');
    expect(request).not.toContain('hello A');
    expect(request).toContain('hello B');
    expect(result?.summary).toMatchObject({
      summarized_up_to: { tool_call_id: 'b' },
      covered_round_ids: ['A', 'B'],
    });
    expect(result?.summary.structured_data.tool_calls_summary).toEqual([
      { tool_id: 'my.tool', params_summary: 'q=a' },
      { tool_id: 'my.tool', params_summary: 'q=b' },
    ]);
    expect(result?.summary.structured_data.agent_actions).toEqual([
      'Called my.tool(q=a)',
      'Called my.tool(q=b)',
    ]);
  });

  it('chunks the covered cycles on the history budget, each request building on the previous output', async () => {
    const { invoke, deps } = setup({ historyBudget: 20_000 });
    invoke.mockResolvedValueOnce(llmOutput('FIRST_CHUNK')).mockResolvedValueOnce(llmOutput());
    const result = await compactContext(
      { conversation: bigHistory(), run: run([call('x1')]), tailCapTokens: 20_000 },
      deps
    );

    expect(invoke).toHaveBeenCalledTimes(2);
    const first = requestText(invoke, 0);
    expect(first).toContain('hello A');
    expect(first).not.toContain('hello B');
    const second = requestText(invoke, 1);
    expect(second).toContain('FIRST_CHUNK');
    expect(second).toContain('hello B');
    expect(second).not.toContain('hello A');
    for (const [messages] of invoke.mock.calls) {
      expect(estimateMessagesTokens(messages)).toBeLessThanOrEqual(20_000);
    }
    expect(result?.summary.structured_data.discussion_summary).toBe('LLM_SUMMARY');
  });

  it('still sends a cycle that does not fit the budget alone, with a warning', async () => {
    const { invoke, deps } = setup({ historyBudget: 5_000 });
    const result = await compactContext(
      { conversation: bigHistory(), run: run([call('x1')]), tailCapTokens: 20_000 },
      deps
    );

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('exceeds the history budget'));
    expect(result?.summary.covered_round_ids).toEqual(['A', 'B']);
  });

  it('covers the last history cycle at round start when the run has no step yet', async () => {
    const { deps } = setup();
    const conversation = conversationOf(
      timelineFromRounds([
        {
          id: 'A',
          input: { message: 'hello A', attachments: [] },
          steps: [call('a', BIG * 2)],
          response: { message: 'answer A' },
        },
      ])
    );
    const result = await compactContext(
      { conversation, run: run([]), tailCapTokens: 20_000 },
      deps
    );

    expect(result?.summary).toMatchObject({
      summarized_up_to: { tool_call_id: 'a' },
      covered_round_ids: ['A'],
    });
    expect(result?.summarizedCycleCount).toBe(1);
  });

  it('retries a failed summarizer request once', async () => {
    const { invoke, deps } = setup();
    invoke.mockRejectedValueOnce(new Error('bad json')).mockResolvedValueOnce(llmOutput('RETRIED'));
    const result = await compactContext(
      { conversation: bigHistory(), run: run([call('x1')]), tailCapTokens: 20_000 },
      deps
    );

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('bad json'));
    expect(result?.summary.structured_data.discussion_summary).toBe('RETRIED');
  });

  it('falls back to the programmatic summary when the summarizer keeps failing', async () => {
    const { invoke, deps } = setup();
    invoke.mockRejectedValue(new Error('llm down'));
    const result = await compactContext(
      { conversation: bigHistory(), run: run([call('x1')]), tailCapTokens: 20_000 },
      deps
    );

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('llm down'));
    expect(result?.summary).toMatchObject({
      summarized_up_to: { tool_call_id: 'b' },
      covered_round_ids: ['A', 'B'],
      structured_data: expect.objectContaining({
        user_intent: 'CURRENT_REQUEST',
        tool_calls_summary: [
          { tool_id: 'my.tool', params_summary: 'q=a' },
          { tool_id: 'my.tool', params_summary: 'q=b' },
        ],
      }),
    });
    expect(result?.tokensAfter).toBeLessThan(result?.tokensBefore ?? 0);
  });

  it('keeps the semantic fields of the existing summary in the fallback', async () => {
    const { invoke, deps } = setup();
    invoke.mockRejectedValue(new Error('llm down'));
    const existing: CompactionSummary = {
      summarized_up_to: { tool_call_id: 'a' },
      summarized_round_count: 1,
      covered_round_ids: ['A'],
      created_at: '2026-01-01T00:00:00.000Z',
      token_count: 10,
      structured_data: structuredData({
        tool_calls_summary: [{ tool_id: 'my.tool', params_summary: 'q=a' }],
      }),
    };
    const result = await compactContext(
      {
        conversation: bigHistory(),
        run: run([call('x1')], { compactionSummary: existing }),
        tailCapTokens: 20_000,
      },
      deps
    );

    expect(result?.summary.structured_data).toMatchObject({
      discussion_summary: 'PRIOR_SUMMARY',
      tool_calls_summary: [
        { tool_id: 'my.tool', params_summary: 'q=a' },
        { tool_id: 'my.tool', params_summary: 'q=b' },
      ],
    });
    expect(result?.summary.covered_round_ids).toEqual(['A', 'B']);
  });

  it('returns nothing when the run is aborted during summarization', async () => {
    const { invoke, deps } = setup();
    const controller = new AbortController();
    invoke.mockImplementation(async () => {
      controller.abort();
      throw new Error('aborted');
    });
    const result = await compactContext(
      { conversation: bigHistory(), run: run([call('x1')]), tailCapTokens: 20_000 },
      { ...deps, abortSignal: controller.signal }
    );

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });
});
