/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ConversationRoundStatus, type ConversationRound } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { useAnchoredRoundIndex } from './use_anchored_round';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversationRounds } from './use_conversation';
import { useConversationStream } from './use_conversation_stream';

jest.mock('../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));

jest.mock('./use_conversation', () => ({
  useConversationRounds: jest.fn(),
}));

jest.mock('./use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));

const useConversationIdMock = jest.mocked(useConversationId);
const useConversationRoundsMock = jest.mocked(useConversationRounds);
const useConversationStreamMock = jest.mocked(useConversationStream);

const createRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'hello' },
  response: { message: 'world' },
  steps: [],
  started_at: '2026-01-01T00:00:00.000Z',
  time_to_first_token: 1,
  time_to_last_token: 1,
  model_usage: {
    connector_id: 'connector-1',
    llm_calls: 1,
    input_tokens: 1,
    output_tokens: 1,
  },
  ...overrides,
});

const streamState = (overrides: Partial<ReturnType<typeof useConversationStream>> = {}) =>
  ({
    isResponseLoading: false,
    error: null,
    isResuming: false,
    ...overrides,
  } as ReturnType<typeof useConversationStream>);

describe('useAnchoredRoundIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useConversationIdMock.mockReturnValue('conversation-1');
    useConversationRoundsMock.mockReturnValue([createRound()]);
    useConversationStreamMock.mockReturnValue(streamState());
  });

  it('returns null for a freshly loaded conversation with no active round', () => {
    const { result } = renderHook(() => useAnchoredRoundIndex());
    expect(result.current).toBeNull();
  });

  it('returns null when the conversation has no rounds', () => {
    useConversationRoundsMock.mockReturnValue([]);
    const { result } = renderHook(() => useAnchoredRoundIndex());
    expect(result.current).toBeNull();
  });

  it('anchors the last round while the response is streaming', () => {
    useConversationRoundsMock.mockReturnValue([createRound(), createRound()]);
    useConversationStreamMock.mockReturnValue(streamState({ isResponseLoading: true }));

    const { result } = renderHook(() => useAnchoredRoundIndex());
    expect(result.current).toBe(1);
  });

  it('keeps the anchor on the round after streaming ends', () => {
    useConversationRoundsMock.mockReturnValue([createRound(), createRound()]);
    useConversationStreamMock.mockReturnValue(streamState({ isResponseLoading: true }));

    const { result, rerender } = renderHook(() => useAnchoredRoundIndex());
    expect(result.current).toBe(1);

    useConversationStreamMock.mockReturnValue(streamState());
    rerender();

    expect(result.current).toBe(1);
  });

  it('moves the anchor when a new round starts streaming', () => {
    useConversationRoundsMock.mockReturnValue([createRound()]);
    useConversationStreamMock.mockReturnValue(streamState({ isResponseLoading: true }));

    const { result, rerender } = renderHook(() => useAnchoredRoundIndex());
    expect(result.current).toBe(0);

    useConversationStreamMock.mockReturnValue(streamState());
    rerender();
    expect(result.current).toBe(0);

    useConversationRoundsMock.mockReturnValue([createRound(), createRound()]);
    useConversationStreamMock.mockReturnValue(streamState({ isResponseLoading: true }));
    rerender();

    expect(result.current).toBe(1);
  });

  it('clears the anchor when switching conversations', () => {
    useConversationStreamMock.mockReturnValue(streamState({ isResponseLoading: true }));
    const { result, rerender } = renderHook(() => useAnchoredRoundIndex());
    expect(result.current).toBe(0);

    useConversationIdMock.mockReturnValue('conversation-2');
    useConversationStreamMock.mockReturnValue(streamState());
    rerender();

    expect(result.current).toBeNull();
  });

  it('keeps the anchor across the new-conversation id transition', () => {
    // First message on a new conversation: no id yet, stream active.
    useConversationIdMock.mockReturnValue(undefined);
    useConversationStreamMock.mockReturnValue(streamState({ isResponseLoading: true }));

    const { result, rerender } = renderHook(() => useAnchoredRoundIndex());
    expect(result.current).toBe(0);

    // Conversation is created mid-stream and the URL/context id changes.
    useConversationIdMock.mockReturnValue('conversation-1');
    rerender();
    expect(result.current).toBe(0);

    // Stream settles; the latch (re-set under the new id) keeps the anchor.
    useConversationStreamMock.mockReturnValue(streamState());
    rerender();
    expect(result.current).toBe(0);
  });

  it('anchors the last round when the stream errors', () => {
    useConversationStreamMock.mockReturnValue(streamState({ error: new Error('boom') }));

    const { result } = renderHook(() => useAnchoredRoundIndex());
    expect(result.current).toBe(0);
  });

  it('anchors the last round while it awaits a prompt', () => {
    useConversationRoundsMock.mockReturnValue([
      createRound({
        status: ConversationRoundStatus.awaitingPrompt,
        pending_prompts: [
          { id: 'prompt-1', type: AgentPromptType.confirmation, message: 'Proceed?' },
        ],
      }),
    ]);

    const { result } = renderHook(() => useAnchoredRoundIndex());
    expect(result.current).toBe(0);
  });

  it('drops a stale latch when the conversation gained rounds since it was set', () => {
    useConversationStreamMock.mockReturnValue(streamState({ isResponseLoading: true }));
    const { result, rerender } = renderHook(() => useAnchoredRoundIndex());
    expect(result.current).toBe(0);

    // Round data refreshed with additional rounds while nothing is active locally.
    useConversationRoundsMock.mockReturnValue([createRound(), createRound(), createRound()]);
    useConversationStreamMock.mockReturnValue(streamState());
    rerender();

    expect(result.current).toBeNull();
  });
});
