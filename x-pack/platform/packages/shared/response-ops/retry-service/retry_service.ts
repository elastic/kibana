/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BackoffFactory, RetryReporter } from './types';

const noopReporter: RetryReporter = {
  onAttempt: () => {},
  onRetry: () => {},
  onSettled: () => {},
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Retries a callback on retryable errors with a backoff delay between attempts.
 * Instances hold only the policy, so one instance can run any number of
 * operations, including concurrently.
 */
export abstract class RetryService {
  private readonly backOffFactory: BackoffFactory;
  private readonly maxAttempts: number;

  constructor(backOffFactory: BackoffFactory, maxAttempts: number = 10) {
    this.backOffFactory = backOffFactory;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Runs `cb` until it resolves, throws a non-retryable error, or `maxAttempts`
   * retries are exhausted. The optional `reporter` observes this run only.
   */
  public async retryWithBackoff<T>(
    cb: () => Promise<T>,
    reporter: RetryReporter = noopReporter
  ): Promise<T> {
    const backOffStrategy = this.backOffFactory.create();
    let attempt = 0;

    try {
      while (true) {
        try {
          reporter.onAttempt(attempt);

          return await cb();
        } catch (error) {
          if (attempt >= this.maxAttempts || !this.isRetryableError(error)) {
            throw error;
          }

          attempt++;

          await delay(backOffStrategy.nextBackOff());

          reporter.onRetry(error, attempt);
        }
      }
    } finally {
      reporter.onSettled(attempt);
    }
  }

  protected abstract isRetryableError(error: Error): boolean;
}
