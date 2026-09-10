/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationOriginType,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import type { CompactionSummary, UserMessageEvent } from '@kbn/agent-builder-common';
import { isHumanMessage } from '@langchain/core/messages';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createAgentHandlerContextMock } from '../../../../test_utils/runner';
import {
  eventsNativeConversation,
  pausedAndResumedRoundTimeline,
  timelineFromRounds,
} from '../../../../test_utils/timeline';
import {
  eventsForContext,
  groupTimelineEntries,
  groupTimelineRounds,
  sliceTimelineEntries,
} from './context_timeline';
import { prepareConversation } from './prepare_conversation';
import { prepareMessages } from './to_langchain_messages';
import { estimateTimelineEntryTokens } from './estimate_conversation_tokens';
import { compactConversation } from './conversation_compactor';
import { loggerMock } from '@kbn/logging-mocks';

const message = (id: string, text = id): UserMessageEvent => ({
  id,
  type: TimelineEventType.userMessage,
  created_at: `2026-01-01T00:00:0${id === 'a' ? 1 : 2}.000Z`,
  actor: {
    type: EventActorType.external,
    id: 'alice',
    full_name: 'Alice',
    origin: { type: ConversationOriginType.Slack },
  },
  data: { message: text },
});

const context = () => {
  const value = createAgentHandlerContextMock();
  value.attachmentStateManager = createAttachmentStateManager([], {
    getTypeDefinition: () => undefined,
  });
  return value;
};

describe('standalone message context', () => {
  it('preserves ordered, attributed human inputs without artificial assistant responses', async () => {
    const events = [message('a', 'Pool limit is 200'), message('b', 'Errors recovered')];
    const timeline = eventsForContext(eventsNativeConversation(events));
    const conversation = await prepareConversation({
      timeline,
      nextInput: { message: 'Summarize' },
      context: context(),
    });
    const messages = await prepareMessages({ conversation });
    expect(messages).toHaveLength(3);
    expect(messages.every(isHumanMessage)).toBe(true);
    expect(messages.map((entry) => String(entry.content))).toEqual([
      expect.stringContaining('Pool limit is 200'),
      expect.stringContaining('Errors recovered'),
      expect.stringContaining('Summarize'),
    ]);
    expect(String(messages[0].content)).toContain('Alice');
    expect(groupTimelineRounds(conversation.timeline)).toEqual([]);
  });

  it('preserves stored order when standalone messages and executions share a timestamp', () => {
    const timestamp = '2026-01-01T00:00:00.000Z';
    const timeline = eventsForContext(
      eventsNativeConversation([
        { ...message('a'), created_at: timestamp },
        ...timelineFromRounds([
          { id: 'round', started_at: timestamp, input: { message: 'executed' } },
        ]),
        { ...message('b'), created_at: timestamp },
      ])
    );
    expect(groupTimelineEntries(timeline).map((entry) => entry.userMessage.id)).toEqual([
      'a',
      'round::user_message',
      'b',
    ]);
  });

  it('does not treat running execution triggers or receipt-time input as standalone', () => {
    const running = timelineFromRounds([{ id: 'running', input: { message: 'in flight' } }]).filter(
      (event) => event.type !== TimelineEventType.executionTerminated
    );
    const receipt = { ...message('receipt'), id: 'new-round::user_message' };
    const normalized = eventsForContext(
      eventsNativeConversation([...running, receipt, message('a')])
    );
    expect(groupTimelineEntries(normalized).map((entry) => entry.userMessage.id)).toEqual(['a']);
  });

  it('keeps standalone messages through HITL normalization and entry slicing', () => {
    const timeline = eventsForContext(
      eventsNativeConversation([...pausedAndResumedRoundTimeline(), message('a'), message('b')])
    );
    expect(groupTimelineRounds(timeline)).toHaveLength(1);
    const entries = groupTimelineEntries(timeline);
    expect(entries).toHaveLength(3);
    expect(groupTimelineEntries(sliceTimelineEntries(timeline, 1))).toEqual(entries.slice(1));
  });

  it('counts standalone messages in the token budget', async () => {
    const conversation = await prepareConversation({
      timeline: [message('a', 'context '.repeat(100))],
      nextInput: { message: 'next' },
      context: context(),
    });
    const counts = await estimateTimelineEntryTokens(conversation.timeline, {
      toolRegistry: context().toolRegistry,
      toolManager: context().toolManager,
    });
    expect(counts).toHaveLength(1);
    expect(counts[0]).toBeGreaterThan(100);
  });

  it('compacts standalone history with an event boundary and reuses it exactly once', async () => {
    const conversation = await prepareConversation({
      timeline: ['a', 'b', 'c', 'd', 'e'].map((id) => message(id)),
      nextInput: { message: 'next' },
      context: context(),
    });
    const invoke = jest.fn().mockResolvedValue({
      discussion_summary: 'Older messages',
      user_intent: '',
      key_topics: [],
      outcomes_and_decisions: [],
      entities: [],
      unanswered_questions: [],
    });
    const chatModel = { withStructuredOutput: () => ({ invoke }) } as never;
    const result = await compactConversation({
      processedConversation: conversation,
      chatModel,
      contextBudget: { totalBudget: 10000, historyBudget: 7000, triggerThreshold: 100 },
      timelineEntryTokenCounts: [100, 100, 100, 100, 100],
      logger: loggerMock.create(),
    });
    expect(result.summary).toMatchObject({
      timeline_version: 1,
      through_event_id: 'c',
      summarized_entry_count: 3,
      summarized_round_count: 0,
    });
    expect(
      groupTimelineEntries(result.processedConversation.timeline).map(
        (entry) => entry.userMessage.id
      )
    ).toEqual(['d', 'e']);
    const reused = await compactConversation({
      processedConversation: conversation,
      chatModel,
      contextBudget: { totalBudget: 10000, historyBudget: 7000, triggerThreshold: 6000 },
      timelineEntryTokenCounts: [100, 100, 100, 100, 100],
      existingSummary: result.summary,
      logger: loggerMock.create(),
    });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(reused.processedConversation.timeline).toEqual(result.processedConversation.timeline);
  });

  it('retains pending prompt inputs when standalone messages follow the paused execution', async () => {
    const stored = pausedAndResumedRoundTimeline();
    const paused = stored.slice(
      0,
      stored.findIndex((event) => event.type === TimelineEventType.executionTerminated) + 1
    );
    const timeline = eventsForContext(
      eventsNativeConversation([
        ...paused,
        ...['a', 'b', 'c'].map((id) => ({
          ...message(id),
          created_at: '2027-01-01T00:00:00.000Z',
        })),
      ])
    );
    const conversation = await prepareConversation({
      timeline,
      nextInput: { message: 'resume' },
      context: context(),
    });
    const result = await compactConversation({
      processedConversation: conversation,
      chatModel: {} as never,
      contextBudget: { totalBudget: 10, historyBudget: 7, triggerThreshold: 5 },
      timelineEntryTokenCounts: [100, 100, 100, 100],
      logger: loggerMock.create(),
    });
    expect(result.processedConversation.timeline).toEqual(conversation.timeline);
    expect(groupTimelineRounds(result.processedConversation.timeline)).toHaveLength(1);
  });

  it('rebuilds old summaries from history instead of treating round counts as entry counts', async () => {
    const conversation = await prepareConversation({
      timeline: [message('a'), message('b')],
      nextInput: { message: 'next' },
      context: context(),
    });
    const existingSummary: CompactionSummary = {
      summarized_round_count: 1,
      token_count: 1,
      created_at: '',
      structured_data: {
        discussion_summary: 'old',
        user_intent: '',
        key_topics: [],
        outcomes_and_decisions: [],
        agent_actions: [],
        entities: [],
        unanswered_questions: [],
        tool_calls_summary: [],
      },
    };
    const result = await compactConversation({
      processedConversation: conversation,
      chatModel: context().modelProvider as never,
      contextBudget: { totalBudget: 10000, historyBudget: 7000, triggerThreshold: 6000 },
      timelineEntryTokenCounts: [10, 10],
      existingSummary,
      logger: loggerMock.create(),
    });
    expect(result.summary).toBeUndefined();
    expect(result.processedConversation.timeline).toEqual(conversation.timeline);
  });
});
