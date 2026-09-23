/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Conversation } from '@kbn/agent-builder-common';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useStreamingContext, useStreamRecord } from '../context/streaming/streaming_context';
import { pendingRoundId } from '../utils/new_conversation';
import { useIsUnpersistedConversation } from './use_conversation';

jest.mock('../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));

jest.mock('../context/streaming/streaming_context', () => ({
  useStreamingContext: jest.fn(),
  useStreamRecord: jest.fn(),
}));

const mockUseConversationId = jest.mocked(useConversationId);
const mockUseStreamingContext = jest.mocked(useStreamingContext);
const mockUseStreamRecord = jest.mocked(useStreamRecord);

const createConversation = (roundIds: string[]) =>
  ({
    id: 'conversation-1',
    rounds: roundIds.map((id) => ({ id })),
  } as Conversation);

const renderUseIsUnpersistedConversation = ({
  conversation = createConversation([]),
  isStreaming = false,
  pendingMessage,
  error,
}: {
  conversation?: Conversation;
  isStreaming?: boolean;
  pendingMessage?: string;
  error?: Error;
} = {}) => {
  mockUseConversationId.mockReturnValue('conversation-1');
  mockUseStreamingContext.mockReturnValue({
    activeStreams: isStreaming ? new Map([['conversation-1', { type: 'send' }]]) : new Map(),
    byConversationId: {},
    mutateSendMessage: jest.fn(),
    mutateResumeRound: jest.fn(),
    cancelStream: jest.fn(),
    cancelAllStreams: jest.fn(),
    removeError: jest.fn(),
    removeAllErrors: jest.fn(),
  });
  mockUseStreamRecord.mockReturnValue({
    pendingMessage,
    error,
    errorSteps: [],
  });

  return renderHook(() => useIsUnpersistedConversation(conversation));
};

describe('useIsUnpersistedConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true while a new conversation still has the optimistic pending round', () => {
    const { result } = renderUseIsUnpersistedConversation({
      conversation: createConversation([pendingRoundId]),
      isStreaming: true,
    });

    expect(result.current).toBe(true);
  });

  it('returns true after an unpersisted new conversation stream fails', () => {
    const { result } = renderUseIsUnpersistedConversation({
      conversation: createConversation([]),
      pendingMessage: 'hello',
      error: new Error('boom'),
    });

    expect(result.current).toBe(true);
  });

  it('returns false during later streams on persisted conversations', () => {
    const { result } = renderUseIsUnpersistedConversation({
      conversation: createConversation(['round-1']),
      isStreaming: true,
    });

    expect(result.current).toBe(false);
  });

  it('returns false for persisted conversations with rounds after stream errors', () => {
    const { result } = renderUseIsUnpersistedConversation({
      conversation: createConversation(['round-1']),
      pendingMessage: 'hello',
      error: new Error('boom'),
    });

    expect(result.current).toBe(false);
  });
});
