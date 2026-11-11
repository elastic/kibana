/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BackoffStrategy {
  nextBackOff: () => number;
}

export interface BackoffFactory {
  create: () => BackoffStrategy;
}

/**
 * Receives the lifecycle of a `retryWithBackoff` run. `RetryService` owns the
 * retry policy; the reporter owns how attempts and retries are logged.
 */
export interface RetryReporter {
  /** An attempt is about to run. `attempt` is `0` for the first run. */
  onAttempt(attempt: number): void;
  /** The attempt threw a retryable error; attempt `attempt` runs after the backoff delay. */
  onRetry(error: Error, attempt: number): void;
  /** The run settled: success, a non-retryable error, or attempts exhausted. */
  onSettled(attempt: number): void;
}
