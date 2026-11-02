/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { usePollingUntil } from './use_polling_until';

const flushMicrotasks = async () => {
  await Promise.resolve();
};

describe('usePollingUntil', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('polls immediately when enabled', async () => {
    const onPoll = jest.fn().mockResolvedValue(1);
    const onUpdate = jest.fn();
    const shouldStop = jest.fn().mockReturnValue(true);

    const { result } = renderHook(() =>
      usePollingUntil<number>({
        enabled: true,
        pollIntervalMs: 1000,
        maxAttempts: 10,
        onPoll,
        onUpdate,
        shouldStop,
      })
    );

    await act(async () => {
      await flushMicrotasks();
    });

    expect(onPoll).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(1);
    expect(shouldStop).toHaveBeenCalledWith(1);
    expect(result.current).toBe('stopped');
  });

  test('stops polling when shouldStop returns true', async () => {
    const onPoll = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const onUpdate = jest.fn();
    const shouldStop = jest.fn((v: number) => v === 2);

    const { result } = renderHook(() =>
      usePollingUntil<number>({
        enabled: true,
        pollIntervalMs: 1000,
        maxAttempts: 10,
        onPoll,
        onUpdate,
        shouldStop,
      })
    );

    await act(async () => {
      await flushMicrotasks();
    });
    expect(onPoll).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('polling');

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await flushMicrotasks();
    });

    expect(onPoll).toHaveBeenCalledTimes(2);
    expect(result.current).toBe('stopped');

    await act(async () => {
      jest.advanceTimersByTime(10_000);
      await flushMicrotasks();
    });

    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  test('stops polling after maxAttempts', async () => {
    const onPoll = jest.fn().mockResolvedValue(undefined);
    const onUpdate = jest.fn();
    const shouldStop = jest.fn().mockReturnValue(false);

    const { result } = renderHook(() =>
      usePollingUntil<number>({
        enabled: true,
        pollIntervalMs: 1000,
        maxAttempts: 3,
        onPoll,
        onUpdate,
        shouldStop,
      })
    );

    await act(async () => {
      await flushMicrotasks();
    });
    expect(onPoll).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await flushMicrotasks();
      jest.advanceTimersByTime(1000);
      await flushMicrotasks();
    });

    expect(onPoll).toHaveBeenCalledTimes(3);
    expect(result.current).toBe('exhausted');

    await act(async () => {
      jest.advanceTimersByTime(10_000);
      await flushMicrotasks();
    });

    expect(onPoll).toHaveBeenCalledTimes(3);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(shouldStop).not.toHaveBeenCalled();
  });

  test('cleans up timers on unmount', async () => {
    const onPoll = jest.fn().mockResolvedValue(undefined);
    const shouldStop = jest.fn().mockReturnValue(false);

    const { unmount } = renderHook(() =>
      usePollingUntil<number>({
        enabled: true,
        pollIntervalMs: 1000,
        maxAttempts: 10,
        onPoll,
        shouldStop,
      })
    );

    await act(async () => {
      await flushMicrotasks();
    });
    expect(onPoll).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(10_000);
      await flushMicrotasks();
    });

    expect(onPoll).toHaveBeenCalledTimes(1);
  });

  test('stops polling when enabled becomes false', async () => {
    const onPoll = jest.fn().mockResolvedValue(undefined);
    const shouldStop = jest.fn().mockReturnValue(false);

    const { rerender, result } = renderHook(
      ({ enabled }) =>
        usePollingUntil<number>({
          enabled,
          pollIntervalMs: 1000,
          maxAttempts: 10,
          onPoll,
          shouldStop,
        }),
      { initialProps: { enabled: true } }
    );

    await act(async () => {
      await flushMicrotasks();
    });
    expect(onPoll).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });

    await act(async () => {
      jest.advanceTimersByTime(10_000);
      await flushMicrotasks();
    });

    expect(onPoll).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('disabled');
  });
});
