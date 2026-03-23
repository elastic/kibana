/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BackoffFactory, BackoffStrategy } from './types';

export abstract class RetryService {
  protected logger: Logger;
  protected readonly serviceName: string;
  private maxAttempts: number;
  private readonly backOffStrategy: BackoffStrategy;

  private timer: NodeJS.Timeout | null = null;
  private attempt: number = 0;

  constructor(
    logger: Logger,
    backOffFactory: BackoffFactory,
    serviceName: string,
    maxAttempts: number = 10
  ) {
    this.logger = logger;
    this.backOffStrategy = backOffFactory.create();
    this.maxAttempts = maxAttempts;
    this.serviceName = serviceName;
  }

  public async retryWithBackoff<T>(cb: () => Promise<T>): Promise<T> {
    try {
      this.logger.debug(
        `[${this.serviceName}][retryWithBackoff] Running. Attempt: ${this.attempt}`,
        {
          labels: { attempt: this.attempt },
        }
      );

      const res = await cb();

      this.logger.debug(
        `[${this.serviceName}][retryWithBackoff] Run successfully after ${this.attempt} attempts.`,
        {
          labels: { attempt: this.attempt },
        }
      );

      return res;
    } catch (error) {
      if (this.shouldRetry() && this.isRetryableError(error)) {
        this.stop();
        this.attempt++;

        await this.delay();

        if (error.statusCode) {
          this.logger.warn(
            `[${this.serviceName}][retryWithBackoff] Failed with status code ${error.statusCode}. Attempt for retry: ${this.attempt}`
          );
        } else {
          this.logger.warn(
            `[${this.serviceName}][retryWithBackoff] Failed with error "${error.message}". Attempt for retry: ${this.attempt}`
          );
        }

        return this.retryWithBackoff(cb);
      }

      throw error;
    } finally {
      this.logger.debug(
        `[${this.serviceName}][retryWithBackoff] Run ended after ${this.attempt} attempts.`,
        {
          labels: { attempt: this.attempt },
        }
      );
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
