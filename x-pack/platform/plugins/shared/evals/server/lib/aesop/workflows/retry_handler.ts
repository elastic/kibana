/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

/**
 * Workflow Retry Handler
 *
 * Implements intelligent retry logic with exponential backoff for transient failures.
 * Distinguishes between retryable and non-retryable errors.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry limits
 * - Retryable error detection
 * - Retry attempt logging
 * - Context preservation across retries
 *
 * Usage:
 * ```typescript
 * const retryHandler = new WorkflowRetryHandler(logger);
 *
 * const result = await retryHandler.executeWithRetry(
 *   async () => {
 *     return await agentBuilder.invoke(prompt);
 *   },
 *   {
 *     maxRetries: 3,
 *     initialDelayMs: 1000,
 *     maxDelayMs: 30000,
 *     operationName: 'agent_invocation',
 *   }
 * );
 * ```
 */

import type { Logger } from '@kbn/core/server';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;

  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs: number;

  /** Maximum delay in milliseconds between retries (default: 30000) */
  maxDelayMs: number;

  /** Human-readable operation name for logging (e.g., "agent_invocation", "es_query") */
  operationName?: string;

  /** Custom predicate to determine if error is retryable */
  isRetryable?: (error: any) => boolean;

  /** Callback invoked before each retry attempt */
  onRetry?: (attempt: number, error: any, delayMs: number) => void;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Custom error thrown when max retries are exceeded
 */
export class MaxRetriesExceededError extends Error {
  constructor(
    public readonly operationName: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(
      `Operation "${operationName}" failed after ${attempts} attempts. Last error: ${lastError.message}`
    );
    this.name = 'MaxRetriesExceededError';
  }
}

/**
 * Workflow Retry Handler
 *
 * Executes operations with automatic retry on transient failures.
 */
export class WorkflowRetryHandler {
  constructor(private readonly logger: Logger) {}

  /**
   * Execute an operation with retry logic
   *
   * @param operation - Async function to execute
   * @param options - Retry configuration
   * @returns Result of the operation
   * @throws MaxRetriesExceededError if all retries fail
   * @throws Original error if error is non-retryable
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts: RetryOptions = {
      ...DEFAULT_RETRY_OPTIONS,
      ...options,
    };

    const operationName = opts.operationName || 'unknown_operation';
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
      try {
        this.logger.debug(
          `[RetryHandler] Executing ${operationName}, attempt ${attempt}/${opts.maxRetries}`
        );

        const result = await operation();

        if (attempt > 1) {
          this.logger.info(`[RetryHandler] ${operationName} succeeded on attempt ${attempt}`);
        }

        return result;
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        const isRetryable = opts.isRetryable
          ? opts.isRetryable(error)
          : this.isRetryableError(error);

        if (!isRetryable) {
          this.logger.warn(
            `[RetryHandler] ${operationName} failed with non-retryable error attempt=${attempt} error=${lastError.message}`
          );
          throw lastError;
        }

        // If this was the last attempt, throw
        if (attempt >= opts.maxRetries) {
          this.logger.error(
            `[RetryHandler] ${operationName} failed after ${opts.maxRetries} attempts error=${lastError.message}`
          );
          throw new MaxRetriesExceededError(operationName, attempt, lastError);
        }

        // Calculate backoff delay
        const delayMs = this.calculateBackoff(attempt, opts);

        this.logger.warn(
          `[RetryHandler] ${operationName} failed (attempt ${attempt}/${
            opts.maxRetries
          }), retrying in ${delayMs}ms error=${lastError.message} statusCode=${
            error.statusCode || error.status
          }`
        );

        // Invoke retry callback if provided
        if (opts.onRetry) {
          try {
            opts.onRetry(attempt, error, delayMs);
          } catch (callbackError) {
            this.logger.warn(
              `[RetryHandler] onRetry callback threw error: ${
                callbackError instanceof Error ? callbackError.message : String(callbackError)
              }`
            );
          }
        }

        // Wait before retrying
        await this.sleep(delayMs);
      }
    }

    // Shouldn't reach here, but satisfy TypeScript
    throw new MaxRetriesExceededError(operationName, opts.maxRetries, lastError!);
  }

  /**
   * Calculate exponential backoff delay with jitter
   *
   * Formula: min(maxDelay, initialDelay * 2^(attempt - 1) + jitter)
   * Jitter: random value between 0 and 10% of calculated delay
   *
   * @param attempt - Current attempt number (1-indexed)
   * @param options - Retry options
   * @returns Delay in milliseconds
   */
  private calculateBackoff(attempt: number, options: RetryOptions): number {
    // Exponential backoff: initialDelay * 2^(attempt - 1)
    const exponentialDelay = options.initialDelayMs * Math.pow(2, attempt - 1);

    // Add jitter (0-10% of delay) to avoid thundering herd
    const jitter = exponentialDelay * Math.random() * 0.1;
    const delayWithJitter = exponentialDelay + jitter;

    // Cap at maxDelayMs
    return Math.min(delayWithJitter, options.maxDelayMs);
  }

  /**
   * Determine if an error is retryable
   *
   * Retryable errors include:
   * - Network timeouts (408, 504)
   * - Rate limits (429)
   * - Server errors (500, 502, 503)
   * - Connection errors (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
   * - Elasticsearch unavailable errors
   *
   * Non-retryable errors include:
   * - Bad requests (400, 404)
   * - Authentication failures (401, 403)
   * - Validation errors
   * - Business logic errors
   *
   * @param error - Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // HTTP status code-based detection
    const statusCode = error.statusCode || error.status || error.response?.status;
    if (statusCode) {
      const retryableStatusCodes = [
        408, // Request Timeout
        429, // Too Many Requests (rate limit)
        500, // Internal Server Error
        502, // Bad Gateway
        503, // Service Unavailable
        504, // Gateway Timeout
      ];

      if (retryableStatusCodes.includes(statusCode)) {
        return true;
      }

      // Non-retryable status codes
      const nonRetryableStatusCodes = [
        400, // Bad Request
        401, // Unauthorized
        403, // Forbidden
        404, // Not Found
        405, // Method Not Allowed
        409, // Conflict
        422, // Unprocessable Entity
      ];

      if (nonRetryableStatusCodes.includes(statusCode)) {
        return false;
      }
    }

    // Error code-based detection (Node.js network errors)
    const errorCode = error.code || error.errno;
    if (errorCode) {
      const retryableErrorCodes = [
        'ECONNREFUSED', // Connection refused
        'ECONNRESET', // Connection reset
        'ETIMEDOUT', // Timeout
        'ENOTFOUND', // DNS lookup failed
        'ENETUNREACH', // Network unreachable
        'EAI_AGAIN', // DNS temporary failure
      ];

      if (retryableErrorCodes.includes(errorCode)) {
        return true;
      }
    }

    // Error message-based detection
    const errorMessage = error.message?.toLowerCase() || '';

    const retryablePatterns = [
      'timeout',
      'timed out',
      'connection refused',
      'connection reset',
      'network error',
      'socket hang up',
      'econnreset',
      'econnrefused',
      'service unavailable',
      'too many requests',
      'rate limit',
    ];

    if (retryablePatterns.some((pattern) => errorMessage.includes(pattern))) {
      return true;
    }

    // Elasticsearch-specific errors
    if (error.meta?.body?.error?.type) {
      const esErrorType = error.meta.body.error.type;
      const retryableESErrors = [
        'circuit_breaking_exception',
        'es_rejected_execution_exception',
        'search_phase_execution_exception', // Sometimes transient
      ];

      if (retryableESErrors.includes(esErrorType)) {
        return true;
      }
    }

    // Default to non-retryable for unknown errors
    return false;
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute multiple operations in sequence with retry
   *
   * Useful for workflows that need to execute multiple steps,
   * each with its own retry logic.
   *
   * @param operations - Array of operations to execute
   * @param options - Retry options (applied to each operation)
   * @returns Array of results
   */
  async executeSequenceWithRetry<T>(
    operations: Array<() => Promise<T>>,
    options: Partial<RetryOptions> = {}
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const operationName = options.operationName
        ? `${options.operationName}_step_${i + 1}`
        : `step_${i + 1}`;

      const result = await this.executeWithRetry(operation, {
        ...options,
        operationName,
      });

      results.push(result);
    }

    return results;
  }

  /**
   * Execute operation with retry and return result + metadata
   *
   * Useful for tracking retry statistics
   *
   * @param operation - Operation to execute
   * @param options - Retry options
   * @returns Result with retry metadata
   */
  async executeWithRetryMetadata<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<{ result: T; attempts: number; totalDelayMs: number }> {
    let attempts = 0;
    let totalDelayMs = 0;

    const wrappedOperation = async () => {
      attempts++;
      return await operation();
    };

    const result = await this.executeWithRetry(wrappedOperation, {
      ...options,
      onRetry: (attempt, error, delayMs) => {
        totalDelayMs += delayMs;
        if (options.onRetry) {
          options.onRetry(attempt, error, delayMs);
        }
      },
    });

    return {
      result,
      attempts,
      totalDelayMs,
    };
  }
}
