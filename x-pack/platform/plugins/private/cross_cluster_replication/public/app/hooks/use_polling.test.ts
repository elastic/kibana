/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { usePolling } from './use_polling';

describe('usePolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic polling functionality', () => {
    it('should start polling at correct intervals', () => {
      const onPoll = jest.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(1000, onPoll);
      });

      expect(result.current.isPolling).toBe(true);
      expect(onPoll).not.toHaveBeenCalled();

      // First poll after 1s
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Second poll after another 1s
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onPoll).toHaveBeenCalledTimes(2);

      // Third poll after another 1s
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onPoll).toHaveBeenCalledTimes(3);
    });

    it('should not poll before interval completes', () => {
      const onPoll = jest.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(1000, onPoll);
      });

      // Advance time but not enough for a poll
      act(() => {
        jest.advanceTimersByTime(999);
      });
      expect(onPoll).not.toHaveBeenCalled();

      // Complete the interval
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(onPoll).toHaveBeenCalledTimes(1);
    });

    it('should stop polling when stopPolling is called', () => {
      const onPoll = jest.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(1000, onPoll);
      });

      expect(result.current.isPolling).toBe(true);

      // First poll
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Stop polling
      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);

      // Advance time - should not poll anymore
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(onPoll).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout functionality', () => {
    it('should call onTimeout and stop polling after timeout', () => {
      const onPoll = jest.fn();
      const onTimeout = jest.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(1000, onPoll, 3000, onTimeout);
      });

      expect(result.current.isPolling).toBe(true);

      // First poll at 1s
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onPoll).toHaveBeenCalledTimes(1);
      expect(onTimeout).not.toHaveBeenCalled();
      expect(result.current.isPolling).toBe(true);

      // Second poll at 2s
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onPoll).toHaveBeenCalledTimes(2);
      expect(onTimeout).not.toHaveBeenCalled();

      // Timeout at 3s (interval also fires at this time, so onPoll is called once more before stopping)
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onTimeout).toHaveBeenCalledTimes(1);
      expect(result.current.isPolling).toBe(false);
      expect(onPoll).toHaveBeenCalledTimes(3); // Third poll happens at the same time as timeout

      // No more polling after timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(onPoll).toHaveBeenCalledTimes(3);
    });

    it('should work without timeout callback', () => {
      const onPoll = jest.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(1000, onPoll, 2000);
      });

      // Poll once at 1s
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Timeout at 2s (interval also fires, so onPoll called once more)
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current.isPolling).toBe(false);
      expect(onPoll).toHaveBeenCalledTimes(2);

      // No more polls
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(onPoll).toHaveBeenCalledTimes(2);
    });

    it('should not set timeout when timeoutMs is not provided', () => {
      const onPoll = jest.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(1000, onPoll);
      });

      // Should continue polling indefinitely
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(onPoll).toHaveBeenCalledTimes(10);
      expect(result.current.isPolling).toBe(true);
    });
  });

  describe('cleanup logic', () => {
    it('should clear polling on unmount', () => {
      const onPoll = jest.fn();
      const { result, unmount } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(1000, onPoll);
      });

      // One poll before unmount
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onPoll).toHaveBeenCalledTimes(1);

      unmount();

      // No more polls after unmount
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(onPoll).toHaveBeenCalledTimes(1);
    });

    it('should clear timeout on unmount', () => {
      const onPoll = jest.fn();
      const onTimeout = jest.fn();
      const { result, unmount } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(1000, onPoll, 5000, onTimeout);
      });

      unmount();

      // Timeout should not fire after unmount
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('should handle multiple start/stop cycles', () => {
      const onPoll = jest.fn();
      const { result } = renderHook(() => usePolling());

      // First cycle
      act(() => {
        result.current.startPolling(1000, onPoll);
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(onPoll).toHaveBeenCalledTimes(2);

      act(() => {
        result.current.stopPolling();
      });

      // Second cycle with different callback
      const onPoll2 = jest.fn();
      act(() => {
        result.current.startPolling(1000, onPoll2);
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(onPoll2).toHaveBeenCalledTimes(2);
      expect(onPoll).toHaveBeenCalledTimes(2); // Should not increase

      act(() => {
        result.current.stopPolling();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle calling stopPolling when not polling', () => {
      const { result } = renderHook(() => usePolling());

      expect(result.current.isPolling).toBe(false);

      // Should not throw error
      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);
    });

    it('should handle calling stopPolling multiple times', () => {
      const onPoll = jest.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(1000, onPoll);
      });

      act(() => {
        result.current.stopPolling();
        result.current.stopPolling();
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);

      // Should not poll
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(onPoll).not.toHaveBeenCalled();
    });

    it('should handle starting polling while already polling', () => {
      const onPoll1 = jest.fn();
      const onPoll2 = jest.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(1000, onPoll1);
      });

      // Start new polling without stopping
      act(() => {
        result.current.startPolling(1000, onPoll2);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Both callbacks might be called due to overlapping intervals
      // This tests the current behavior
      expect(onPoll1).toHaveBeenCalled();
      expect(onPoll2).toHaveBeenCalled();
    });

    it('should clear both interval and timeout when stopPolling is called', () => {
      const onPoll = jest.fn();
      const onTimeout = jest.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(1000, onPoll, 5000, onTimeout);
      });

      // Poll once
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onPoll).toHaveBeenCalledTimes(1);

      // Stop before timeout
      act(() => {
        result.current.stopPolling();
      });

      // Neither should fire
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(onPoll).toHaveBeenCalledTimes(1);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('timing verification', () => {
    it('should maintain exact polling intervals', () => {
      const onPoll = jest.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(500, onPoll);
      });

      // Poll at exact 500ms intervals
      for (let i = 1; i <= 5; i++) {
        act(() => {
          jest.advanceTimersByTime(500);
        });
        expect(onPoll).toHaveBeenCalledTimes(i);
      }
    });

    it('should respect different interval times', () => {
      const onPoll1 = jest.fn();
      const onPoll2 = jest.fn();

      const { result: result1 } = renderHook(() => usePolling());
      const { result: result2 } = renderHook(() => usePolling());

      act(() => {
        result1.current.startPolling(1000, onPoll1);
        result2.current.startPolling(2000, onPoll2);
      });

      // After 1s: onPoll1 called once
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onPoll1).toHaveBeenCalledTimes(1);
      expect(onPoll2).not.toHaveBeenCalled();

      // After 2s total: onPoll1 called twice, onPoll2 once
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onPoll1).toHaveBeenCalledTimes(2);
      expect(onPoll2).toHaveBeenCalledTimes(1);

      act(() => {
        result1.current.stopPolling();
        result2.current.stopPolling();
      });
    });
  });
});
