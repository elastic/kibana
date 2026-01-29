/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/**
 * Options for retry operations with exponential backoff.
 */
export interface RetryWithBackoffOptions {
  /**
   * Maximum number of retry attempts (default: 3).
   */
  maxRetries?: number;
  /**
   * Initial delay in milliseconds before the first retry (default: 1000).
   */
  initialDelayMs?: number;
  /**
   * Multiplier for exponential backoff. Delay = initialDelayMs * (backoffMultiplier ^ attempt).
   * Default: 2 (exponential backoff)
   */
  backoffMultiplier?: number;
  /**
   * Maximum delay in milliseconds (caps exponential backoff, default: 30000).
   */
  maxDelayMs?: number;
  /**
   * Amount of randomness to add to delay (0-1). Helps prevent thundering herd.
   * Default: 0.1 (10% jitter)
   */
  jitter?: number;
  /**
   * Function to determine if an error is retryable. Returns true to retry, false to abort.
   * Default: retries common transient errors (rate limits, network errors, timeouts).
   */
  isRetryableError?: (error: unknown) => boolean;
  /**
   * Optional logger for retry attempts.
   */
  logger?: Logger;
  /**
   * Optional operation name for logging context.
   */
  operationName?: string;
  /**
   * Optional abort signal to cancel retry attempts.
   */
  abortSignal?: AbortSignal;
  /**
   * Optional callback executed before each retry attempt.
   * Useful for cleanup or recovery operations.
   */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => Promise<void> | void;
}

/**
 * Common error messages and status codes that indicate transient/retryable errors.
 */
const RETRYABLE_ERROR_PATTERNS = [
  // Rate limiting
  /rate.?limit/i,
  /too.?many.?requests/i,
  /quota.?exceeded/i,
  /throttl/i,
  // Timeouts
  /timeout/i,
  /timed.?out/i,
  /deadline.?exceeded/i,
  // Network errors
  /network/i,
  /connection.?reset/i,
  /connection.?refused/i,
  /socket.?hang.?up/i,
  /econnreset/i,
  /econnrefused/i,
  /enotfound/i,
  /etimedout/i,
  // Service unavailable
  /service.?unavailable/i,
  /temporarily.?unavailable/i,
  /server.?error/i,
  /internal.?server.?error/i,
  /bad.?gateway/i,
  /gateway.?timeout/i,
  // Overloaded
  /overloaded/i,
  /capacity/i,
];

const RETRYABLE_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
];

/**
 * Default function to determine if an error is retryable.
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;

  // Check for abort errors - these should NOT be retried
  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }

  // Check status code
  const statusCode = (error as any)?.status ?? (error as any)?.statusCode ?? (error as any)?.code;
  if (typeof statusCode === 'number' && RETRYABLE_STATUS_CODES.includes(statusCode)) {
    return true;
  }

  // Check error message patterns
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);

  return RETRYABLE_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage));
}

/**
 * Default retry options.
 */
const DEFAULT_OPTIONS: Required<
  Omit<RetryWithBackoffOptions, 'logger' | 'operationName' | 'abortSignal' | 'onRetry'>
> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
  jitter: 0.1,
  isRetryableError: isTransientError,
};

/**
 * Calculate delay with exponential backoff and optional jitter.
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  backoffMultiplier: number,
  maxDelayMs: number,
  jitter: number
): number {
  // Calculate base delay with exponential backoff
  const baseDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);

  // Cap at max delay
  const cappedDelay = Math.min(baseDelay, maxDelayMs);

  // Add jitter (randomness) to prevent thundering herd
  if (jitter > 0) {
    const jitterAmount = cappedDelay * jitter;
    const randomJitter = (Math.random() * 2 - 1) * jitterAmount; // Random between -jitter and +jitter
    return Math.max(0, Math.round(cappedDelay + randomJitter));
  }

  return Math.round(cappedDelay);
}

/**
 * Sleep for a specified duration, respecting abort signal.
 */
function sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new Error('Operation aborted'));
      return;
    }

    let resolved = false;
    const timeoutId = setTimeout(() => {
      resolved = true;
      if (abortSignal) {
        abortSignal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);

    const onAbort = () => {
      if (!resolved) {
        clearTimeout(timeoutId);
        reject(new Error('Operation aborted'));
      }
    };

    if (abortSignal) {
      abortSignal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * Retries an async operation with exponential backoff.
 *
 * This utility is designed for handling transient failures in agent operations,
 * such as LLM API calls that may fail due to rate limits, timeouts, or network issues.
 *
 * @example
 * ```typescript
 * // Simple retry with defaults
 * const result = await retryWithBackoff(
 *   () => chatModel.invoke(messages),
 *   { logger, operationName: 'llm-invoke' }
 * );
 *
 * // Custom retry configuration
 * const result = await retryWithBackoff(
 *   () => apiCall(),
 *   {
 *     maxRetries: 5,
 *     initialDelayMs: 500,
 *     backoffMultiplier: 2,
 *     maxDelayMs: 10000,
 *     jitter: 0.2,
 *     isRetryableError: (error) => error instanceof RateLimitError,
 *     logger,
 *     operationName: 'api-call',
 *     abortSignal,
 *     onRetry: async (attempt, error) => {
 *       logger.info(`Retry attempt ${attempt} after error: ${error}`);
 *     }
 *   }
 * );
 * ```
 *
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns The result of the operation if successful
 * @throws The last error if all retry attempts fail, or immediately for non-retryable errors
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryWithBackoffOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelayMs = DEFAULT_OPTIONS.initialDelayMs,
    backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
    maxDelayMs = DEFAULT_OPTIONS.maxDelayMs,
    jitter = DEFAULT_OPTIONS.jitter,
    isRetryableError = DEFAULT_OPTIONS.isRetryableError,
    logger,
    operationName,
    abortSignal,
    onRetry,
  } = options;

  const logPrefix = operationName ? `[${operationName}] ` : '';
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    // Check for abort before each attempt
    if (abortSignal?.aborted) {
      throw new Error('Operation aborted');
    }

    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt > maxRetries;
      const isRetryable = isRetryableError(error);

      if (isLastAttempt || !isRetryable) {
        if (logger) {
          if (!isRetryable) {
            logger.debug(
              `${logPrefix}Non-retryable error encountered: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          } else {
            logger.warn(
              `${logPrefix}Max retry attempts (${maxRetries}) reached. Last error: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
        throw error;
      }

      // Calculate delay for this retry
      const delayMs = calculateDelay(
        attempt,
        initialDelayMs,
        backoffMultiplier,
        maxDelayMs,
        jitter
      );

      // Execute onRetry callback if provided
      if (onRetry) {
        try {
          await onRetry(attempt, error, delayMs);
        } catch (callbackError) {
          // Log callback error but continue with retry
          if (logger) {
            logger.debug(
              `${logPrefix}Error during onRetry callback for attempt ${attempt}: ${
                callbackError instanceof Error ? callbackError.message : String(callbackError)
              }`
            );
          }
        }
      }

      // Log retry attempt
      if (logger) {
        logger.warn(
          `${logPrefix}Attempt ${attempt}/${maxRetries + 1} failed, retrying in ${delayMs}ms. Error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      // Wait before retrying
      if (delayMs > 0) {
        try {
          await sleep(delayMs, abortSignal);
        } catch {
          // Abort signal triggered during sleep
          throw new Error('Operation aborted');
        }
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Creates a retry wrapper function with pre-configured options.
 * Useful when you want to reuse the same retry configuration across multiple operations.
 *
 * @example
 * ```typescript
 * const retryableOperation = createRetryWrapper({
 *   maxRetries: 3,
 *   initialDelayMs: 1000,
 *   logger,
 * });
 *
 * const result1 = await retryableOperation(() => operation1());
 * const result2 = await retryableOperation(() => operation2());
 * ```
 */
export function createRetryWrapper(
  defaultOptions: RetryWithBackoffOptions
): <T>(operation: () => Promise<T>, overrideOptions?: RetryWithBackoffOptions) => Promise<T> {
  return <T>(operation: () => Promise<T>, overrideOptions?: RetryWithBackoffOptions) => {
    return retryWithBackoff(operation, { ...defaultOptions, ...overrideOptions });
  };
}
