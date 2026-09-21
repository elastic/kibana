/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIsMutating } from '@kbn/react-query';
import { useTimelineItems } from '../components/conversations/timeline/use_timeline_items';
import type { TimelineItem } from '../components/conversations/timeline/types';
import { createUserMessageEvent } from '../components/conversations/timeline/items/user_message_event.factory';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useCurrentConversationStreamType } from './use_is_current_conversation_streaming';
import { useAnchoredItemKey } from './use_anchored_item_key';

jest.mock('@kbn/react-query', () => ({ useIsMutating: jest.fn() }));
jest.mock('../components/conversations/timeline/use_timeline_items', () => ({
  useTimelineItems: jest.fn(),
}));
jest.mock('../context/conversation/use_conversation_id', () => ({ useConversationId: jest.fn() }));
jest.mock('./use_is_current_conversation_streaming', () => ({
  useCurrentConversationStreamType: jest.fn(),
}));

const message = (id: string): TimelineItem => ({
  kind: 'userMessage',
  key: id,
  event: createUserMessageEvent({ id }),
});
const turn = (key: string): TimelineItem => ({
  kind: 'agentTurn',
  key,
  status: 'completed',
  startedAt: '',
  steps: [],
});

interface State {
  conversationId?: string;
  isStreaming?: boolean;
  isPosting?: boolean;
  // The current conversation's stream is a resume (continuing a paused turn) rather than a send.
  isResuming?: boolean;
  items: TimelineItem[];
}

const setState = (state: State) => {
  const { isStreaming = false, isPosting = false, isResuming = false, items } = state;
  // An explicit `undefined` is the new-conversation page, which has no id yet.
  const conversationId = 'conversationId' in state ? state.conversationId : 'a';
  jest.mocked(useConversationId).mockReturnValue(conversationId);
  // The stream type is already scoped to the current conversation, so a resume elsewhere is simply
  // invisible here: this conversation reads its own `send` (or nothing).
  const streamType = isResuming ? 'resume' : isStreaming ? 'send' : undefined;
  jest.mocked(useCurrentConversationStreamType).mockReturnValue(streamType);
  jest.mocked(useIsMutating).mockReturnValue(isPosting ? 1 : 0);
  jest.mocked(useTimelineItems).mockReturnValue(items);
};

const renderAnchor = (initial: State) => {
  setState(initial);
  const hook = renderHook(() => useAnchoredItemKey());
  return {
    result: hook.result,
    update: (next: State) => {
      setState(next);
      hook.rerender();
    },
  };
};

const history = [message('u1'), turn('t1')];

describe('useAnchoredItemKey', () => {
  beforeEach(() => jest.clearAllMocks());

  it('anchors nothing in a conversation that has only been read', () => {
    const { result } = renderAnchor({ items: history });

    expect(result.current).toBeUndefined();
  });

  it('anchors the item appended after a stream starts and keeps it after the stream ends', () => {
    const { result, update } = renderAnchor({ items: history });

    update({ isStreaming: true, items: history });
    update({ isStreaming: true, items: [...history, message('pending'), turn('active')] });
    expect(result.current).toBe('pending');

    update({ isStreaming: true, items: [...history, message('u2'), turn('t2')] });
    expect(result.current).toBe('u2');

    update({ isStreaming: false, items: [...history, message('u2'), turn('t2')] });
    expect(result.current).toBe('u2');
  });

  it('anchors the item appended by a post without the agent', () => {
    const { result, update } = renderAnchor({ items: history });

    update({ isPosting: true, items: history });
    expect(result.current).toBeUndefined();

    update({ isPosting: false, items: [...history, message('u2')] });
    expect(result.current).toBe('u2');
  });

  it('keeps the previous anchor until the next send appends its item, then moves to it', () => {
    const { result, update } = renderAnchor({ isStreaming: true, items: [] });
    update({ isStreaming: true, items: [message('u1'), turn('t1')] });
    update({ isStreaming: false, items: [message('u1'), turn('t1')] });
    expect(result.current).toBe('u1');

    update({ isStreaming: true, items: [message('u1'), turn('t1')] });
    expect(result.current).toBe('u1');

    update({ isStreaming: true, items: [message('u1'), turn('t1'), message('u2'), turn('t2')] });
    expect(result.current).toBe('u2');
  });

  it('does not carry over to another conversation, nor back to one that is still streaming', () => {
    const { result, update } = renderAnchor({ isStreaming: true, items: [] });
    update({ isStreaming: true, items: [message('u1')] });
    expect(result.current).toBe('u1');

    update({ conversationId: 'b', items: [message('x1'), turn('y1')] });
    expect(result.current).toBeUndefined();

    update({ conversationId: 'a', isStreaming: true, items: [message('u1'), turn('t1')] });
    expect(result.current).toBeUndefined();

    update({ conversationId: 'a', isStreaming: false, items: [message('u1'), turn('t1')] });
    update({ conversationId: 'a', isStreaming: true, items: [message('u1'), turn('t1')] });
    update({
      conversationId: 'a',
      isStreaming: true,
      items: [message('u1'), turn('t1'), message('u2'), turn('t2')],
    });
    expect(result.current).toBe('u2');
  });

  it('does not re-latch when a paused round is resumed, keeping the prompt in view', () => {
    const { result, update } = renderAnchor({ isStreaming: true, items: [] });
    update({ isStreaming: true, items: history });
    update({ isStreaming: false, items: history });
    expect(result.current).toBe('u1');

    // Answering the prompt resumes the round: a stream starts, but it continues the same turn.
    update({ isResuming: true, isStreaming: true, items: history });
    update({
      isResuming: true,
      isStreaming: true,
      items: [...history, message('answer'), turn('t2')],
    });
    expect(result.current).toBe('u1');

    update({ items: [...history, message('answer'), turn('t2')] });
    expect(result.current).toBe('u1');
  });

  it('latches this conversation own send even while another conversation resumes in parallel', () => {
    // The stream type is read for the current conversation only, so a resume in flight elsewhere
    // does not reach this hook: this conversation still sees its own `send` and latches it.
    const { result, update } = renderAnchor({ items: history });

    update({ isStreaming: true, items: history });
    update({ isStreaming: true, items: [...history, message('u2'), turn('t2')] });
    expect(result.current).toBe('u2');
  });

  it('anchors the first message of a new conversation, which arrives with its stream running', () => {
    const { result, update } = renderAnchor({ conversationId: undefined, items: [] });

    update({ conversationId: 'created', isStreaming: true, items: [] });
    update({
      conversationId: 'created',
      isStreaming: true,
      items: [message('u1'), turn('active')],
    });

    expect(result.current).toBe('u1');
  });
});
