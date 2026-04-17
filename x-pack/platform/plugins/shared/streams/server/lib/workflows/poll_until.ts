/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';

export class PollTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PollTimeoutError';
  }
}

interface PollUntilOptions {
  intervalMs?: number;
  maxAttempts?: number;
}

const DEFAULT_INTERVAL_MS = 2000;
const DEFAULT_MAX_ATTEMPTS = 30;

/**
 * Repeatedly calls `fn` until it returns a value that satisfies `predicate`,
 * waiting `intervalMs` between each attempt. Throws a `PollTimeoutError`
 * after `maxAttempts` unsuccessful polls.
 */
export const pollUntil = async <T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  { intervalMs = DEFAULT_INTERVAL_MS, maxAttempts = DEFAULT_MAX_ATTEMPTS }: PollUntilOptions = {}
): Promise<T> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const value = await fn();
    if (predicate(value)) {
      return value;
    }
    await setTimeout(intervalMs);
  }

  throw new PollTimeoutError(
    `Condition not met after ${maxAttempts} attempts (polled every ${intervalMs}ms)`
  );
};
