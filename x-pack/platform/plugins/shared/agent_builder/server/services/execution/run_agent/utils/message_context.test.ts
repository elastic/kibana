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
import type { UserMessageEvent } from '@kbn/agent-builder-common';
import { isHumanMessage } from '@langchain/core/messages';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createAgentHandlerContextMock } from '../../../../test_utils/runner';
import {
  eventsNativeConversation,
  pausedAndResumedRoundTimeline,
  timelineFromRounds,
} from '../../../../test_utils/timeline';
import { eventsForContext, groupTimelineEntries, groupTimelineRounds } from './context_timeline';
import { prepareConversation } from './prepare_conversation';
import { prepareMessages } from './to_langchain_messages';

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

describe('context messages', () => {
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

  it('preserves stored order when context messages and executions share a timestamp', () => {
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

  it('keeps context messages through HITL normalization', () => {
    const timeline = eventsForContext(
      eventsNativeConversation([...pausedAndResumedRoundTimeline(), message('a'), message('b')])
    );
    expect(groupTimelineRounds(timeline)).toHaveLength(1);
    expect(groupTimelineEntries(timeline)).toHaveLength(3);
  });
});
