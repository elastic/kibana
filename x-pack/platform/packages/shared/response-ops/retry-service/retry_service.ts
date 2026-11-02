/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BackoffFactory, BackoffStrategy, RetryReporter } from './types';

export abstract class RetryService {
  private readonly reporter: RetryReporter;
  private readonly maxAttempts: number;
  private readonly backOffStrategy: BackoffStrategy;

  private timer: NodeJS.Timeout | null = null;
  private attempt: number = 0;

  constructor(reporter: RetryReporter, backOffFactory: BackoffFactory, maxAttempts: number = 10) {
    this.reporter = reporter;
    this.backOffStrategy = backOffFactory.create();
    this.maxAttempts = maxAttempts;
  }

  public async retryWithBackoff<T>(cb: () => Promise<T>): Promise<T> {
    try {
      this.reporter.onAttempt(this.attempt);

      return await cb();
    } catch (error) {
      if (this.shouldRetry() && this.isRetryableError(error)) {
        this.stop();
        this.attempt++;

        await this.delay();

        this.reporter.onRetry(error, this.attempt);

        return this.retryWithBackoff(cb);
      }

      throw error;
    } finally {
      this.reporter.onSettled(this.attempt);
    }
  }

  private shouldRetry() {
    return this.attempt < this.maxAttempts;
  }

  protected abstract isRetryableError(error: Error): boolean;

  private async delay() {
    const ms = this.backOffStrategy.nextBackOff();

    return new Promise((resolve) => {
      this.timer = setTimeout(resolve, ms);
    });
  }

  private stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
