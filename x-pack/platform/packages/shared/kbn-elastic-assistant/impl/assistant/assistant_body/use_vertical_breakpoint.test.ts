/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useVerticalBreakpoint } from './use_vertical_breakpoint';

describe('useVerticalBreakpoint', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setWindowHeight(height: number) {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  }

  it('returns "short" for height < 600', () => {
    setWindowHeight(500);
    const { result } = renderHook(() => useVerticalBreakpoint());
    expect(result.current).toBe('short');
  });

  it('returns "medium" for 600 <= height < 1100', () => {
    setWindowHeight(800);
    const { result } = renderHook(() => useVerticalBreakpoint());
    expect(result.current).toBe('medium');
  });

  it('returns "tall" for height >= 1100', () => {
    setWindowHeight(1200);
    const { result } = renderHook(() => useVerticalBreakpoint());
    expect(result.current).toBe('tall');
  });

  it('updates value on window resize once debounced', () => {
    setWindowHeight(1200);
    const { result } = renderHook(() => useVerticalBreakpoint());
    expect(result.current).toBe('tall');
    setWindowHeight(500);
    expect(result.current).toBe('tall');
    act(() => {
      jest.advanceTimersByTime(100); // debounce
    });
    expect(result.current).toBe('short');
  });
});
