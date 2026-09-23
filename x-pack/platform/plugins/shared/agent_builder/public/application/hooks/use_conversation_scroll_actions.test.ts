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
  container.getBoundingClientRect = () => ({ top: 0, bottom: 400 } as DOMRect);

  container.scrollTop = scrollTop;

  return container;
};

const renderScrollActions = (
  scrollContainer: HTMLDivElement,
  timelineContent: HTMLDivElement | null = null,
  anchoredItemKey?: string
) =>
  renderHook(() =>
    useConversationScrollActions({
      scrollContainer,
      scrollContainerHeight: 400,
      timelineContent,
      anchoredItemKey,
    })
  );

// One timeline item spanning `top` to `bottom` in viewport coordinates.
const withItem = (
  scrollContainer: HTMLDivElement,
  { top, bottom }: { top: number; bottom: number }
) => {
  const timelineContent = document.createElement('div');
  timelineContent.getBoundingClientRect = () => ({ top: 0 } as DOMRect);
  const item = document.createElement('div');
  item.setAttribute('data-timeline-item-key', 'round-1::user_message');
  item.getBoundingClientRect = () => ({ top, bottom } as DOMRect);
  timelineContent.appendChild(item);
  scrollContainer.firstElementChild!.appendChild(timelineContent);
  return timelineContent;
};

const withAnchoredItemAt = (scrollContainer: HTMLDivElement, top: number) =>
  withItem(scrollContainer, { top, bottom: top + 100 });

// Content continues 200px below the visible area.
const withContentBelow = (scrollContainer: HTMLDivElement) =>
  withItem(scrollContainer, { top: 100, bottom: 600 });

// Scrolled to the very bottom: scrollHeight - scrollTop - clientHeight === 0.
const atBottom = () => createScrollContainer({ scrollTop: 600 });

const scrolledUp = () => createScrollContainer({ scrollTop: 100 });

describe('useConversationScrollActions', () => {
  it('shows the scroll button without moving the view when a remote message arrives below the visible area', () => {
    const scrollContainer = atBottom();
    const { result } = renderScrollActions(scrollContainer, withContentBelow(scrollContainer));

    expect(result.current.showScrollButton).toBe(false);

    act(() => {
      result.current.stopFollowingBottom();
    });

    expect(result.current.showScrollButton).toBe(true);
    expect(scrollContainer.scrollTop).toBe(600);
  });

  it('does not show the scroll button when only reserved space is below the visible area', () => {
    const scrollContainer = scrolledUp();
    const { result } = renderScrollActions(
      scrollContainer,
      withItem(scrollContainer, { top: 100, bottom: 300 })
    );

    act(() => {
      result.current.stopFollowingBottom();
    });

    expect(result.current.showScrollButton).toBe(false);
  });

  it('keeps the scroll button and the view put when a remote message arrives while scrolled up', () => {
    const scrollContainer = scrolledUp();
    const { result } = renderScrollActions(scrollContainer, withContentBelow(scrollContainer));

    act(() => {
      result.current.stopFollowingBottom();
    });

    expect(result.current.showScrollButton).toBe(true);
    expect(scrollContainer.scrollTop).toBe(100);
  });

  it('reserves one container height of content below the anchored item', () => {
    const scrollContainer = atBottom();
    const content = withAnchoredItemAt(scrollContainer, 100);

    renderScrollActions(scrollContainer, content, 'round-1::user_message');

    expect(content.style.minHeight).toBe('500px');
  });

  it('reserves nothing when no item is anchored', () => {
    const scrollContainer = atBottom();
    const content = withAnchoredItemAt(scrollContainer, 100);
    content.style.minHeight = '500px';

    renderScrollActions(scrollContainer, content);

    expect(content.style.minHeight).toBe('');
  });

  it('hides the scroll button when the user sends a message', () => {
    const scrollContainer = scrolledUp();
    const { result } = renderScrollActions(scrollContainer, withContentBelow(scrollContainer));

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
