/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useOptimisticSelection } from './use_optimistic_selection';

describe('useOptimisticSelection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return actual value when no optimistic value is set', () => {
    const { result } = renderHook(() => useOptimisticSelection('initial-value'));

    expect(result.current.effectiveValue).toBe('initial-value');
  });

  it('should return optimistic value immediately after setting it', () => {
    const { result } = renderHook(() => useOptimisticSelection('initial-value'));

    act(() => {
      result.current.setOptimisticValue('optimistic-value');
    });

    expect(result.current.effectiveValue).toBe('optimistic-value');
  });

  it('should clear optimistic value when actual value matches it', () => {
    const { result, rerender } = renderHook(
      ({ actualValue }) => useOptimisticSelection(actualValue),
      { initialProps: { actualValue: 'initial-value' } }
    );

    // Set optimistic value
    act(() => {
      result.current.setOptimisticValue('new-value');
    });

    // Update actual value to match optimistic
    rerender({ actualValue: 'new-value' });

    expect(result.current.effectiveValue).toBe('new-value');
  });

  it('should revert to actual value after timeout when optimistic value does not match', () => {
    const { result } = renderHook(() => useOptimisticSelection('initial-value'));

    // Set optimistic value
    act(() => {
      result.current.setOptimisticValue('optimistic-value');
    });

    // Fast forward past timeout
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.effectiveValue).toBe('initial-value');
  });

  it('should use custom timeout duration', () => {
    const { result } = renderHook(() => useOptimisticSelection('initial-value', 3000));

    // Set optimistic value
    act(() => {
      result.current.setOptimisticValue('optimistic-value');
    });

    // Fast forward but not past custom timeout
    act(() => {
      jest.advanceTimersByTime(2999);
    });

    expect(result.current.effectiveValue).toBe('optimistic-value');
  });

  it('should clear optimistic value after custom timeout duration', () => {
    const { result } = renderHook(() => useOptimisticSelection('initial-value', 3000));

    // Set optimistic value
    act(() => {
      result.current.setOptimisticValue('optimistic-value');
    });

    // Fast forward past custom timeout
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.effectiveValue).toBe('initial-value');
  });

  it('should clear previous timeout when setting new optimistic value', () => {
    const { result } = renderHook(() => useOptimisticSelection('initial-value'));

    // Set first optimistic value
    act(() => {
      result.current.setOptimisticValue('first-optimistic');
    });

    // Set second optimistic value before timeout
    act(() => {
      result.current.setOptimisticValue('second-optimistic');
    });

    expect(result.current.effectiveValue).toBe('second-optimistic');
  });

  it('should handle timeout correctly after multiple optimistic updates', () => {
    const { result } = renderHook(() => useOptimisticSelection('initial-value'));

    // Set first optimistic value
    act(() => {
      result.current.setOptimisticValue('first-optimistic');
    });

    // Advance time partially
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    // Set second optimistic value
    act(() => {
      result.current.setOptimisticValue('second-optimistic');
    });

    // Advance time by full timeout duration from second update
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.effectiveValue).toBe('initial-value');
  });

  it('should work with non-string types', () => {
    const initialObj = { id: 1, name: 'initial' };
    const { result } = renderHook(() => useOptimisticSelection(initialObj));

    const optimisticObj = { id: 2, name: 'optimistic' };
    act(() => {
      result.current.setOptimisticValue(optimisticObj);
    });

    expect(result.current.effectiveValue).toBe(optimisticObj);
  });

  it('should handle null actual values', () => {
    const { result } = renderHook(() => useOptimisticSelection<string | null>(null));

    act(() => {
      result.current.setOptimisticValue('optimistic-value');
    });

    expect(result.current.effectiveValue).toBe('optimistic-value');
  });

  it('should handle undefined actual values', () => {
    const { result } = renderHook(() => useOptimisticSelection<string | undefined>(undefined));

    act(() => {
      result.current.setOptimisticValue('optimistic-value');
    });

    expect(result.current.effectiveValue).toBe('optimistic-value');
  });

  it('should clear optimistic value when actual value changes to match optimistic value from null', () => {
    const { result, rerender } = renderHook(
      ({ actualValue }) => useOptimisticSelection(actualValue),
      { initialProps: { actualValue: null as string | null } }
    );

    // Set optimistic value
    act(() => {
      result.current.setOptimisticValue('new-value');
    });

    // Update actual value to match optimistic
    rerender({ actualValue: 'new-value' });

    expect(result.current.effectiveValue).toBe('new-value');
  });

  it('should not clear optimistic value when actual value changes but does not match', () => {
    const { result, rerender } = renderHook(
      ({ actualValue }) => useOptimisticSelection(actualValue),
      { initialProps: { actualValue: 'initial-value' } }
    );

    // Set optimistic value
    act(() => {
      result.current.setOptimisticValue('optimistic-value');
    });

    // Update actual value to something different
    rerender({ actualValue: 'different-value' });

    expect(result.current.effectiveValue).toBe('optimistic-value');
  });
});
