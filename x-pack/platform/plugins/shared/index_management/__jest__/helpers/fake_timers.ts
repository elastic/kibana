/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';

/**
 * Run the currently pending fake timers (bounded by `times`).
 *
 * Prefer this over `runAllTimers*()` to avoid flushing unrelated timers.
 */
export const runPendingTimers = async (times: number = 1) => {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    // Optimization: stop early once the timer queue is drained.
    // IMPORTANT: We still run the first flush even if getTimerCount() is 0 because
    // runOnlyPendingTimersAsync() can be required to settle queued async work under fake timers.
    if (jest.getTimerCount() === 0) return;
  }
};

/**
 * Advance pending fake timers until a condition becomes true (bounded).
 *
 * Prefer this over hardcoding multiple `runOnlyPendingTimersAsync()` calls when we know
 * the observable UI state we're waiting for (e.g. a field to appear, a step to mount).
 */
export const runPendingTimersUntil = async (
  condition: () => boolean,
  maxIterations: number = 10
) => {
  for (let i = 0; i < maxIterations; i++) {
    if (condition()) return;
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  }

  expect(condition()).toBe(true);
};

/**
 * Advance fake timers by a fixed amount (ms).
 *
 * Useful for debounce windows where we know the timing (e.g. 300ms).
 */
export const advanceTimersByTime = async (ms: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};
