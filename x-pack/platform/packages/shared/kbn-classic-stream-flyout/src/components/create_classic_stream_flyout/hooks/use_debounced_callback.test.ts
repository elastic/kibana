/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useDebouncedCallback } from './use_debounced_callback';

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should debounce callback execution', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current.trigger('arg1');
      });

      expect(callback).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('arg1');
    });

    it('should cancel previous timeout when triggered multiple times', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current.trigger('first');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      act(() => {
        result.current.trigger('second');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      act(() => {
        result.current.trigger('third');
      });

      expect(callback).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      // Should only call with the last argument
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('third');
    });

    it('should handle multiple arguments', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current.trigger('arg1', 'arg2', 'arg3');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });
  });

  describe('cancel functionality', () => {
    it('should cancel pending callback', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current.trigger('arg1');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      act(() => {
        result.current.cancel();
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should be safe to call cancel multiple times', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current.trigger('arg1');
      });

      act(() => {
        result.current.cancel();
        result.current.cancel();
        result.current.cancel();
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should be safe to call cancel when no callback is pending', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      expect(() => {
        act(() => {
          result.current.cancel();
        });
      }).not.toThrow();
    });
  });

  describe('callback updates', () => {
    it('should always call the latest callback', async () => {
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();

      const { result, rerender } = renderHook(
        ({ callback }) => useDebouncedCallback(callback, 300),
        { initialProps: { callback: firstCallback } }
      );

      act(() => {
        result.current.trigger('arg1');
      });

      // Update the callback before the timeout completes
      rerender({ callback: secondCallback });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(firstCallback).not.toHaveBeenCalled();
      expect(secondCallback).toHaveBeenCalledTimes(1);
      expect(secondCallback).toHaveBeenCalledWith('arg1');
    });

    it('should access latest closure values', async () => {
      const results: number[] = [];
      let externalValue = 1;

      const { result, rerender } = renderHook(
        ({ value }) => {
          externalValue = value;
          return useDebouncedCallback(() => {
            results.push(externalValue);
          }, 300);
        },
        { initialProps: { value: 1 } }
      );

      act(() => {
        result.current.trigger();
      });

      // Update external value before timeout completes
      rerender({ value: 2 });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      // Should use the latest value
      expect(results).toEqual([2]);
    });
  });

  describe('delay changes', () => {
    it('should use updated delay for new triggers', async () => {
      const callback = jest.fn();
      const { result, rerender } = renderHook(
        ({ delay }) => useDebouncedCallback(callback, delay),
        { initialProps: { delay: 300 } }
      );

      act(() => {
        result.current.trigger('first');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(callback).toHaveBeenCalledWith('first');
      callback.mockClear();

      // Change delay
      rerender({ delay: 500 });

      act(() => {
        result.current.trigger('second');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(callback).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(200);
      });

      expect(callback).toHaveBeenCalledWith('second');
    });
  });

  describe('cleanup', () => {
    it('should cancel pending callback on unmount', async () => {
      const callback = jest.fn();
      const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current.trigger('arg1');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      unmount();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('function stability', () => {
    it('should return stable trigger and cancel functions', () => {
      const callback = jest.fn();
      const { result, rerender } = renderHook(({ cb }) => useDebouncedCallback(cb, 300), {
        initialProps: { cb: callback },
      });

      const initialTrigger = result.current.trigger;
      const initialCancel = result.current.cancel;

      // Rerender with new callback
      rerender({ cb: jest.fn() });

      expect(result.current.trigger).toBe(initialTrigger);
      expect(result.current.cancel).toBe(initialCancel);
    });

    it('should update trigger function when delay changes', () => {
      const callback = jest.fn();
      const { result, rerender } = renderHook(
        ({ delay }) => useDebouncedCallback(callback, delay),
        { initialProps: { delay: 300 } }
      );

      const initialTrigger = result.current.trigger;

      // Rerender with new delay
      rerender({ delay: 500 });

      // Trigger function reference changes when delay changes (due to dependency)
      expect(result.current.trigger).not.toBe(initialTrigger);
    });
  });

  describe('edge cases', () => {
    it('should handle zero delay', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 0));

      act(() => {
        result.current.trigger('arg1');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

      expect(callback).toHaveBeenCalledWith('arg1');
    });

    it('should handle async callbacks', async () => {
      const callback = jest.fn(async (value: string) => {
        return `processed-${value}`;
      });

      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current.trigger('test');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(callback).toHaveBeenCalledWith('test');
    });

    it('should handle callbacks that throw errors', async () => {
      const callback = jest.fn((value: string) => {
        throw new Error('Test error');
      });

      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current.trigger('arg1');
      });

      // For error testing, we need to use a try-catch instead of expect().toThrow()
      let thrownError: Error | null = null;
      try {
        await act(async () => {
          await jest.advanceTimersByTimeAsync(300);
        });
      } catch (error) {
        thrownError = error as Error;
      }

      expect(thrownError).toBeTruthy();
      expect(thrownError?.message).toBe('Test error');
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('real-world usage patterns', () => {
    it('should handle rapid successive triggers (simulating fast typing)', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      // Simulate rapid typing
      act(() => {
        result.current.trigger('a');
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      act(() => {
        result.current.trigger('ab');
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      act(() => {
        result.current.trigger('abc');
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      act(() => {
        result.current.trigger('abcd');
      });

      expect(callback).not.toHaveBeenCalled();

      // Wait for debounce to complete
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      // Should only call once with the final value
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('abcd');
    });

    it('should handle trigger after long pause (simulating user stopping typing)', async () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current.trigger('first');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(callback).toHaveBeenCalledWith('first');
      callback.mockClear();

      // Long pause, then trigger again
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000);
      });

      act(() => {
        result.current.trigger('second');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(callback).toHaveBeenCalledWith('second');
    });
  });
});
