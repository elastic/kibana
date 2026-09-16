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

const renderScrollActions = (scrollContainer: HTMLDivElement, anchoredItemKey?: string) =>
  renderHook(() =>
    useConversationScrollActions({ scrollContainer, scrollContainerHeight: 400, anchoredItemKey })
  );

const withAnchoredItemAt = (scrollContainer: HTMLDivElement, top: number) => {
  const content = scrollContainer.firstElementChild as HTMLElement;
  content.getBoundingClientRect = () => ({ top: 0 } as DOMRect);
  const anchored = document.createElement('div');
  anchored.setAttribute('data-timeline-item-key', 'round-1::user_message');
  anchored.getBoundingClientRect = () => ({ top } as DOMRect);
  content.appendChild(anchored);
  return content;
};

// Scrolled to the very bottom: scrollHeight - scrollTop - clientHeight === 0.
const atBottom = () => createScrollContainer({ scrollTop: 600 });

const scrolledUp = () => createScrollContainer({ scrollTop: 100 });

describe('useConversationScrollActions', () => {
  it('shows the scroll button without moving the view when a remote round arrives at the bottom', () => {
    const scrollContainer = atBottom();
    const { result } = renderScrollActions(scrollContainer);

    expect(result.current.showScrollButton).toBe(false);

    act(() => {
      result.current.stopFollowingBottom();
    });

    expect(result.current.showScrollButton).toBe(true);
    expect(scrollContainer.scrollTop).toBe(600);
  });

  it('keeps the scroll button and the view put when a remote round arrives while scrolled up', () => {
    const scrollContainer = scrolledUp();
    const { result } = renderScrollActions(scrollContainer);

    act(() => {
      result.current.stopFollowingBottom();
    });

    expect(result.current.showScrollButton).toBe(true);
    expect(scrollContainer.scrollTop).toBe(100);
  });

  it('reserves one container height of content below the anchored item', () => {
    const scrollContainer = atBottom();
    const content = withAnchoredItemAt(scrollContainer, 100);

    renderScrollActions(scrollContainer, 'round-1::user_message');

    expect(content.style.minHeight).toBe('500px');
  });

  it('reserves nothing when no item is anchored', () => {
    const scrollContainer = atBottom();
    const content = withAnchoredItemAt(scrollContainer, 100);
    content.style.minHeight = '500px';

    renderScrollActions(scrollContainer);

    expect(content.style.minHeight).toBe('');
  });

  it('hides the scroll button when the user sends a message', () => {
    const scrollContainer = scrolledUp();
    const { result } = renderScrollActions(scrollContainer);

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
