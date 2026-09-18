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
import { useIsCurrentConversationStreaming } from './use_is_current_conversation_streaming';
import { useAnchoredItemKey } from './use_anchored_item_key';

jest.mock('@kbn/react-query', () => ({ useIsMutating: jest.fn() }));
jest.mock('../components/conversations/timeline/use_timeline_items', () => ({
  useTimelineItems: jest.fn(),
}));
jest.mock('../context/conversation/use_conversation_id', () => ({ useConversationId: jest.fn() }));
jest.mock('./use_is_current_conversation_streaming', () => ({
  useIsCurrentConversationStreaming: jest.fn(),
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
  items: TimelineItem[];
}

const setState = ({
  conversationId = 'a',
  isStreaming = false,
  isPosting = false,
  items,
}: State) => {
  jest.mocked(useConversationId).mockReturnValue(conversationId);
  jest.mocked(useIsCurrentConversationStreaming).mockReturnValue(isStreaming);
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

  it('does not carry over to another conversation', () => {
    const { result, update } = renderAnchor({ isStreaming: true, items: [] });
    update({ isStreaming: true, items: [message('u1')] });
    expect(result.current).toBe('u1');

    update({ conversationId: 'b', items: [message('x1'), turn('y1')] });

    expect(result.current).toBeUndefined();
  });
});
