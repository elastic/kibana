/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ToolResult } from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolResultType,
} from '@kbn/agent-builder-common';
import type { ToolManager, ToolResultStore } from '@kbn/agent-builder-server/runner';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  timelineFromRounds,
  type ProcessedConversationRound,
} from '../../../../test_utils/timeline';
import { executeToolAction, toolCallAction, type ResearchAgentAction } from '../actions';
import type { ProcessedConversation } from './prepare_conversation';
import { groupTimelineCycles } from './context_timeline';
import {
  compactContext,
  extractProgrammaticSummary,
  type CompactContextDeps,
} from './conversation_compactor';

const mockLogger: Logger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const structured = {
  discussion_summary: 'Previous summary',
  user_intent: 'Test',
  key_topics: [],
  outcomes_and_decisions: [],
  agent_actions: [],
  entities: [],
  unanswered_questions: [],
  tool_calls_summary: [],
};

const results = (id: string, chars: number): ToolResult[] => [
  { type: ToolResultType.other, tool_result_id: `${id}-r`, data: { value: 'x'.repeat(chars) } },
];

/** A round with `cycles` tool calls, each in its own group, each result `resultChars` long. */
const createMockRound = (
  id: string,
  cycles: number,
  resultChars: number
): ProcessedConversationRound => ({
  id,
  status: ConversationRoundStatus.completed,
  input: { message: `User message ${id}`, attachments: [] },
  steps: Array.from({ length: cycles }, (_, i) => ({
    type: ConversationRoundStepType.toolCall as const,
    tool_call_id: `${id}-tc-${i}`,
    tool_id: `tool-${i}`,
    params: { indices: ['test-index'], query: 'FROM test-index | LIMIT 10' },
    results: results(`${id}-tc-${i}`, resultChars),
    progression: [],
    tool_call_group_id: `${id}-g-${i}`,
  })),
  response: { message: `Assistant response ${id}` },
  started_at: new Date().toISOString(),
  time_to_first_token: 100,
  time_to_last_token: 200,
  model_usage: { llm_calls: 1, input_tokens: 100, output_tokens: 50, connector_id: 'c' },
});

const createMockConversation = (rounds: ProcessedConversationRound[]): ProcessedConversation => ({
  timeline: timelineFromRounds(rounds),
  nextInput: { message: 'current question', attachments: [] },
  attachmentTypes: [],
  attachmentStateManager: createAttachmentStateManager([], {
    getTypeDefinition: () => undefined,
  } as any),
});

/** `count` in-flight [toolCall, executeTool] pairs, each result `resultChars` long. */
const inFlightCycles = (count: number, resultChars: number): ResearchAgentAction[] =>
  Array.from({ length: count }, (_, i) => {
    const id = `c${i}`;
    return [
      toolCallAction({ toolCalls: [{ toolCallId: id, toolName: 'search', args: {} }], cycle: i }),
      executeToolAction({
        toolResults: [
          {
            toolCallId: id,
            content: JSON.stringify({ results: results(id, resultChars) }),
            artifact: { results: results(id, resultChars) },
          },
        ],
        cycle: i,
      }),
    ];
  }).flat();

const createMockChatModel = (invoke = jest.fn()) => {
  invoke.mockResolvedValue({
    discussion_summary: 'Test conversation summary',
    user_intent: 'Investigate test data',
    key_topics: ['testing', 'data'],
    entities: [{ type: 'index', name: 'test-index' }],
    outcomes_and_decisions: ['Decided to use approach A'],
    unanswered_questions: [],
  });
  return { withStructuredOutput: jest.fn().mockReturnValue({ invoke }) } as any;
};

const deps = (chatModel = createMockChatModel()): CompactContextDeps => ({
  chatModel,
  resultStore: { getEntryByResultId: jest.fn(async () => undefined) } as unknown as ToolResultStore,
  toolManager: {
    getToolIdMapping: () => new Map([['search', 'platform.search']]),
  } as unknown as ToolManager,
  resultTransformer: async (tc) => tc.results,
  logger: mockLogger,
});

// ~12k tokens per cycle (4 chars/token)
const BIG = 48_000;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('extractProgrammaticSummary', () => {
  it('extracts tool calls and agent actions from the covered tool calls', () => {
    const result = extractProgrammaticSummary([
      { tool_call_id: 'a', tool_id: 'tool-0', params: { indices: ['test-index'] }, results: [] },
      { tool_call_id: 'b', tool_id: 'tool-1', params: {}, results: [] },
    ]);

    expect(result.tool_calls_summary).toHaveLength(2);
    expect(result.tool_calls_summary[0]).toEqual({
      tool_id: 'tool-0',
      params_summary: 'indices=[test-index]',
    });
    expect(result.agent_actions[0]).toBe('Called tool-0(indices=[test-index])');
    expect(result).not.toHaveProperty('entities');
  });
});

describe('compactContext', () => {
  it('preserves the current cycle and walks back under the hard cap, covering the rest', async () => {
    const conversation = createMockConversation([createMockRound('r1', 6, BIG)]);
    const cycles = groupTimelineCycles(conversation.timeline);

    const result = (await compactContext(
      { conversation, actions: [], cycleLimit: 10, tailCapTokens: 40_000 },
      deps()
    ))!;

    // current (6th) + 3 x 12k preserved; cycles 1-2 covered
    expect(result.summarizedCycleCount).toBe(2);
    expect(result.coverage).toEqual({ eventId: cycles[1].lastEventId });
    expect(result.tokensBefore).toBeGreaterThan(result.tokensAfter);
    expect(result.summary.structured_data.tool_calls_summary.map((tc) => tc.tool_id)).toEqual([
      'tool-0',
      'tool-1',
    ]);
    expect(result.summary.structured_data.discussion_summary).toBe('Test conversation summary');
  });

  it('excludes a single cycle larger than the cap from the tail and covers it', async () => {
    const conversation = createMockConversation([
      createMockRound('r1', 1, 180_000), // ~45k
      createMockRound('r2', 2, 20_000), // ~5k each
    ]);
    const cycles = groupTimelineCycles(conversation.timeline);

    const result = (await compactContext(
      { conversation, actions: [], cycleLimit: 10, tailCapTokens: 40_000 },
      deps()
    ))!;

    expect(result.summarizedCycleCount).toBe(1);
    expect(result.coverage).toEqual({ eventId: cycles[0].lastEventId });
  });

  it('keeps everything when the visible context is under the floor', async () => {
    const conversation = createMockConversation([createMockRound('r1', 2, 200)]);

    expect(
      await compactContext(
        { conversation, actions: [], cycleLimit: 10, tailCapTokens: 40_000 },
        deps()
      )
    ).toBeUndefined();
  });

  it('returns undefined when only the current cycle is visible', async () => {
    const conversation = createMockConversation([createMockRound('r1', 1, BIG)]);

    expect(
      await compactContext(
        { conversation, actions: [], cycleLimit: 10, tailCapTokens: 40_000 },
        deps()
      )
    ).toBeUndefined();
  });

  it('covers in-flight actions with an actionIndex cursor when the tail lands mid-round', async () => {
    const actions = inFlightCycles(6, BIG);

    const result = (await compactContext(
      { conversation: createMockConversation([]), actions, cycleLimit: 10, tailCapTokens: 40_000 },
      deps()
    ))!;

    // cycles 0 and 1 covered -> last covered action is the executeTool of cycle 1 (index 3)
    expect(result.summarizedCycleCount).toBe(2);
    expect(result.coverage).toEqual({ actionIndex: 3 });
    expect(result.summary.structured_data.tool_calls_summary.map((tc) => tc.tool_id)).toEqual([
      'platform.search',
      'platform.search',
    ]);
  });

  it('spans previous rounds and in-flight actions, cursoring on the in-flight side', async () => {
    const conversation = createMockConversation([createMockRound('r1', 1, BIG)]);
    const actions = inFlightCycles(4, BIG);

    const result = (await compactContext(
      { conversation, actions, cycleLimit: 10, tailCapTokens: 40_000 },
      deps()
    ))!;

    // units: r1 (12k), c0..c3 (12k each) -> current c3 + c2, c1, c0 preserved (36k); r1 covered
    expect(result.summarizedCycleCount).toBe(1);
    expect(result.coverage).toEqual({
      eventId: groupTimelineCycles(conversation.timeline)[0].lastEventId,
    });
  });

  it('only summarizes beyond the existing coverage and feeds the existing summary plus the user message to the LLM', async () => {
    const invoke = jest.fn();
    const chatModel = createMockChatModel(invoke);
    const conversation = createMockConversation([createMockRound('r1', 4, BIG)]);
    const cycles = groupTimelineCycles(conversation.timeline);

    const result = (await compactContext(
      {
        conversation,
        actions: [],
        cycleLimit: 10,
        tailCapTokens: 20_000,
        existingSummary: { created_at: 't', token_count: 100, structured_data: structured },
        existingCoverage: { eventId: cycles[0].lastEventId },
      },
      deps(chatModel)
    ))!;

    // visible: cycles 1..3 -> current 3 + 2 preserved (12k < 20k); cycle 1 covered
    expect(result.summarizedCycleCount).toBe(1);
    expect(result.coverage).toEqual({ eventId: cycles[1].lastEventId });

    const sent = JSON.stringify(invoke.mock.calls[0][0]);
    expect(sent).toContain('Previous conversation context was compacted');
    expect(sent).toContain('Previous summary');
    expect(sent).toContain('current question');
    expect(sent).toContain('r1-tc-1');
    expect(sent).not.toContain('r1-tc-0');
  });

  it('returns undefined and logs when the summarizer fails', async () => {
    const chatModel = {
      withStructuredOutput: () => ({ invoke: jest.fn().mockRejectedValue(new Error('boom')) }),
    } as any;
    const conversation = createMockConversation([createMockRound('r1', 6, BIG)]);

    expect(
      await compactContext(
        { conversation, actions: [], cycleLimit: 10, tailCapTokens: 40_000 },
        deps(chatModel)
      )
    ).toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
