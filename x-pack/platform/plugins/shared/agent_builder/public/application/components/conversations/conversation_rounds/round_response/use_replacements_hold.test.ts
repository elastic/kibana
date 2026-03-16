/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useReplacementsHold } from './use_replacements_hold';

describe('useReplacementsHold', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns false when hold is disabled', () => {
    const { result } = renderHook(() =>
      useReplacementsHold({
        holdEnabled: false,
        holdMaxMs: 600,
        hasHttp: true,
        replacementsId: 'repl-1',
        isResolvingReplacements: true,
      })
    );

    expect(result.current).toBe(false);
  });

  it('returns true while resolving replacements before hold timeout', () => {
    const { result } = renderHook(() =>
      useReplacementsHold({
        holdEnabled: true,
        holdMaxMs: 600,
        hasHttp: true,
        replacementsId: 'repl-1',
        isResolvingReplacements: true,
      })
    );

    expect(result.current).toBe(true);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(true);
  });

  it('returns false after hold timeout is exceeded', () => {
    const { result } = renderHook(() =>
      useReplacementsHold({
        holdEnabled: true,
        holdMaxMs: 10,
        hasHttp: true,
        replacementsId: 'repl-1',
        isResolvingReplacements: true,
      })
    );

    expect(result.current).toBe(true);

    act(() => {
      jest.advanceTimersByTime(15);
    });

    expect(result.current).toBe(false);
  });

  it('resets hold state when replacementsId changes', () => {
    const { result, rerender } = renderHook(
      ({ replacementsId }) =>
        useReplacementsHold({
          holdEnabled: true,
          holdMaxMs: 10,
          hasHttp: true,
          replacementsId,
          isResolvingReplacements: true,
        }),
      {
        initialProps: { replacementsId: 'repl-1' },
      }
    );

    act(() => {
      jest.advanceTimersByTime(15);
    });
    expect(result.current).toBe(false);

    rerender({ replacementsId: 'repl-2' });
    expect(result.current).toBe(true);
  });
});
