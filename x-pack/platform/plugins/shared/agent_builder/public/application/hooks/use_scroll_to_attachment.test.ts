/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { SCROLL_TO_ATTACHMENT_DELAY_MS, useScrollToAttachment } from './use_scroll_to_attachment';

const target = { id: 'att-1', version: 2 };

const renderScrollToAttachment = ({ isFetched = true }: { isFetched?: boolean } = {}) => {
  const scrollToAttachment = jest.fn(() => true);
  const clearTarget = jest.fn();
  const hook = renderHook(
    (props: { isFetched: boolean }) =>
      useScrollToAttachment({
        isFetched: props.isFetched,
        conversationId: 'conv-1',
        target,
        scrollToAttachment,
        clearTarget,
      }),
    { initialProps: { isFetched } }
  );
  return { ...hook, scrollToAttachment, clearTarget };
};

describe('useScrollToAttachment', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits for the conversation to load', () => {
    const { rerender, scrollToAttachment } = renderScrollToAttachment({ isFetched: false });

    act(() => {
      jest.advanceTimersByTime(SCROLL_TO_ATTACHMENT_DELAY_MS);
    });
    expect(scrollToAttachment).not.toHaveBeenCalled();

    rerender({ isFetched: true });
    act(() => {
      jest.advanceTimersByTime(SCROLL_TO_ATTACHMENT_DELAY_MS);
    });
    expect(scrollToAttachment).toHaveBeenCalledWith(target);
  });

  it('scrolls only after the delay, then clears the target', () => {
    const { scrollToAttachment, clearTarget } = renderScrollToAttachment();

    act(() => {
      jest.advanceTimersByTime(SCROLL_TO_ATTACHMENT_DELAY_MS - 1);
    });
    expect(scrollToAttachment).not.toHaveBeenCalled();
    expect(clearTarget).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(scrollToAttachment).toHaveBeenCalledTimes(1);
    expect(clearTarget).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a target', () => {
    const scrollToAttachment = jest.fn(() => true);
    const clearTarget = jest.fn();
    renderHook(() =>
      useScrollToAttachment({
        isFetched: true,
        conversationId: 'conv-1',
        scrollToAttachment,
        clearTarget,
      })
    );

    act(() => {
      jest.advanceTimersByTime(SCROLL_TO_ATTACHMENT_DELAY_MS);
    });
    expect(scrollToAttachment).not.toHaveBeenCalled();
    expect(clearTarget).not.toHaveBeenCalled();
  });
});
