/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isInferenceProviderError, type InferenceTaskProviderError } from '@kbn/inference-common';

const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const DEFAULT_MAX_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_INITIAL_DELAY_MS = 1000; // 1 second
const DEFAULT_MAX_DELAY_MS = 64000; // 64 seconds

/**
 * Error thrown when the rate limit retry budget is exhausted.
 * The task runner should catch this and decide whether to reschedule or fail the task.
 */
export class RateLimitTimeoutError extends Error {
  constructor(message: string = 'Rate limit retry budget exhausted') {
    super(message);
    this.name = 'RateLimitTimeoutError';
    Object.setPrototypeOf(this, RateLimitTimeoutError.prototype);
  }
}

/**
 * Checks if an error is a rate limit error (HTTP 429) from an inference provider.
 *
 * @param error - The error to check
 * @returns true if the error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!isInferenceProviderError(error)) {
    return false;
  }
  const providerError = error as InferenceTaskProviderError;
  return providerError.meta?.status === HTTP_STATUS_TOO_MANY_REQUESTS;
}

export interface WithRateLimitRetryOptions {
  /**
   * Maximum duration in milliseconds to retry before giving up.
   * @default 300000 (5 minutes)
   */
  maxDurationMs?: number;
  /**
   * Initial delay in milliseconds before the first retry.
   * @default 1000 (1 second)
   */
  initialDelayMs?: number;
  /**
   * Maximum delay in milliseconds between retries.
   * @default 64000 (64 seconds)
   */
  maxDelayMs?: number;
  /**
   * Abort signal to cancel the retry loop (e.g., from task cancellation).
   */
  signal?: AbortSignal;
  /**
   * Logger for debugging retry attempts.
   */
  logger?: Logger;
}

/**
 * Wraps an async function with rate limit retry logic.
 *
 * On 429 errors, it retries with exponential backoff until the maxDurationMs budget
 * is exhausted, then throws a RateLimitTimeoutError.
 *
 * Non-rate-limit errors are rethrown immediately.
 *
 * @param fn - The async function to execute
 * @param options - Configuration options for retry behavior
 * @returns The result of the function if successful
 * @throws RateLimitTimeoutError if the retry budget is exhausted
 * @throws The original error if it's not a rate limit error
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  options: WithRateLimitRetryOptions = {}
): Promise<T> {
  const {
    maxDurationMs = DEFAULT_MAX_DURATION_MS,
    initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    signal,
    logger,
  } = options;

  const startTime = Date.now();
  let currentDelay = initialDelayMs;
  let attempt = 0;

  while (true) {
    // Check if already aborted before attempting
    if (signal?.aborted) {
      throw new Error('Request was aborted');
    }

    try {
      attempt++;
      return await fn();
    } catch (error) {
      // Non-rate-limit errors are rethrown immediately
      if (!isRateLimitError(error)) {
        throw error;
      }

      const elapsed = Date.now() - startTime;
      const remaining = maxDurationMs - elapsed;

      logger?.debug(
        `Rate limit hit (attempt ${attempt}), elapsed: ${elapsed}ms, remaining budget: ${remaining}ms`
      );

      // Check if we've exceeded the time budget
      if (remaining <= 0) {
        logger?.warn(
          `Rate limit retry budget exhausted after ${attempt} attempts and ${elapsed}ms`
        );
        throw new RateLimitTimeoutError(
          `Rate limit retry budget exhausted after ${attempt} attempts`
        );
      }

      // Calculate delay, capped at remaining time and maxDelayMs
      const delay = Math.min(currentDelay, remaining, maxDelayMs);

      logger?.debug(`Waiting ${delay}ms before retry attempt ${attempt + 1}`);

      // Wait with abort signal support
      await sleep(delay, signal);

      // Exponential backoff for next iteration
      currentDelay = Math.min(currentDelay * 2, maxDelayMs);
    }
  }
}

/**
 * Sleep for a specified duration, with optional abort signal support.
 *
 * @param ms - Duration to sleep in milliseconds
 * @param signal - Optional abort signal to cancel the sleep
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Request was aborted'));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    if (signal) {
      const onAbort = () => {
        clearTimeout(timeoutId);
        reject(new Error('Request was aborted'));
      };
      signal.addEventListener('abort', onAbort, { once: true });

      // Clean up the abort listener when the timeout completes
      const originalResolve = resolve;
      resolve = () => {
        signal.removeEventListener('abort', onAbort);
        originalResolve();
      };
    }
  });
}
