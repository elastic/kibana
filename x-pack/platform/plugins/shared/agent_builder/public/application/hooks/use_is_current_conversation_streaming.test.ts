/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useStreamingContext } from '../context/streaming/streaming_context';
import { useIsCurrentConversationStreaming } from './use_is_current_conversation_streaming';

jest.mock('../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));

jest.mock('../context/streaming/streaming_context', () => ({
  useStreamingContext: jest.fn(),
}));

const mockUseConversationId = jest.mocked(useConversationId);
const mockUseStreamingContext = jest.mocked(useStreamingContext);

const setStreamingConversationIds = (ids: string[]) => {
  mockUseStreamingContext.mockReturnValue({
    activeStreams: new Map(ids.map((id) => [id, { type: 'send' }])),
  } as unknown as ReturnType<typeof useStreamingContext>);
};

describe('useIsCurrentConversationStreaming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is streaming when the current conversation has a stream in flight', () => {
    mockUseConversationId.mockReturnValue('a');
    setStreamingConversationIds(['a']);

    const { result } = renderHook(() => useIsCurrentConversationStreaming());

    expect(result.current).toBe(true);
  });

  it('is not streaming when only another conversation has a stream in flight', () => {
    mockUseConversationId.mockReturnValue('a');
    setStreamingConversationIds(['b']);

    const { result } = renderHook(() => useIsCurrentConversationStreaming());

    expect(result.current).toBe(false);
  });

  it('is not streaming when there is no current conversation', () => {
    mockUseConversationId.mockReturnValue(undefined);
    setStreamingConversationIds([]);

    const { result } = renderHook(() => useIsCurrentConversationStreaming());

    expect(result.current).toBe(false);
  });
});
