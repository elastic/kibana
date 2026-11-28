/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { ConversationParentRelation } from '@kbn/agent-builder-common';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { useConversation } from '../../../../hooks/use_conversation';
import { useCreateThread } from '../../../../hooks/use_create_thread';
import { useIsThreadsEnabled } from '../../../../hooks/use_is_threads_enabled';
import { useSlashCommands } from './use_slash_commands';
import { useThreadCommand } from './use_thread_command';

jest.mock('../../../../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));
jest.mock('../../../../hooks/use_conversation', () => ({ useConversation: jest.fn() }));
jest.mock('../../../../hooks/use_create_thread', () => ({ useCreateThread: jest.fn() }));
jest.mock('../../../../hooks/use_is_threads_enabled', () => ({ useIsThreadsEnabled: jest.fn() }));

const createThread = jest.fn();

const setState = ({
  conversationId = 'conv-1',
  relation,
  isThreadsEnabled = true,
}: {
  conversationId?: string | null;
  relation?: ConversationParentRelation;
  isThreadsEnabled?: boolean;
} = {}) => {
  jest.mocked(useConversationId).mockReturnValue(conversationId ?? undefined);
  jest.mocked(useConversation).mockReturnValue({
    conversation: relation
      ? { id: conversationId, parent_conversation: { id: 'parent-1', relation } }
      : { id: conversationId },
  } as never);
  jest.mocked(useCreateThread).mockReturnValue({ mutateAsync: createThread } as never);
  jest.mocked(useIsThreadsEnabled).mockReturnValue(isThreadsEnabled);
};

describe('useThreadCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createThread.mockResolvedValue({ thread_id: 'thread-1' });
  });

  it('describes the thread command', () => {
    setState();
    const { result } = renderHook(() => useThreadCommand());

    expect(result.current).toMatchObject({
      name: 'thread',
      description: 'Start new sub-conversation',
      iconType: 'comment',
    });
    expect(result.current.unavailableReason).toBeUndefined();
  });

  it('is unavailable without a conversation', () => {
    setState({ conversationId: null });
    const { result } = renderHook(() => useThreadCommand());

    expect(result.current.unavailableReason).toEqual(
      expect.stringContaining('existing conversation')
    );
  });

  it('is unavailable inside a thread', () => {
    setState({ relation: ConversationParentRelation.thread });
    const { result } = renderHook(() => useThreadCommand());

    expect(result.current.unavailableReason).toEqual(expect.stringContaining('inside a thread'));
  });

  it('starts a thread seeded with the text', async () => {
    setState();
    const { result } = renderHook(() => useThreadCommand());

    await act(() => result.current.run('  dig into this '));

    expect(createThread).toHaveBeenCalledWith({ highlightText: 'dig into this' });
  });

  it('starts an empty thread without text', async () => {
    setState();
    const { result } = renderHook(() => useThreadCommand());

    await act(() => result.current.run(''));

    expect(createThread).toHaveBeenCalledWith({});
  });

  it('rejects when the thread cannot be created', async () => {
    setState();
    createThread.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useThreadCommand());

    await expect(result.current.run('text')).rejects.toThrow('boom');
  });
});

describe('useSlashCommands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists the thread command when threads are enabled', () => {
    setState();
    const { result } = renderHook(() => useSlashCommands());

    expect(result.current.map(({ name }) => name)).toEqual(['thread']);
  });

  it('lists no commands when threads are disabled', () => {
    setState({ isThreadsEnabled: false });
    const { result } = renderHook(() => useSlashCommands());

    expect(result.current).toEqual([]);
  });

  it('keeps unavailable commands so they can be refused when typed', () => {
    setState({ conversationId: null });
    const { result } = renderHook(() => useSlashCommands());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].unavailableReason).toBeDefined();
  });
});
