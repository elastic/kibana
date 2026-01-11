/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

/**
 * Timer-runtime helpers for suites that opt into MODERN fake timers (jest.useFakeTimers()).
 */

export const advanceTime = async (ms: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

  // Some code schedules follow-up work on 0ms timers (e.g. http mock resolution).
  // Flush those pending timers so call sites can assert immediately after advanceTime.
  if (jest.getTimerCount() > 0) {
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  }
};
