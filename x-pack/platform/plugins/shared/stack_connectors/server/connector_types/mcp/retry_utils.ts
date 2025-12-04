/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type { Logger } from '@kbn/logging';

/**
 * Options for retry operations.
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 1, meaning one initial attempt + one retry).
   */
  maxAttempts?: number;
  /**
   * Initial delay in milliseconds before the first retry (default: 0).
   */
  initialDelayMs?: number;
  /**
   * Multiplier for exponential backoff. Delay = initialDelayMs * (backoffMultiplier ^ attempt).
   * Set to 1 for constant delay, or undefined for no delay (default: undefined).
   */
  backoffMultiplier?: number;
  /**
   * Maximum delay in milliseconds (caps exponential backoff, default: no limit).
   */
  maxDelayMs?: number;
  /**
   * Function to determine if an error is retryable. Returns true to retry, false to abort.
   * Default: retries all errors.
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
   * Optional callback executed before each retry attempt.
   * Useful for cleanup or recovery operations (e.g., disconnect/reconnect).
   */
  onRetry?: (attempt: number, error: unknown) => Promise<void> | void;
}

/**
 * Default retry options.
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'logger' | 'operationName' | 'onRetry'>> =
  {
    maxAttempts: 1,
    initialDelayMs: 0,
    backoffMultiplier: 1, // 1 = constant delay, undefined = no delay
    maxDelayMs: Infinity,
    isRetryableError: () => true,
  };

/**
 * Retries an async operation with configurable attempts, delays, and error filtering.
 *
 * This is a generic retry utility that can be used for any async operation that may fail
 * transiently. It supports exponential backoff, error filtering, and custom recovery logic.
 *
 * @example
 * ```typescript
 * // Simple retry with 3 attempts
 * const result = await retryWithRecovery(
 *   () => someAsyncOperation(),
 *   { maxAttempts: 3, logger }
 * );
 *
 * // Retry with exponential backoff and error filtering
 * const result = await retryWithRecovery(
 *   () => connectToServer(),
 *   {
 *     maxAttempts: 3,
 *     initialDelayMs: 100,
 *     backoffMultiplier: 2,
 *     isRetryableError: (error) => error instanceof ConnectionError,
 *     logger,
 *     operationName: 'connect'
 *   }
 * );
 *
 * // Retry with custom recovery logic (e.g., disconnect before reconnect)
 * const result = await retryWithRecovery(
 *   () => mcpClient.connect(),
 *   {
 *     maxAttempts: 2,
 *     initialDelayMs: 100,
 *     onRetry: async (attempt, error) => {
 *       await mcpClient.disconnect();
 *       logger.warn(`Retry attempt ${attempt} after disconnect`);
 *     },
 *     logger
 *   }
 * );
 * ```
 *
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns The result of the operation if successful
 * @throws The last error if all retry attempts fail
 */
export async function retryWithRecovery<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = DEFAULT_RETRY_OPTIONS.maxAttempts,
    initialDelayMs = DEFAULT_RETRY_OPTIONS.initialDelayMs,
    backoffMultiplier = DEFAULT_RETRY_OPTIONS.backoffMultiplier,
    maxDelayMs = DEFAULT_RETRY_OPTIONS.maxDelayMs,
    isRetryableError = DEFAULT_RETRY_OPTIONS.isRetryableError,
    logger,
    operationName,
    onRetry,
  } = options;

  let lastError: unknown;
  const totalAttempts = maxAttempts + 1; // maxAttempts retries + 1 initial attempt

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = attempt < totalAttempts && isRetryableError(error);

      if (!shouldRetry) {
        // Not retryable or max attempts reached
        if (logger) {
          if (!isRetryableError(error)) {
            logger.debug(
              `${operationName ? `[${operationName}] ` : ''}Non-retryable error encountered: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          } else {
            logger.warn(
              `${
                operationName ? `[${operationName}] ` : ''
              }Max retry attempts (${maxAttempts}) reached. Last error: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
        throw error;
      }

      // Calculate delay for this retry
      const delayMs = backoffMultiplier
        ? Math.min(initialDelayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs)
        : 0;

      // Execute onRetry callback if provided (for recovery operations)
      if (onRetry) {
        try {
          await onRetry(attempt, error);
        } catch (recoveryError) {
          // Log recovery error but continue with retry
          if (logger) {
            logger.debug(
              `${
                operationName ? `[${operationName}] ` : ''
              }Error during recovery before retry attempt ${attempt}: ${
                recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
              }`
            );
          }
        }
      }

      // Log retry attempt
      if (logger) {
        const delayMsg = delayMs > 0 ? ` after ${delayMs}ms delay` : '';
        logger.warn(
          `${
            operationName ? `[${operationName}] ` : ''
          }Retry attempt ${attempt}/${maxAttempts}${delayMsg}. Previous error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      // Wait before retrying (if delay is configured)
      if (delayMs > 0) {
        await setTimeout(delayMs);
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
