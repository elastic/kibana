/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Conversation } from '@kbn/agent-builder-common';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useStreamingContext } from '../context/streaming/streaming_context';
import type { ActiveStream } from '../context/streaming/types';
import { useConversation } from './use_conversation';
import { useAttachToActiveExecution } from './use_attach_to_active_execution';

jest.mock('../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));
jest.mock('../context/streaming/streaming_context', () => ({
  useStreamingContext: jest.fn(),
}));
jest.mock('./use_conversation', () => ({
  useConversation: jest.fn(),
}));

const mockUseConversationId = jest.mocked(useConversationId);
const mockUseStreamingContext = jest.mocked(useStreamingContext);
const mockUseConversation = jest.mocked(useConversation);

interface State {
  conversationId?: string;
  executionId?: string;
  activeStreams?: Map<string, ActiveStream>;
}

const setup = () => {
  const mutateAttach = jest.fn();
  const setState = ({ conversationId = 'conv-1', executionId, activeStreams }: State) => {
    mockUseConversationId.mockReturnValue(conversationId);
    mockUseConversation.mockReturnValue({
      conversation: {
        id: conversationId,
        active_execution: executionId ? { execution_id: executionId } : undefined,
      } as unknown as Conversation,
    } as unknown as ReturnType<typeof useConversation>);
    mockUseStreamingContext.mockReturnValue({
      activeStreams: activeStreams ?? new Map(),
      mutateAttach,
    } as unknown as ReturnType<typeof useStreamingContext>);
  };
  return { mutateAttach, setState };
};

describe('useAttachToActiveExecution', () => {
  beforeEach(() => jest.clearAllMocks());

  it('attaches when the conversation points at a running execution and nothing here streams it', () => {
    const { mutateAttach, setState } = setup();
    setState({ executionId: 'exec-1' });

    renderHook(() => useAttachToActiveExecution());

    expect(mutateAttach).toHaveBeenCalledWith({ conversationId: 'conv-1', executionId: 'exec-1' });
  });

  it('does nothing without a pointer', () => {
    const { mutateAttach, setState } = setup();
    setState({});

    renderHook(() => useAttachToActiveExecution());

    expect(mutateAttach).not.toHaveBeenCalled();
  });

  it('does nothing while this copy of the UI already streams the conversation', () => {
    const { mutateAttach, setState } = setup();
    setState({ executionId: 'exec-1', activeStreams: new Map([['conv-1', { type: 'send' }]]) });

    renderHook(() => useAttachToActiveExecution());

    expect(mutateAttach).not.toHaveBeenCalled();
  });

  it('asks again only when the pointer changes', () => {
    const { mutateAttach, setState } = setup();
    setState({ executionId: 'exec-1' });
    const { rerender } = renderHook(() => useAttachToActiveExecution());

    setState({ executionId: 'exec-1' });
    rerender();
    expect(mutateAttach).toHaveBeenCalledTimes(1);

    setState({ executionId: 'exec-2' });
    rerender();
    expect(mutateAttach).toHaveBeenCalledTimes(2);
    expect(mutateAttach).toHaveBeenLastCalledWith({
      conversationId: 'conv-1',
      executionId: 'exec-2',
    });
  });
});
