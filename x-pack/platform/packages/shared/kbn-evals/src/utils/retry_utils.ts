/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DEFAULT_MAX_ATTEMPTS = 6;
const DEFAULT_MIN_DELAY_MS = 2000;
const DEFAULT_MAX_DELAY_MS = 60_000;

export interface RetryOptions {
  /**
   * Total number of attempts (initial try + retries).
   */
  maxAttempts?: number;
  /**
   * Minimum delay for exponential backoff (ms).
   */
  minDelayMs?: number;
  /**
   * Maximum delay cap (ms).
   */
  maxDelayMs?: number;
  /**
   * If true, add a small random jitter to the delay.
   */
  jitter?: boolean;
  /**
   * Optional label for error messages/logging.
   */
  label?: string;
  /**
   * Optional hook invoked before sleeping between retries.
   */
  onRetry?: (params: {
    attempt: number;
    maxAttempts: number;
    delayMs: number;
    error: unknown;
    label: string;
  }) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getStatusCode(error: any): number | undefined {
  return (
    error?.statusCode ??
    error?.status ??
    error?.response?.status ??
    error?.meta?.status ??
    undefined
  );
}

function parseRetryAfterMsFromMessage(message: string): number | undefined {
  // Many providers include: "Please retry after 5 seconds."
  const match = message.match(/retry after\s+(\d+)\s*seconds?/i);
  if (!match) return undefined;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return seconds * 1000;
}

function computeDelayMs({
  attempt,
  minDelayMs,
  maxDelayMs,
  retryAfterMs,
  jitter,
}: {
  attempt: number;
  minDelayMs: number;
  maxDelayMs: number;
  retryAfterMs?: number;
  jitter: boolean;
}): number {
  const exp = Math.min(maxDelayMs, minDelayMs * Math.pow(2, attempt - 1));
  const base = retryAfterMs ? Math.max(exp, retryAfterMs) : exp;

  if (!jitter) return base;

  // Keep jitter small to avoid masking "retry after" guidance.
  const extra = Math.min(1000, Math.max(100, Math.floor(base * 0.15)));
  return base + Math.floor(Math.random() * extra);
}

function isRetryable(error: any): { retry: boolean; retryAfterMs?: number } {
  const status = getStatusCode(error);
  const message = toErrorMessage(error);
  const retryAfterMs = parseRetryAfterMsFromMessage(message);

  // Primary target: rate limiting
  if (status === 429) return { retry: true, retryAfterMs };
  if (/status code 429|too many requests|ratelimit|rate limit/i.test(message)) {
    return { retry: true, retryAfterMs };
  }

  // Common transient network issues (best-effort)
  if (/ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND/i.test(message)) {
    return { retry: true };
  }

  return { retry: false };
}

/**
 * Retry a promise-returning function with exponential backoff.
 *
 * This is intended for evals/test-call sites (e.g. `kbnClient.request`) where we don't
 * reliably have access to response headers and may only have an error message string.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const minDelayMs = options.minDelayMs ?? DEFAULT_MIN_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const jitter = options.jitter ?? true;
  const label = options.label ?? 'operation';

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const { retry, retryAfterMs } = isRetryable(error);
      const isLast = attempt === maxAttempts;
      if (!retry || isLast) {
        throw error;
      }

      const delayMs = computeDelayMs({
        attempt,
        minDelayMs,
        maxDelayMs,
        retryAfterMs,
        jitter,
      });

      options.onRetry?.({ attempt, maxAttempts, delayMs, error, label });

      await sleep(delayMs);
    }
  }

  // Should be unreachable.
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
