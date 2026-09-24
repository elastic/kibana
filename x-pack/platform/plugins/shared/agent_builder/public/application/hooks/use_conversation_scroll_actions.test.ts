/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useConversationScrollActions } from './use_conversation_scroll_actions';

const createScrollContainer = ({ scrollTop }: { scrollTop: number }) => {
  const container = document.createElement('div');
  container.appendChild(document.createElement('div'));

  Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });

  container.scrollTop = scrollTop;

  return container;
};

// Scrolled to the very bottom: scrollHeight - scrollTop - clientHeight === 0.
const atBottom = () => createScrollContainer({ scrollTop: 600 });

const scrolledUp = () => createScrollContainer({ scrollTop: 100 });

describe('useConversationScrollActions', () => {
  it('shows the scroll button without moving the view when a remote round arrives at the bottom', () => {
    const scrollContainer = atBottom();
    const { result } = renderHook(() => useConversationScrollActions({ scrollContainer }));

    expect(result.current.showScrollButton).toBe(false);

    act(() => {
      result.current.stopFollowingBottom();
    });

    expect(result.current.showScrollButton).toBe(true);
    expect(scrollContainer.scrollTop).toBe(600);
  });

  it('keeps the scroll button and the view put when a remote round arrives while scrolled up', () => {
    const scrollContainer = scrolledUp();
    const { result } = renderHook(() => useConversationScrollActions({ scrollContainer }));

    act(() => {
      result.current.stopFollowingBottom();
    });

    expect(result.current.showScrollButton).toBe(true);
    expect(scrollContainer.scrollTop).toBe(100);
  });

  it('hides the scroll button when the user sends a message', () => {
    const scrollContainer = scrolledUp();
    const { result } = renderHook(() => useConversationScrollActions({ scrollContainer }));

    act(() => {
      result.current.stopFollowingBottom();
    });

    expect(result.current.showScrollButton).toBe(true);

    act(() => {
      result.current.onMessageSent();
    });

    expect(result.current.showScrollButton).toBe(false);
  });
});
