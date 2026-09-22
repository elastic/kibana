/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useStreamingContext } from '../context/streaming/streaming_context';
import { useConversationRounds, useConversationStatus } from './use_conversation';
import { useOnRoundFromOtherParticipant } from './use_on_round_from_other_participant';

jest.mock('../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));

jest.mock('../context/streaming/streaming_context', () => ({
  useStreamingContext: jest.fn(),
}));

jest.mock('./use_conversation', () => ({
  useConversationRounds: jest.fn(),
  useConversationStatus: jest.fn(),
}));

const mockUseConversationId = jest.mocked(useConversationId);
const mockUseStreamingContext = jest.mocked(useStreamingContext);
const mockUseConversationRounds = jest.mocked(useConversationRounds);
const mockUseConversationStatus = jest.mocked(useConversationStatus);

interface State {
  conversationId: string | undefined;
  roundCount: number;
  isStreaming?: boolean;
  isFetched?: boolean;
}

const setState = ({ conversationId, roundCount, isStreaming = false, isFetched = true }: State) => {
  mockUseConversationId.mockReturnValue(conversationId);
  mockUseConversationRounds.mockReturnValue(
    Array.from(
      { length: roundCount },
      (_, index) => ({ id: `round-${index}` } as ConversationRound)
    )
  );
  mockUseConversationStatus.mockReturnValue({
    isFetched,
  } as ReturnType<typeof useConversationStatus>);
  mockUseStreamingContext.mockReturnValue({
    activeStreams:
      isStreaming && conversationId ? new Map([[conversationId, { type: 'send' }]]) : new Map(),
  } as unknown as ReturnType<typeof useStreamingContext>);
};

const render = (initial: State) => {
  const onRoundFromOtherParticipant = jest.fn();

  setState(initial);
  const { rerender } = renderHook(() =>
    useOnRoundFromOtherParticipant(onRoundFromOtherParticipant)
  );

  return {
    onRoundFromOtherParticipant,
    update: (next: State) => {
      setState(next);
      rerender();
    },
  };
};

describe('useOnRoundFromOtherParticipant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports a round that appeared without a local stream', () => {
    const { onRoundFromOtherParticipant, update } = render({ conversationId: 'a', roundCount: 2 });

    update({ conversationId: 'a', roundCount: 3 });

    expect(onRoundFromOtherParticipant).toHaveBeenCalledTimes(1);
  });

  it('does not report the rounds a conversation already had when it loaded', () => {
    const { onRoundFromOtherParticipant, update } = render({
      conversationId: 'a',
      roundCount: 0,
      isFetched: false,
    });

    update({ conversationId: 'a', roundCount: 4, isFetched: true });

    expect(onRoundFromOtherParticipant).not.toHaveBeenCalled();
  });

  it('does not report rounds produced by a local stream', () => {
    const { onRoundFromOtherParticipant, update } = render({ conversationId: 'a', roundCount: 2 });

    update({ conversationId: 'a', roundCount: 3, isStreaming: true });

    expect(onRoundFromOtherParticipant).not.toHaveBeenCalled();
  });

  it('does not report the rounds of a newly opened conversation', () => {
    const { onRoundFromOtherParticipant, update } = render({ conversationId: 'a', roundCount: 2 });

    update({ conversationId: 'b', roundCount: 7 });

    expect(onRoundFromOtherParticipant).not.toHaveBeenCalled();
  });

  it('reports a remote round on a conversation that was empty when opened', () => {
    const { onRoundFromOtherParticipant, update } = render({ conversationId: 'a', roundCount: 0 });

    update({ conversationId: 'a', roundCount: 1 });

    expect(onRoundFromOtherParticipant).toHaveBeenCalledTimes(1);
  });

  it('does not report anything when the round count is unchanged', () => {
    const { onRoundFromOtherParticipant, update } = render({ conversationId: 'a', roundCount: 2 });

    update({ conversationId: 'a', roundCount: 2 });

    expect(onRoundFromOtherParticipant).not.toHaveBeenCalled();
  });
});
