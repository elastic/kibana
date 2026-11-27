/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { EuiCommentProps } from '@elastic/eui';
import { useJumpToFirstNewActivity } from './use_jump_to_first_new_activity';

const oldComment: EuiCommentProps = { username: 'old' };
const newComment: EuiCommentProps = {
  username: 'new',
  className: 'userAction__afterLastVisit userAction__new',
};

describe('useJumpToFirstNewActivity', () => {
  const fetchNextPage = jest.fn();
  const scrollIntoView = jest.fn();
  let badge: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    badge = document.createElement('span');
    badge.setAttribute('data-test-subj', 'user-action-new-badge');
    badge.scrollIntoView = scrollIntoView;
    document.body.appendChild(badge);
  });

  afterEach(() => {
    badge.remove();
    jest.restoreAllMocks();
  });

  const render = (args: Partial<Parameters<typeof useJumpToFirstNewActivity>[0]> = {}) =>
    renderHook(
      (props) =>
        useJumpToFirstNewActivity({
          comments: [oldComment, newComment],
          newActivityTotal: 1,
          hasNextPage: false,
          isFetchingNextPage: false,
          fetchNextPage,
          ...props,
        }),
      { initialProps: args }
    );

  it('scrolls to the first new activity when all new activity is already loaded', () => {
    const { result } = render({ hasNextPage: true });

    act(() => result.current());

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('loads more activities when the new activity is collapsed', () => {
    const { result } = render({ comments: [oldComment], hasNextPage: true });

    act(() => result.current());

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls once loading brings in the new activity', () => {
    const { result, rerender } = render({ comments: [oldComment], hasNextPage: true });

    act(() => result.current());
    rerender({ comments: [oldComment, newComment], hasNextPage: true });

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('keeps loading while the new activity is still collapsed', () => {
    const { result, rerender } = render({ comments: [oldComment], hasNextPage: true });

    act(() => result.current());
    rerender({ comments: [oldComment], hasNextPage: true, isFetchingNextPage: true });
    rerender({ comments: [oldComment, oldComment], hasNextPage: true, isFetchingNextPage: false });

    expect(fetchNextPage).toHaveBeenCalledTimes(2);
  });

  it('loads more activities while some of the new activity is still collapsed', () => {
    const { result } = render({ newActivityTotal: 3, hasNextPage: true });

    act(() => result.current());

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls to the loaded new activity when no more activities can load', () => {
    const { result } = render({ newActivityTotal: 3, hasNextPage: false });

    act(() => result.current());

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('stops when no activities are left to load', () => {
    const { result } = render({ comments: [oldComment], hasNextPage: false });

    act(() => result.current());

    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('waits while a page is loading', () => {
    const { result } = render({
      comments: [oldComment],
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    act(() => result.current());

    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});
