/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useCompactOnScroll } from './use_compact_on_scroll';

const SAVING = 60;

const createScroller = ({
  scrollHeight,
  clientHeight,
}: {
  scrollHeight: number;
  clientHeight: number;
}) => {
  const scroller = document.createElement('div');
  Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: clientHeight });
  return scroller;
};

const scrollTo = (scroller: HTMLElement, scrollTop: number) =>
  act(() => {
    scroller.scrollTop = scrollTop;
    scroller.dispatchEvent(new Event('scroll'));
  });

describe('useCompactOnScroll', () => {
  it('goes compact once the content scrolls, and back at the top', () => {
    const scroller = createScroller({ scrollHeight: 800, clientHeight: 300 });
    const { result } = renderHook(() => useCompactOnScroll(scroller, SAVING));

    expect(result.current).toBe(false);

    scrollTo(scroller, 10);
    expect(result.current).toBe(true);

    scrollTo(scroller, 0);
    expect(result.current).toBe(false);
  });

  it('stays as is when going compact would leave nothing to scroll', () => {
    const scroller = createScroller({ scrollHeight: 340, clientHeight: 300 });
    const { result } = renderHook(() => useCompactOnScroll(scroller, SAVING));

    scrollTo(scroller, 10);

    expect(result.current).toBe(false);
  });

  it('stays compact while scrolled, even once there is less left to scroll', () => {
    const scroller = createScroller({ scrollHeight: 800, clientHeight: 300 });
    const { result } = renderHook(() => useCompactOnScroll(scroller, SAVING));

    scrollTo(scroller, 10);
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 780 });
    scrollTo(scroller, 5);

    expect(result.current).toBe(true);
  });

  it('is never compact without a scroller', () => {
    const { result } = renderHook(() => useCompactOnScroll(null, SAVING));

    expect(result.current).toBe(false);
  });
});
