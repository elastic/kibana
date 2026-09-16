/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { EventActorType } from '@kbn/agent-builder-common';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useStreamingContext } from '../context/streaming/streaming_context';
import { useConversationStatus } from './use_conversation';
import { useCurrentUser } from './use_current_user';
import { useTimelineItems } from '../components/conversations/timeline/use_timeline_items';
import type { TimelineItem } from '../components/conversations/timeline/to_timeline_items';
import { createUserMessageEvent } from '../components/conversations/timeline/items/user_message_event.factory';
import { useOnMessageFromOtherParticipant } from './use_on_message_from_other_participant';

jest.mock('../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));

jest.mock('../context/streaming/streaming_context', () => ({
  useStreamingContext: jest.fn(),
}));

jest.mock('./use_conversation', () => ({
  useConversationStatus: jest.fn(),
}));

jest.mock('./use_current_user', () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock('../components/conversations/timeline/use_timeline_items', () => ({
  useTimelineItems: jest.fn(),
}));

const mockUseConversationId = jest.mocked(useConversationId);
const mockUseStreamingContext = jest.mocked(useStreamingContext);
const mockUseTimelineItems = jest.mocked(useTimelineItems);
const mockUseConversationStatus = jest.mocked(useConversationStatus);
const mockUseCurrentUser = jest.mocked(useCurrentUser);

interface State {
  conversationId: string | undefined;
  userMessageCount: number;
  isStreaming?: boolean;
  isFetched?: boolean;
  latestAuthorId?: string;
}

const setState = ({
  conversationId,
  userMessageCount,
  isStreaming = false,
  isFetched = true,
  latestAuthorId = 'someone-else',
}: State) => {
  mockUseConversationId.mockReturnValue(conversationId);
  mockUseCurrentUser.mockReturnValue({ currentUser: { uid: 'me' }, isLoading: false } as never);
  const items: TimelineItem[] = Array.from({ length: userMessageCount }, (_, index) => ({
    kind: 'userMessage',
    key: `user-${index}`,
    event: createUserMessageEvent({
      id: `user-${index}`,
      actor: {
        type: EventActorType.user,
        id: index === userMessageCount - 1 ? latestAuthorId : 'someone-else',
      },
    }),
  }));
  // Agent turns must not count as messages.
  items.push({ kind: 'agentTurn', key: 'active', status: 'running', startedAt: '', steps: [] });
  mockUseTimelineItems.mockReturnValue(items);
  mockUseConversationStatus.mockReturnValue({
    isFetched,
  } as ReturnType<typeof useConversationStatus>);
  mockUseStreamingContext.mockReturnValue({
    activeStreams:
      isStreaming && conversationId ? new Map([[conversationId, { type: 'send' }]]) : new Map(),
  } as unknown as ReturnType<typeof useStreamingContext>);
};

const render = (initial: State) => {
  const onMessageFromOtherParticipant = jest.fn();

  setState(initial);
  const { rerender } = renderHook(() =>
    useOnMessageFromOtherParticipant(onMessageFromOtherParticipant)
  );

  return {
    onMessageFromOtherParticipant,
    update: (next: State) => {
      setState(next);
      rerender();
    },
  };
};

describe('useOnMessageFromOtherParticipant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports a message that appeared without a local stream', () => {
    const { onMessageFromOtherParticipant, update } = render({
      conversationId: 'a',
      userMessageCount: 2,
    });

    update({ conversationId: 'a', userMessageCount: 3 });

    expect(onMessageFromOtherParticipant).toHaveBeenCalledTimes(1);
  });

  it('does not report the messages a conversation already had when it loaded', () => {
    const { onMessageFromOtherParticipant, update } = render({
      conversationId: 'a',
      userMessageCount: 0,
      isFetched: false,
    });

    update({ conversationId: 'a', userMessageCount: 4, isFetched: true });

    expect(onMessageFromOtherParticipant).not.toHaveBeenCalled();
  });

  it('does not report messages produced by a local stream', () => {
    const { onMessageFromOtherParticipant, update } = render({
      conversationId: 'a',
      userMessageCount: 2,
    });

    update({ conversationId: 'a', userMessageCount: 3, isStreaming: true });

    expect(onMessageFromOtherParticipant).not.toHaveBeenCalled();
  });

  it('does not report the messages of a newly opened conversation', () => {
    const { onMessageFromOtherParticipant, update } = render({
      conversationId: 'a',
      userMessageCount: 2,
    });

    update({ conversationId: 'b', userMessageCount: 7 });

    expect(onMessageFromOtherParticipant).not.toHaveBeenCalled();
  });

  it("reports another participant's message on a conversation that was empty when opened", () => {
    const { onMessageFromOtherParticipant, update } = render({
      conversationId: 'a',
      userMessageCount: 0,
    });

    update({ conversationId: 'a', userMessageCount: 1 });

    expect(onMessageFromOtherParticipant).toHaveBeenCalledTimes(1);
  });

  it("does not report the user's own message posted without a stream", () => {
    const { onMessageFromOtherParticipant, update } = render({
      conversationId: 'a',
      userMessageCount: 2,
    });

    update({ conversationId: 'a', userMessageCount: 3, latestAuthorId: 'me' });

    expect(onMessageFromOtherParticipant).not.toHaveBeenCalled();
  });

  it('does not report anything when the message count is unchanged', () => {
    const { onMessageFromOtherParticipant, update } = render({
      conversationId: 'a',
      userMessageCount: 2,
    });

    update({ conversationId: 'a', userMessageCount: 2 });

    expect(onMessageFromOtherParticipant).not.toHaveBeenCalled();
  });
});
