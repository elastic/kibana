/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import {
  ConversationMessageQueueProvider,
  MAX_MESSAGE_QUEUE_SIZE,
  useConversationMessageQueue,
} from './conversation_message_queue_context';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConversationMessageQueueProvider>{children}</ConversationMessageQueueProvider>
);

const CONVO_A = 'conv-a';
const CONVO_B = 'conv-b';

describe('ConversationMessageQueueContext', () => {
  it('enqueues messages in FIFO order for a conversation', () => {
    const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

    act(() => {
      result.current.enqueue(CONVO_A, 'first');
      result.current.enqueue(CONVO_A, 'second');
    });

    expect(result.current.queues.get(CONVO_A)).toEqual(['first', 'second']);
  });

  it('caps the queue at MAX_MESSAGE_QUEUE_SIZE and drops further enqueues silently', () => {
    const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

    act(() => {
      for (let i = 1; i <= MAX_MESSAGE_QUEUE_SIZE + 2; i++) {
        result.current.enqueue(CONVO_A, `msg-${i}`);
      }
    });

    expect(result.current.queues.get(CONVO_A)).toEqual(['msg-1', 'msg-2', 'msg-3']);
    expect(result.current.queues.get(CONVO_A)).toHaveLength(MAX_MESSAGE_QUEUE_SIZE);
  });

  it('isolates queues across conversation ids', () => {
    const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

    act(() => {
      result.current.enqueue(CONVO_A, 'a1');
      result.current.enqueue(CONVO_B, 'b1');
      result.current.enqueue(CONVO_A, 'a2');
    });

    expect(result.current.queues.get(CONVO_A)).toEqual(['a1', 'a2']);
    expect(result.current.queues.get(CONVO_B)).toEqual(['b1']);

    act(() => {
      result.current.remove(CONVO_A, 0);
    });

    expect(result.current.queues.get(CONVO_A)).toEqual(['a2']);
    expect(result.current.queues.get(CONVO_B)).toEqual(['b1']);
  });

  it('throws when useConversationMessageQueue is used outside the provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useConversationMessageQueue())).toThrow(
        /must be used within a ConversationMessageQueueProvider/
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  describe('isMessageQueueFull', () => {
    it('returns false while the queue is under capacity', () => {
      const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

      expect(result.current.isMessageQueueFull(CONVO_A)).toBe(false);

      act(() => {
        result.current.enqueue(CONVO_A, 'one');
        result.current.enqueue(CONVO_A, 'two');
      });

      expect(result.current.isMessageQueueFull(CONVO_A)).toBe(false);
    });

    it('returns true once the queue has three messages', () => {
      const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

      act(() => {
        result.current.enqueue(CONVO_A, 'one');
        result.current.enqueue(CONVO_A, 'two');
        result.current.enqueue(CONVO_A, 'three');
      });

      expect(result.current.isMessageQueueFull(CONVO_A)).toBe(true);
    });

    it('stays true after a rejected enqueue attempt', () => {
      const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

      act(() => {
        result.current.enqueue(CONVO_A, 'one');
        result.current.enqueue(CONVO_A, 'two');
        result.current.enqueue(CONVO_A, 'three');
        result.current.enqueue(CONVO_A, 'four');
      });

      expect(result.current.isMessageQueueFull(CONVO_A)).toBe(true);
      expect(result.current.queues.get(CONVO_A)).toEqual(['one', 'two', 'three']);
    });
  });

  describe('remove', () => {
    it('removes the message at the given index', () => {
      const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

      act(() => {
        result.current.enqueue(CONVO_A, 'a');
        result.current.enqueue(CONVO_A, 'b');
        result.current.enqueue(CONVO_A, 'c');
      });

      act(() => {
        result.current.remove(CONVO_A, 1);
      });

      expect(result.current.queues.get(CONVO_A)).toEqual(['a', 'c']);
    });

    it('deletes the map entry when the last remaining message is removed', () => {
      const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

      act(() => {
        result.current.enqueue(CONVO_A, 'only');
      });

      act(() => {
        result.current.remove(CONVO_A, 0);
      });

      expect(result.current.queues.has(CONVO_A)).toBe(false);
    });

    it('is a no-op for an out-of-range index', () => {
      const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

      act(() => {
        result.current.enqueue(CONVO_A, 'a');
      });

      const before = result.current.queues.get(CONVO_A);

      act(() => {
        result.current.remove(CONVO_A, 5);
        result.current.remove(CONVO_A, -1);
      });

      expect(result.current.queues.get(CONVO_A)).toEqual(before);
    });

    it('is a no-op when the conversation has no queue', () => {
      const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

      act(() => {
        result.current.remove(CONVO_A, 0);
      });

      expect(result.current.queues.has(CONVO_A)).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes every message for the given conversation', () => {
      const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

      act(() => {
        result.current.enqueue(CONVO_A, 'a');
        result.current.enqueue(CONVO_A, 'b');
        result.current.enqueue(CONVO_A, 'c');
      });

      act(() => {
        result.current.clear(CONVO_A);
      });

      expect(result.current.queues.has(CONVO_A)).toBe(false);
    });

    it('does not affect other conversations', () => {
      const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });

      act(() => {
        result.current.enqueue(CONVO_A, 'a1');
        result.current.enqueue(CONVO_B, 'b1');
      });

      act(() => {
        result.current.clear(CONVO_A);
      });

      expect(result.current.queues.has(CONVO_A)).toBe(false);
      expect(result.current.queues.get(CONVO_B)).toEqual(['b1']);
    });

    it('is a no-op when the conversation has no queue', () => {
      const { result } = renderHook(() => useConversationMessageQueue(), { wrapper });
      const before = result.current.queues;

      act(() => {
        result.current.clear(CONVO_A);
      });

      expect(result.current.queues).toBe(before);
    });
  });
});
