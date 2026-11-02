/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useDebouncedOnChangeEmit } from './use_debounced_on_change_emit';

describe('useDebouncedOnChangeEmit', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces rapid emit signals into a single onChange', async () => {
    const onChange = jest.fn();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    try {
      const { rerender } = renderHook(
        ({ output, emitSignal }) => {
          return useDebouncedOnChangeEmit<number, { invalidPhases: string[] }>({
            getOutput: () => output,
            initialOutput: 0,
            onChange,
            buildMeta: () => ({ invalidPhases: [] }),
            onChangeDebounceMs: 100,
            emitSignal,
          });
        },
        { initialProps: { output: 0, emitSignal: 0 } }
      );

      // Let the initial scheduled emit settle (should not emit because equal).
      await act(async () => {
        jest.runOnlyPendingTimers();
      });
      onChange.mockClear();
      clearTimeoutSpy.mockClear();

      rerender({ output: 1, emitSignal: 1 });
      rerender({ output: 2, emitSignal: 2 });
      rerender({ output: 3, emitSignal: 3 });

      expect(onChange).toHaveBeenCalledTimes(0);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith(3, { invalidPhases: [] });
      expect(clearTimeoutSpy).toHaveBeenCalled();
    } finally {
      clearTimeoutSpy.mockRestore();
    }
  });

  it('cleans up a pending debounced emit on unmount', async () => {
    const onChange = jest.fn();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    try {
      const { rerender, unmount } = renderHook(
        ({ output, emitSignal }) => {
          return useDebouncedOnChangeEmit<number, { invalidPhases: string[] }>({
            getOutput: () => output,
            initialOutput: 0,
            onChange,
            buildMeta: () => ({ invalidPhases: [] }),
            onChangeDebounceMs: 100,
            emitSignal,
          });
        },
        { initialProps: { output: 0, emitSignal: 0 } }
      );

      await act(async () => {
        jest.runOnlyPendingTimers();
      });
      onChange.mockClear();
      clearTimeoutSpy.mockClear();

      rerender({ output: 10, emitSignal: 1 });
      unmount();

      await act(async () => {
        jest.runOnlyPendingTimers();
        jest.advanceTimersByTime(100);
      });

      expect(onChange).toHaveBeenCalledTimes(0);
      expect(clearTimeoutSpy).toHaveBeenCalled();
    } finally {
      clearTimeoutSpy.mockRestore();
    }
  });
});
