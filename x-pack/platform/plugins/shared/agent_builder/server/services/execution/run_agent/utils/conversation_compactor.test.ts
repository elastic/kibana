/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import {
  ChatEventType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  TimelineEventType,
  ToolResultType,
} from '@kbn/agent-builder-common';
import type {
  CompactionStructuredData,
  CompactionSummary,
  TimelineEvent,
  ToolCallStep,
} from '@kbn/agent-builder-common';
import type { AgentEventEmitterFn } from '@kbn/agent-builder-server';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { ProcessedConversation } from './prepare_conversation';
import {
  abortedExec0Timeline,
  failedExec0Timeline,
  roundsOfTimeline,
  timelineFromRounds,
  type ProcessedConversationRound,
} from '../../../../test_utils/timeline';
import type { ContextBudget } from './context_budget';
import {
  compactConversation,
  extractProgrammaticSummary,
  type CompactConversationOptions,
} from './conversation_compactor';
import {
  groupTimelineRounds,
  type ProcessedTimelineEvent,
  type TimelineRound,
} from './context_timeline';
import { serializeCompactionSummary } from './compaction_serialize';
import { COMPACTION_SYSTEM_PROMPT, type LlmCompactionOutput } from './compaction_schema';
import { legacyEligibleRoundIds } from './compaction_coverage';
import { estimateMessagesTokens } from './estimate_conversation_tokens';
import { prepareMessages } from './to_langchain_messages';
import type { ToolCallResultTransformer } from './tool_summarization';

const mockLogger = loggerMock.create();

const identity: ToolCallResultTransformer = async (call) => call.results;

const createMockRound = (
  id: string,
  messageLength: number = 100,
  toolResults: number = 0
): ProcessedConversationRound => {
  const steps = Array.from({ length: toolResults }, (_, i) => ({
    type: ConversationRoundStepType.toolCall as const,
    tool_call_id: `${id}-tc-${i}`,
    tool_id: `tool-${i}`,
    params: { indices: ['test-index'], query: 'FROM test-index | LIMIT 10' },
    results: [
      {
        type: 'other' as const,
        tool_result_id: `result-${i}`,
        data: { value: 'x'.repeat(200) },
      },
    ],
    progression: [],
  }));

  return {
    id,
    status: ConversationRoundStatus.completed,
    input: {
      message: `User message ${id}: ${'x'.repeat(messageLength)}`,
      attachments: [],
    },
    steps,
    response: { message: `Assistant response ${id}: ${'y'.repeat(messageLength)}` },
    started_at: new Date().toISOString(),
    time_to_first_token: 100,
    time_to_last_token: 200,
    model_usage: {
      llm_calls: 1,
      input_tokens: 100,
      output_tokens: 50,
      connector_id: 'test-connector',
    },
  };
};

const createMockConversation = (rounds: ProcessedConversationRound[]): ProcessedConversation => ({
  timeline: timelineFromRounds(rounds),
  nextInput: { message: 'current question', attachments: [] },
  attachmentTypes: [],
  attachmentStateManager: createAttachmentStateManager([], {
    getTypeDefinition: () => undefined,
  } as any),
});

const conversationOf = (timeline: ProcessedTimelineEvent[]): ProcessedConversation => ({
  ...createMockConversation([]),
  timeline,
});

const roundIds = (timeline: ProcessedTimelineEvent[]) =>
  groupTimelineRounds(timeline).map((round) => round.id);

// Stand-in for the per-round vector computed upstream by estimatePerRoundTokens.
const countsFor = (conversation: ProcessedConversation): number[] =>
  roundsOfTimeline(conversation.timeline).map((round) => estimateTokens(JSON.stringify(round)));

const at = (minute: number) => `2026-01-01T00:${String(minute).padStart(2, '0')}:00.000Z`;

/** A raw interrupted round processed for the agent (`attachments: []` on the user message). */
const interruptedRound = (
  id: string,
  minute: number,
  interruption: 'failed' | 'aborted',
  messageLength = 10
): ProcessedTimelineEvent[] =>
  (interruption === 'failed'
    ? failedExec0Timeline(id, [], at(minute))
    : abortedExec0Timeline(id, at(minute))
  ).map((event) =>
    event.type === TimelineEventType.userMessage
      ? {
          ...event,
          data: { message: `hello ${id} ${'x'.repeat(messageLength)}`, attachments: [] },
        }
      : event
  ) as ProcessedTimelineEvent[];

const roundAt = (id: string, minute: number, messageLength = 10, toolResults = 0) => ({
  ...createMockRound(id, messageLength, toolResults),
  started_at: at(minute),
});

const defaultLlmOutput: LlmCompactionOutput = {
  discussion_summary: 'Test conversation summary',
  user_intent: 'Investigate test data',
  key_topics: ['testing', 'data'],
  entities: [{ type: 'index', name: 'test-index' }],
  outcomes_and_decisions: ['Decided to use approach A'],
  unanswered_questions: [],
};

const structuredData = (
  overrides: Partial<CompactionStructuredData> = {}
): CompactionStructuredData => ({
  ...defaultLlmOutput,
  tool_calls_summary: [],
  agent_actions: [],
  ...overrides,
});

const summary = (parts: Partial<CompactionSummary>): CompactionSummary => ({
  summarized_round_count: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  token_count: 10,
  structured_data: structuredData(),
  ...parts,
});

const createMockChatModel = () =>
  ({
    withStructuredOutput: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue(defaultLlmOutput),
    }),
  } as unknown as InferenceChatModel & {
    withStructuredOutput: jest.Mock;
  });

/**
 * Fills in the options every call needs with what production passes: the identity result
 * transformer and the legacy-eligible ids of the conversation's own events.
 */
const compact = (
  options: Omit<CompactConversationOptions, 'resultTransformer' | 'legacyEligibleRoundIds'> &
    Partial<Pick<CompactConversationOptions, 'resultTransformer' | 'legacyEligibleRoundIds'>>
) =>
  compactConversation({
    resultTransformer: identity,
    legacyEligibleRoundIds: legacyEligibleRoundIds(
      options.processedConversation.timeline as TimelineEvent[]
    ),
    ...options,
  });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('extractProgrammaticSummary', () => {
  it('should extract tool calls from round steps', () => {
    const rounds = [createMockRound('r1', 50, 2), createMockRound('r2', 50, 1)];
    const result = extractProgrammaticSummary(rounds);

    expect(result.tool_calls_summary).toHaveLength(3);
    expect(result.tool_calls_summary[0].tool_id).toBe('tool-0');
    expect(result.tool_calls_summary[0].params_summary).toContain('test-index');
  });

  it('should not extract entities (delegated to LLM)', () => {
    const rounds = [createMockRound('r1', 50, 1)];
    const result = extractProgrammaticSummary(rounds);

    expect(result).not.toHaveProperty('entities');
  });

  it('should generate agent_actions for each tool call', () => {
    const rounds = [createMockRound('r1', 50, 2)];
    const result = extractProgrammaticSummary(rounds);

    expect(result.agent_actions).toHaveLength(2);
    expect(result.agent_actions[0]).toContain('Called tool-0');
  });

  it('should handle rounds with no tool calls', () => {
    const rounds = [createMockRound('r1', 50, 0)];
    const result = extractProgrammaticSummary(rounds);

    expect(result.tool_calls_summary).toHaveLength(0);
    expect(result.agent_actions).toHaveLength(0);
  });

  it('should truncate long params summaries', () => {
    const round: ProcessedConversationRound = {
      ...createMockRound('r1', 50, 0),
      steps: [
        {
          type: ConversationRoundStepType.toolCall as const,
          tool_call_id: 'tc-long',
          tool_id: 'search',
          params: { query: 'x'.repeat(200) },
          results: [],
          progression: [],
        },
      ],
    };

    const result = extractProgrammaticSummary([round]);

    expect(result.tool_calls_summary[0].params_summary.length).toBeLessThanOrEqual(121);
  });
});

describe('serializeCompactionSummary', () => {
  it('should serialize structured data into readable text', () => {
    const data: CompactionStructuredData = {
      discussion_summary: 'User investigated slow queries.',
      user_intent: 'Debug query performance',
      key_topics: ['performance', 'queries'],
      outcomes_and_decisions: ['Root cause was missing mappings'],
      agent_actions: ['Called search(index=orders)'],
      entities: [{ type: 'index', name: 'orders' }],
      unanswered_questions: ['How to optimize further?'],
      tool_calls_summary: [{ tool_id: 'search', params_summary: 'index=orders' }],
    };

    const result = serializeCompactionSummary(data);

    expect(result).toContain('Conversation Summary');
    expect(result).toContain('Debug query performance');
    expect(result).toContain('User investigated slow queries');
    expect(result).toContain('performance, queries');
    expect(result).toContain('orders');
    expect(result).toContain('[search]');
    expect(result).toContain('How to optimize further?');
  });

  it('should omit empty sections', () => {
    const data: CompactionStructuredData = {
      discussion_summary: 'Brief summary',
      user_intent: 'Test intent',
      key_topics: [],
      outcomes_and_decisions: [],
      agent_actions: [],
      entities: [],
      unanswered_questions: [],
      tool_calls_summary: [],
    };

    const result = serializeCompactionSummary(data);

    expect(result).not.toContain('Key Topics');
    expect(result).not.toContain('Entities');
    expect(result).not.toContain('Tool Call History');
  });
});

describe('compactConversation', () => {
  it('should not compact when under threshold', async () => {
    const rounds = [createMockRound('r1', 50), createMockRound('r2', 50)];
    const conversation = createMockConversation(rounds);

    const budget: ContextBudget = {
      totalBudget: 128000,
      historyBudget: 96000,
      triggerThreshold: 72000,
    };

    const result = await compact({
      processedConversation: conversation,
      perRoundTokenCounts: countsFor(conversation),
      chatModel: createMockChatModel(),
      contextBudget: budget,
      logger: mockLogger,
    });

    expect(result.compactionTriggered).toBe(false);
    expect(result.summary).toBeUndefined();
    expect(roundsOfTimeline(result.processedConversation.timeline)).toHaveLength(2);
  });

  it('should trigger LLM summarization when over threshold', async () => {
    const rounds = [
      createMockRound('r1', 2000, 3),
      createMockRound('r2', 2000, 3),
      createMockRound('r3', 2000, 3),
      createMockRound('r4', 200),
      createMockRound('r5', 200),
    ];
    const conversation = createMockConversation(rounds);

    const budget: ContextBudget = {
      totalBudget: 500,
      historyBudget: 375,
      triggerThreshold: 100,
    };

    const chatModel = createMockChatModel();
    const result = await compact({
      processedConversation: conversation,
      perRoundTokenCounts: countsFor(conversation),
      chatModel,
      contextBudget: budget,
      logger: mockLogger,
    });

    expect(result.compactionTriggered).toBe(true);
    expect(chatModel.withStructuredOutput).toHaveBeenCalled();
  });

  it('should merge programmatic and LLM fields in the summary', async () => {
    const rounds = [
      createMockRound('r1', 2000, 2),
      createMockRound('r2', 2000, 1),
      createMockRound('recent-1', 200),
      createMockRound('recent-2', 200),
    ];
    const conversation = createMockConversation(rounds);

    const budget: ContextBudget = {
      totalBudget: 500,
      historyBudget: 375,
      triggerThreshold: 100,
    };

    const result = await compact({
      processedConversation: conversation,
      perRoundTokenCounts: countsFor(conversation),
      chatModel: createMockChatModel(),
      contextBudget: budget,
      logger: mockLogger,
    });

    expect(result.compactionTriggered).toBe(true);
    expect(result.summary).toBeDefined();

    const { structured_data: data } = result.summary!;

    // LLM-generated fields
    expect(data.discussion_summary).toBe('Test conversation summary');
    expect(data.user_intent).toBe('Investigate test data');

    // LLM-extracted entities
    expect(data.entities.length).toBeGreaterThan(0);
    expect(data.entities[0]).toEqual({ type: 'index', name: 'test-index' });

    // Programmatically extracted fields
    expect(data.tool_calls_summary.length).toBeGreaterThan(0);
    expect(data.tool_calls_summary[0].tool_id).toBe('tool-0');
    expect(data.agent_actions.length).toBeGreaterThan(0);

    // The new summary records what it covers
    expect(result.summary?.covered_round_ids).toEqual(['r1', 'r2']);
  });

  it('should reuse existing summary without triggering new compaction when effective tokens are under threshold', async () => {
    const rounds = [
      createMockRound('r1', 50),
      createMockRound('r2', 50),
      createMockRound('r3', 50),
    ];
    const conversation = createMockConversation(rounds);

    const existingSummary = summary({
      summarized_round_count: 1,
      token_count: 100,
      structured_data: structuredData({
        discussion_summary: 'Previous summary',
        user_intent: 'Test',
      }),
    });

    // Threshold high enough that summary (100) + non-summarized rounds fit
    const budget: ContextBudget = {
      totalBudget: 50000,
      historyBudget: 37500,
      triggerThreshold: 5000,
    };

    const result = await compact({
      processedConversation: conversation,
      perRoundTokenCounts: countsFor(conversation),
      chatModel: createMockChatModel(),
      contextBudget: budget,
      existingSummary,
      logger: mockLogger,
    });

    // Existing summary is applied but no new compaction event fires
    expect(result.compactionTriggered).toBe(false);
    expect(result.summary).toBe(existingSummary);
    // Round r1 was summarized, only r2 and r3 remain
    expect(roundsOfTimeline(result.processedConversation.timeline)).toHaveLength(2);
  });

  it('should regenerate summary when effective tokens exceed threshold despite existing summary', async () => {
    const rounds = [
      createMockRound('r1', 2000, 2),
      createMockRound('r2', 2000, 2),
      createMockRound('r3', 2000, 2),
      createMockRound('r4', 2000, 2),
      createMockRound('recent-1', 200),
      createMockRound('recent-2', 200),
    ];
    const conversation = createMockConversation(rounds);

    // Stale summary that only covered the first round
    const existingSummary = summary({
      summarized_round_count: 1,
      token_count: 100,
      structured_data: structuredData({
        discussion_summary: 'Old summary',
        user_intent: 'Old intent',
      }),
    });

    // Threshold low enough that the non-summarized rounds still exceed it
    const budget: ContextBudget = {
      totalBudget: 500,
      historyBudget: 375,
      triggerThreshold: 100,
    };

    const chatModel = createMockChatModel();
    const result = await compact({
      processedConversation: conversation,
      perRoundTokenCounts: countsFor(conversation),
      chatModel,
      contextBudget: budget,
      existingSummary,
      logger: mockLogger,
    });

    expect(result.compactionTriggered).toBe(true);
    // New summary should have been generated (not the old one)
    expect(result.summary).not.toBe(existingSummary);
    expect(chatModel.withStructuredOutput).toHaveBeenCalled();
  });

  it('should preserve the most recent rounds during compaction', async () => {
    const rounds = [
      createMockRound('old-1', 2000, 5),
      createMockRound('old-2', 2000, 5),
      createMockRound('recent-1', 200),
      createMockRound('recent-2', 200),
    ];
    const conversation = createMockConversation(rounds);

    const budget: ContextBudget = {
      totalBudget: 500,
      historyBudget: 375,
      triggerThreshold: 100,
    };

    const result = await compact({
      processedConversation: conversation,
      perRoundTokenCounts: countsFor(conversation),
      chatModel: createMockChatModel(),
      contextBudget: budget,
      logger: mockLogger,
    });

    expect(result.compactionTriggered).toBe(true);
    const ids = roundsOfTimeline(result.processedConversation.timeline).map((r) => r.id);
    expect(ids).toContain('recent-1');
    expect(ids).toContain('recent-2');
  });

  it('should handle single-round conversations without error', async () => {
    const rounds = [createMockRound('r1', 50)];
    const conversation = createMockConversation(rounds);

    const budget: ContextBudget = {
      totalBudget: 128000,
      historyBudget: 96000,
      triggerThreshold: 72000,
    };

    const result = await compact({
      processedConversation: conversation,
      perRoundTokenCounts: countsFor(conversation),
      chatModel: createMockChatModel(),
      contextBudget: budget,
      logger: mockLogger,
    });

    expect(result.compactionTriggered).toBe(false);
    expect(roundsOfTimeline(result.processedConversation.timeline)).toHaveLength(1);
  });

  it('should handle empty conversations', async () => {
    const conversation = createMockConversation([]);

    const budget: ContextBudget = {
      totalBudget: 128000,
      historyBudget: 96000,
      triggerThreshold: 72000,
    };

    const result = await compact({
      processedConversation: conversation,
      perRoundTokenCounts: countsFor(conversation),
      chatModel: createMockChatModel(),
      contextBudget: budget,
      logger: mockLogger,
    });

    expect(result.compactionTriggered).toBe(false);
    expect(roundsOfTimeline(result.processedConversation.timeline)).toHaveLength(0);
  });

  it('should include token counts when compaction is triggered', async () => {
    const rounds = [
      createMockRound('r1', 2000, 2),
      createMockRound('r2', 2000, 1),
      createMockRound('recent-1', 200),
      createMockRound('recent-2', 200),
    ];
    const conversation = createMockConversation(rounds);

    const budget: ContextBudget = {
      totalBudget: 500,
      historyBudget: 375,
      triggerThreshold: 100,
    };

    const result = await compact({
      processedConversation: conversation,
      perRoundTokenCounts: countsFor(conversation),
      chatModel: createMockChatModel(),
      contextBudget: budget,
      logger: mockLogger,
    });

    expect(result.compactionTriggered).toBe(true);
    expect(result.tokensBefore).toBeGreaterThan(0);
    expect(result.tokensAfter).toBeDefined();
    expect(result.summarizedRoundCount).toBeGreaterThan(0);
  });

  describe('event emission', () => {
    const compactionBudget: ContextBudget = {
      totalBudget: 500,
      historyBudget: 375,
      triggerThreshold: 100,
    };

    const noCompactionBudget: ContextBudget = {
      totalBudget: 128000,
      historyBudget: 96000,
      triggerThreshold: 72000,
    };

    let mockEventEmitter: jest.MockedFunction<AgentEventEmitterFn>;

    beforeEach(() => {
      mockEventEmitter = jest.fn();
    });

    it('should not emit events when compaction is not triggered', async () => {
      // Empty conversation never triggers compaction
      const conversation = createMockConversation([]);

      await compact({
        processedConversation: conversation,
        perRoundTokenCounts: countsFor(conversation),
        chatModel: createMockChatModel(),
        contextBudget: noCompactionBudget,
        logger: mockLogger,
        eventEmitter: mockEventEmitter,
      });

      expect(mockEventEmitter).not.toHaveBeenCalled();
    });

    it('should emit compactionStarted before compactionCompleted when compaction is triggered', async () => {
      const rounds = [
        createMockRound('r1', 2000, 3),
        createMockRound('r2', 2000, 3),
        createMockRound('r3', 2000, 3),
        createMockRound('recent-1', 200),
        createMockRound('recent-2', 200),
      ];
      const conversation = createMockConversation(rounds);

      await compact({
        processedConversation: conversation,
        perRoundTokenCounts: countsFor(conversation),
        chatModel: createMockChatModel(),
        contextBudget: compactionBudget,
        logger: mockLogger,
        eventEmitter: mockEventEmitter,
      });

      expect(mockEventEmitter).toHaveBeenCalledTimes(2);

      const [startedCall, completedCall] = mockEventEmitter.mock.calls;
      expect(startedCall[0].type).toBe(ChatEventType.compactionStarted);
      expect(completedCall[0].type).toBe(ChatEventType.compactionCompleted);

      // Verify ordering via invocation order
      const startedOrder = mockEventEmitter.mock.invocationCallOrder[0];
      const completedOrder = mockEventEmitter.mock.invocationCallOrder[1];
      expect(startedOrder).toBeLessThan(completedOrder);
    });

    it('should emit compactionStarted with correct token_count_before', async () => {
      const rounds = [
        createMockRound('r1', 2000, 2),
        createMockRound('r2', 2000, 1),
        createMockRound('recent-1', 200),
        createMockRound('recent-2', 200),
      ];
      const conversation = createMockConversation(rounds);

      const result = await compact({
        processedConversation: conversation,
        perRoundTokenCounts: countsFor(conversation),
        chatModel: createMockChatModel(),
        contextBudget: compactionBudget,
        logger: mockLogger,
        eventEmitter: mockEventEmitter,
      });

      const startedEvent = mockEventEmitter.mock.calls[0][0];
      expect(startedEvent.type).toBe(ChatEventType.compactionStarted);
      expect((startedEvent as any).data.token_count_before).toBe(result.tokensBefore);
    });

    it('should emit compactionCompleted with correct token_count_after and summarized_round_count', async () => {
      const rounds = [
        createMockRound('r1', 2000, 2),
        createMockRound('r2', 2000, 1),
        createMockRound('recent-1', 200),
        createMockRound('recent-2', 200),
      ];
      const conversation = createMockConversation(rounds);

      const result = await compact({
        processedConversation: conversation,
        perRoundTokenCounts: countsFor(conversation),
        chatModel: createMockChatModel(),
        contextBudget: compactionBudget,
        logger: mockLogger,
        eventEmitter: mockEventEmitter,
      });

      const completedEvent = mockEventEmitter.mock.calls[1][0];
      expect(completedEvent.type).toBe(ChatEventType.compactionCompleted);
      expect((completedEvent as any).data.token_count_after).toBe(result.tokensAfter);
      expect((completedEvent as any).data.summarized_round_count).toBe(result.summarizedRoundCount);
    });

    it('should not emit events when eventEmitter is not provided', async () => {
      const rounds = [
        createMockRound('r1', 2000, 3),
        createMockRound('r2', 2000, 3),
        createMockRound('recent-1', 200),
        createMockRound('recent-2', 200),
      ];
      const conversation = createMockConversation(rounds);

      // No eventEmitter passed — should not throw
      const result = await compact({
        processedConversation: conversation,
        perRoundTokenCounts: countsFor(conversation),
        chatModel: createMockChatModel(),
        contextBudget: compactionBudget,
        logger: mockLogger,
      });

      expect(result.compactionTriggered).toBe(true);
    });
  });

  describe('interrupted rounds', () => {
    it('counts, summarises and preserves interrupted rounds like completed ones', async () => {
      // r1 completed, r2 failed exec_0, r3 completed, r4 aborted exec_0
      const timeline = [
        ...timelineFromRounds([roundAt('r1', 0, 2000, 3)]),
        ...interruptedRound('r2', 1, 'failed', 2000),
        ...timelineFromRounds([roundAt('r3', 2, 200)]),
        ...interruptedRound('r4', 3, 'aborted'),
      ];
      const conversation = conversationOf(timeline);
      const chatModel = createMockChatModel();

      const result = await compact({
        processedConversation: conversation,
        perRoundTokenCounts: countsFor(conversation),
        chatModel,
        contextBudget: { totalBudget: 500_000, historyBudget: 400_000, triggerThreshold: 100 },
        logger: mockLogger,
      });

      expect(result.compactionTriggered).toBe(true);
      // r1 and r2 summarised (PRESERVED_RECENT_ROUNDS = 2 keeps r3, r4)
      expect(result.summary?.summarized_round_count).toBe(2);
      expect(result.summary?.covered_round_ids).toEqual(['r1', 'r2']);
      expect(roundIds(result.processedConversation.timeline)).toEqual(['r3', 'r4']);
      const summariserInput = chatModel.withStructuredOutput.mock.results[0].value.invoke.mock
        .calls[0][0] as BaseMessage[];
      const texts = summariserInput.map((message) => String(message.content));
      expect(texts.some((text) => text.includes('hello r2'))).toBe(true);
      expect(texts.some((text) => text.includes('<system_notice>'))).toBe(true);
    });

    it('hard truncation drops the oldest rounds first and stops at the floor, whatever their kind', async () => {
      const timeline = [
        ...interruptedRound('r1', 0, 'failed', 2000),
        ...timelineFromRounds([roundAt('r2', 1, 2000, 3)]),
        ...interruptedRound('r3', 2, 'aborted', 2000),
        ...timelineFromRounds([roundAt('r4', 3, 2000, 3)]),
      ];
      const conversation = conversationOf(timeline);
      const perRoundTokenCounts = countsFor(conversation);
      const failingChatModel = {
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockRejectedValue(new Error('llm down')),
        }),
      } as unknown as InferenceChatModel;

      const result = await compact({
        processedConversation: conversation,
        perRoundTokenCounts,
        chatModel: failingChatModel,
        // still over budget at the floor: the two most recent rounds are kept anyway
        contextBudget: { totalBudget: 200, historyBudget: 100, triggerThreshold: 50 },
        logger: mockLogger,
      });

      // summarisation failed: nothing is persisted, the prompt is truncated over what is visible
      expect(result.compactionTriggered).toBe(false);
      expect(result.summary).toBeUndefined();
      expect(roundIds(result.processedConversation.timeline)).toEqual(['r3', 'r4']);
    });
  });

  describe('coverage', () => {
    const budget: ContextBudget = {
      totalBudget: 100_000,
      historyBudget: 50_000,
      triggerThreshold: 10_000,
    };
    const big = 20_000;

    const bToolCall: ToolCallStep = {
      type: ConversationRoundStepType.toolCall,
      tool_call_id: 'B-tc',
      tool_id: 'b_tool',
      params: { q: 'from-b' },
      results: [{ type: ToolResultType.other, tool_result_id: 'B-r', data: { value: 'b result' } }],
      progression: [],
    };

    /** A completed round whose user message is `hello <id>` (so prompts can be asserted on). */
    const completed = (
      id: string,
      minute: number,
      steps: ToolCallStep[] = []
    ): ProcessedConversationRound => ({
      ...roundAt(id, minute, 10),
      input: { message: `hello ${id}`, attachments: [] },
      steps,
    });

    // [A, X, B, C]: X is an interrupted exec_0, B carries a distinctive tool call
    const axbcTimeline = (): ProcessedTimelineEvent[] => [
      ...timelineFromRounds([completed('A', 0)]),
      ...interruptedRound('X', 1, 'failed'),
      ...timelineFromRounds([completed('B', 2, [bToolCall]), completed('C', 3)]),
    ];

    const legacyTwo = summary({ summarized_round_count: 2 }); // written before this change over [A, B]
    const eligible = new Set(['A', 'B', 'C']);

    const firstOutput: LlmCompactionOutput = {
      ...defaultLlmOutput,
      discussion_summary: 'FIRST-SUMMARY-MARKER',
    };

    let invoke: jest.Mock;
    let chatModel: InferenceChatModel;
    let emitted: Array<Parameters<AgentEventEmitterFn>[0]>;
    let options: CompactConversationOptions;

    beforeEach(() => {
      invoke = jest.fn().mockResolvedValue(defaultLlmOutput);
      chatModel = {
        withStructuredOutput: jest.fn().mockReturnValue({ invoke }),
      } as unknown as InferenceChatModel;
      emitted = [];
      options = {
        processedConversation: conversationOf(axbcTimeline()),
        chatModel,
        contextBudget: budget,
        perRoundTokenCounts: [1, 1, 1, 1],
        resultTransformer: identity,
        legacyEligibleRoundIds: eligible,
        logger: mockLogger,
        eventEmitter: (event) => emitted.push(event),
      };
    });

    const requestText = (call: unknown[]) =>
      (call[0] as BaseMessage[]).map((message) => String(message.content)).join('\n');
    const requestTokens = (call: unknown[]) => estimateMessagesTokens(call[0] as BaseMessage[]);

    const compactionInstruction = (
      programmatic: Pick<CompactionStructuredData, 'tool_calls_summary' | 'agent_actions'>
    ): string => {
      const toolLines = programmatic.tool_calls_summary
        .map((toolCall) => `- ${toolCall.tool_id}(${toolCall.params_summary})`)
        .join('\n');
      const toolContext =
        programmatic.tool_calls_summary.length > 0
          ? `\n\nFor reference, here are the tool calls that were made (already captured separately):\n${toolLines}`
          : '';
      return `Please generate a structured summary of this conversation history.${toolContext}`;
    };

    /** Render exactly the request shape `generateLlmSummary` measures and sends. */
    const measureRequest = async ({
      conversation,
      rounds,
      allCoveredRounds,
      resultTransformer,
      prior,
    }: {
      conversation: ProcessedConversation;
      rounds: Array<TimelineRound<ProcessedTimelineEvent>>;
      allCoveredRounds: Array<TimelineRound<ProcessedTimelineEvent>>;
      resultTransformer: ToolCallResultTransformer;
      prior?: CompactionSummary;
    }): Promise<number> => {
      const programmatic = extractProgrammaticSummary(allCoveredRounds);
      const history = await prepareMessages({
        conversation: {
          ...conversation,
          timeline: rounds.flatMap((round) => round.events),
        },
        compactionSummary: prior,
        resultTransformer,
      });
      return estimateMessagesTokens([
        new SystemMessage(COMPACTION_SYSTEM_PROMPT),
        ...history,
        new HumanMessage(compactionInstruction(programmatic)),
      ]);
    };

    it('applies an anchored summary under threshold: prompt has summary, X and C; A and B not duplicated', async () => {
      // A regular (anchored) summary that leaves X uncovered does not trigger a rebuild.
      const anchored = summary({ covered_round_ids: ['A', 'B'], summarized_round_count: 2 });
      const result = await compactConversation({ ...options, existingSummary: anchored });

      expect(result.compactionTriggered).toBe(false);
      expect(emitted).toEqual([]);
      expect(invoke).not.toHaveBeenCalled();
      expect(result.summary).toBe(anchored);
      expect(roundIds(result.processedConversation.timeline)).toEqual(['X', 'C']);
      expect(result.processedConversation.compactionSummary).toBe(anchored);
    });

    it('over threshold with too few rounds to summarise: no compaction events, hard truncation only', async () => {
      // rounds [A, B] only (PRESERVED_RECENT_ROUNDS = 2), both big → nothing eligible
      const result = await compactConversation({
        ...options,
        processedConversation: conversationOf(
          timelineFromRounds([completed('A', 0), completed('B', 1)])
        ),
        perRoundTokenCounts: [big, big],
      });

      expect(result.compactionTriggered).toBe(false);
      expect(emitted).toEqual([]);
      expect(invoke).not.toHaveBeenCalled();
      expect(roundIds(result.processedConversation.timeline)).toEqual(['A', 'B']);
    });

    it('rebuilds a legacy summary whose prefix hides an interrupted round, even under threshold', async () => {
      const result = await compactConversation({ ...options, existingSummary: legacyTwo });

      expect(result.compactionTriggered).toBe(true);
      expect(emitted.map((event) => event.type)).toEqual([
        ChatEventType.compactionStarted,
        ChatEventType.compactionCompleted,
      ]);
      // the summariser saw the old summary as prior context and only X as raw history
      expect(invoke).toHaveBeenCalledTimes(1);
      const text = requestText(invoke.mock.calls[0]);
      expect(text).toContain('[Previous conversation context was compacted]');
      expect(text).toContain('hello X');
      expect(text).not.toContain('hello A');
      expect(text).not.toContain('hello B');
      expect(result.summary?.covered_round_ids).toEqual(['A', 'X', 'B']);
      expect(result.summary?.summarized_round_count).toBe(3);
      expect(roundIds(result.processedConversation.timeline)).toEqual(['C']);
      // B is covered (and off the raw context) but sits in the preserved tail: its deterministic
      // entries must survive the rebuild, or they are lost for good.
      expect(result.summary?.structured_data.tool_calls_summary).toEqual(
        expect.arrayContaining([expect.objectContaining({ tool_id: 'b_tool' })])
      );
      expect(result.summary?.structured_data.agent_actions).toEqual(
        expect.arrayContaining([expect.stringContaining('b_tool')])
      );
    });

    it('coverage never moves backward: a covered round in the preserved tail stays covered, with its tool calls', async () => {
      // rounds [A, X, B, C], existing covered_round_ids ['A', 'B'], over threshold
      const result = await compactConversation({
        ...options,
        existingSummary: summary({ covered_round_ids: ['A', 'B'], summarized_round_count: 2 }),
        perRoundTokenCounts: [big, big, big, big],
      });

      expect(result.compactionTriggered).toBe(true);
      expect(result.summary?.covered_round_ids).toEqual(['A', 'X', 'B']);
      expect(result.summary?.structured_data.tool_calls_summary).toEqual(
        expect.arrayContaining([expect.objectContaining({ tool_id: 'b_tool' })])
      );
      expect(roundIds(result.processedConversation.timeline)).toEqual(['C']);
    });

    it('a later compaction only sends rounds after the covered set', async () => {
      // rounds [A, X, B, C, D, E], covered ['A','X','B'], over threshold → raw history is [C]
      const result = await compactConversation({
        ...options,
        processedConversation: conversationOf([
          ...axbcTimeline(),
          ...timelineFromRounds([completed('D', 4), completed('E', 5)]),
        ]),
        existingSummary: summary({
          covered_round_ids: ['A', 'X', 'B'],
          summarized_round_count: 3,
        }),
        perRoundTokenCounts: [big, big, big, big, big, big],
      });

      expect(invoke).toHaveBeenCalledTimes(1);
      const text = requestText(invoke.mock.calls[0]);
      expect(text).toContain('hello C');
      expect(text).not.toContain('hello A');
      expect(text).not.toContain('hello X');
      expect(text).not.toContain('hello B');
      expect(text).not.toContain('hello D');
      expect(result.summary?.covered_round_ids).toEqual(['A', 'X', 'B', 'C']);
      expect(roundIds(result.processedConversation.timeline)).toEqual(['D', 'E']);
    });

    it('chunks the raw history on the estimate, each chunk building on the previous output', async () => {
      // rounds [A, B, C, D, E] all uncovered and tiny to render; perRoundTokenCounts [3000, 3000, 3000, 1, 1],
      // historyBudget 5000 → [A, B, C] summarised one per request (A+B = 6000 > 5000 − fixed)
      invoke.mockResolvedValueOnce(firstOutput);
      const result = await compactConversation({
        ...options,
        processedConversation: conversationOf(
          timelineFromRounds([
            completed('A', 0),
            completed('B', 1),
            completed('C', 2),
            completed('D', 3),
            completed('E', 4),
          ])
        ),
        contextBudget: { totalBudget: 6000, historyBudget: 5000, triggerThreshold: 100 },
        perRoundTokenCounts: [3000, 3000, 3000, 1, 1],
      });

      expect(invoke).toHaveBeenCalledTimes(3);
      const first = requestText(invoke.mock.calls[0]);
      expect(first).not.toContain('[Previous conversation context was compacted]');
      expect(first).toContain('hello A');
      expect(first).not.toContain('hello B');
      const second = requestText(invoke.mock.calls[1]);
      expect(second).toContain('[Previous conversation context was compacted]');
      expect(second).toContain(firstOutput.discussion_summary);
      expect(second).toContain('hello B');
      expect(second).not.toContain('hello A');
      const third = requestText(invoke.mock.calls[2]);
      expect(third).toContain('hello C');
      expect(third).not.toContain('hello B');
      // the persisted summary is the last output, over the whole covered set
      expect(result.summary?.covered_round_ids).toEqual(['A', 'B', 'C']);
      expect(result.summary?.structured_data.discussion_summary).toBe(
        defaultLlmOutput.discussion_summary
      );
      expect(roundIds(result.processedConversation.timeline)).toEqual(['D', 'E']);
    });

    describe('rendered-size budgeting', () => {
      const bigToolCall: ToolCallStep = {
        type: ConversationRoundStepType.toolCall,
        tool_call_id: 'A-tc',
        tool_id: 'a_tool',
        params: { q: 'from-a' },
        results: [
          {
            type: ToolResultType.other,
            tool_result_id: 'r-1',
            data: { value: 'x'.repeat(40_000) },
          },
        ],
        progression: [],
      };

      // [A, B, C, D, E]: A's single tool call carries a 40k-char result
      const bigResultRounds = (startMinute = 0): ProcessedConversationRound[] => [
        completed('A', startMinute, [bigToolCall]),
        completed('B', startMinute + 1),
        completed('C', startMinute + 2),
        completed('D', startMinute + 3),
        completed('E', startMinute + 4),
      ];

      let bigResultOptions: CompactConversationOptions;
      let priorOptions: CompactConversationOptions;
      const bigPrior = summary({
        covered_round_ids: ['P'],
        summarized_round_count: 1,
        structured_data: structuredData({ discussion_summary: 'p '.repeat(4000) }),
      });

      beforeEach(() => {
        bigResultOptions = {
          ...options,
          processedConversation: conversationOf(timelineFromRounds(bigResultRounds())),
          contextBudget: { totalBudget: 100_000, historyBudget: 50_000, triggerThreshold: 10 },
          perRoundTokenCounts: [20, 20, 20, 1, 1],
        };
        priorOptions = {
          ...options,
          processedConversation: conversationOf(
            timelineFromRounds([completed('P', 0), ...bigResultRounds(1)])
          ),
          contextBudget: { totalBudget: 100_000, historyBudget: 50_000, triggerThreshold: 10 },
          perRoundTokenCounts: [1, 20, 20, 20, 1, 1],
        };
      });

      it('renders tool results through the same transformer the estimate used: a large raw result does not reach the summariser', async () => {
        // round A's tool call carries a 40k-char `other` result; perRoundTokenCounts were estimated
        // with a transformer that summarises it to `{ value: 'tiny', _summary: true }` — pass that transformer.
        const summarising: ToolCallResultTransformer = async () => [
          {
            type: ToolResultType.other,
            tool_result_id: 'r-1',
            data: { value: 'tiny', _summary: true },
          },
        ];
        await compactConversation({ ...bigResultOptions, resultTransformer: summarising });

        expect(invoke).toHaveBeenCalledTimes(1);
        const text = requestText(invoke.mock.calls[0]);
        expect(text).toContain('tiny');
        expect(text).not.toContain('x'.repeat(1000));
        expect(requestTokens(invoke.mock.calls[0])).toBeLessThanOrEqual(
          bigResultOptions.contextBudget.historyBudget
        );
      });

      it('budgets the rendered request, not the estimate: an under-estimated large round is sent alone', async () => {
        const allRounds = groupTimelineRounds(bigResultOptions.processedConversation.timeline);
        const [roundA, roundB] = allRounds;
        const allCoveredRounds = allRounds.slice(0, -2); // A, B, C are eligible; D and E are preserved
        const tokensA = await measureRequest({
          conversation: bigResultOptions.processedConversation,
          rounds: [roundA],
          allCoveredRounds,
          resultTransformer: identity,
        });
        const tokensAB = await measureRequest({
          conversation: bigResultOptions.processedConversation,
          rounds: [roundA, roundB],
          allCoveredRounds,
          resultTransformer: identity,
        });
        expect(tokensAB).toBeGreaterThan(tokensA);
        const historyBudget = tokensA + Math.floor((tokensAB - tokensA) / 2);
        expect(tokensA).toBeLessThanOrEqual(historyBudget);
        expect(historyBudget).toBeLessThan(tokensAB);

        // The stale estimates would pack A, B and C. Measuring the rendered request must shrink the
        // first request to A; the second request can then carry small B and C.
        await compactConversation({
          ...bigResultOptions,
          contextBudget: { totalBudget: historyBudget + 1000, historyBudget, triggerThreshold: 1 },
        });

        expect(invoke).toHaveBeenCalledTimes(2);
        const firstText = requestText(invoke.mock.calls[0]);
        expect(firstText).toContain('hello A');
        expect(firstText).not.toContain('hello B');
        const secondText = requestText(invoke.mock.calls[1]);
        expect(secondText).toContain('hello B');
        expect(secondText).toContain('hello C');
        for (const call of invoke.mock.calls) {
          expect(requestTokens(call)).toBeLessThanOrEqual(historyBudget);
        }
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });

      it('a non-empty prior summary counts toward each request', async () => {
        const allRounds = groupTimelineRounds(priorOptions.processedConversation.timeline);
        const rawRounds = allRounds.slice(1, -2); // P is covered; D and E are preserved
        const allCoveredRounds = allRounds.slice(0, -2);
        const tokensAWithPrior = await measureRequest({
          conversation: priorOptions.processedConversation,
          rounds: [rawRounds[0]],
          allCoveredRounds,
          resultTransformer: identity,
          prior: bigPrior,
        });
        const tokensABWithPrior = await measureRequest({
          conversation: priorOptions.processedConversation,
          rounds: rawRounds.slice(0, 2),
          allCoveredRounds,
          resultTransformer: identity,
          prior: bigPrior,
        });
        const tokensABWithoutPrior = await measureRequest({
          conversation: priorOptions.processedConversation,
          rounds: rawRounds.slice(0, 2),
          allCoveredRounds,
          resultTransformer: identity,
        });
        expect(tokensABWithPrior).toBeGreaterThan(tokensABWithoutPrior);
        // This budget admits A with the prior and admits A+B without it, but rejects A+B with it.
        const historyBudget = Math.max(tokensAWithPrior, tokensABWithoutPrior);
        expect(tokensAWithPrior).toBeLessThanOrEqual(historyBudget);
        expect(historyBudget).toBeLessThan(tokensABWithPrior);

        await compactConversation({
          ...priorOptions,
          contextBudget: { totalBudget: historyBudget + 1000, historyBudget, triggerThreshold: 1 },
          existingSummary: bigPrior,
        });

        const firstText = requestText(invoke.mock.calls[0]);
        expect(firstText).toContain('p p p');
        expect(firstText).toContain('hello A');
        expect(firstText).not.toContain('hello B');
        expect(requestTokens(invoke.mock.calls[0])).toBeLessThanOrEqual(historyBudget);
      });

      it('a single round that does not fit alone is still sent, with a warning', async () => {
        const allRounds = groupTimelineRounds(bigResultOptions.processedConversation.timeline);
        const tokensA = await measureRequest({
          conversation: bigResultOptions.processedConversation,
          rounds: [allRounds[0]],
          allCoveredRounds: allRounds.slice(0, -2),
          resultTransformer: identity,
        });
        const historyBudget = tokensA - 1;

        const result = await compactConversation({
          ...bigResultOptions,
          contextBudget: { totalBudget: tokensA + 1000, historyBudget, triggerThreshold: 1 },
        });

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('exceeds the history budget')
        );
        const firstText = requestText(invoke.mock.calls[0]);
        expect(firstText).toContain('hello A');
        expect(firstText).not.toContain('hello B');
        expect(result.compactionTriggered).toBe(true);
        expect(result.summary?.covered_round_ids).toEqual(['A', 'B', 'C']);
      });
    });

    it('a failing chunk keeps the existing summary applied, persists nothing, emits no compactionCompleted', async () => {
      invoke.mockRejectedValueOnce(new Error('llm down'));
      const result = await compactConversation({ ...options, existingSummary: legacyTwo });

      expect(result.compactionTriggered).toBe(false);
      expect(result.summary).toBe(legacyTwo);
      expect(result.processedConversation.compactionSummary).toBe(legacyTwo);
      expect(roundIds(result.processedConversation.timeline)).toEqual(['X', 'C']);
      expect(emitted.map((event) => event.type)).toEqual([ChatEventType.compactionStarted]);
    });

    it('hard truncation after a failure runs over uncovered rounds only', async () => {
      // covered ['A'], uncovered [X, B, C, D] all big; summariser fails → X, B dropped; C, D kept
      invoke.mockRejectedValueOnce(new Error('llm down'));
      const anchored = summary({ covered_round_ids: ['A'], summarized_round_count: 1 });
      const result = await compactConversation({
        ...options,
        processedConversation: conversationOf([
          ...axbcTimeline(),
          ...timelineFromRounds([completed('D', 4)]),
        ]),
        existingSummary: anchored,
        perRoundTokenCounts: [big, big, big, big, big],
      });

      expect(result.compactionTriggered).toBe(false);
      expect(result.summary).toBe(anchored);
      expect(roundIds(result.processedConversation.timeline)).toEqual(['C', 'D']);
    });

    it('hard truncation reserves the tokens of the summary rendered with the rounds', async () => {
      // covered ['A'], uncovered [X, B, C, D, E] at 12k each (60k) against a 50k history budget
      // with a 15k summary. Rounds alone: dropping X (48k) would fit; with the summary rendered
      // alongside (35k left for rounds) X, B and C must go.
      invoke.mockRejectedValueOnce(new Error('llm down'));
      const anchored = summary({
        covered_round_ids: ['A'],
        summarized_round_count: 1,
        token_count: 15_000,
      });
      const result = await compactConversation({
        ...options,
        processedConversation: conversationOf([
          ...axbcTimeline(),
          ...timelineFromRounds([completed('D', 4), completed('E', 5)]),
        ]),
        existingSummary: anchored,
        perRoundTokenCounts: [1, 12_000, 12_000, 12_000, 12_000, 12_000],
      });

      expect(result.compactionTriggered).toBe(false);
      expect(result.summary).toBe(anchored);
      expect(roundIds(result.processedConversation.timeline)).toEqual(['D', 'E']);
    });
  });
});
