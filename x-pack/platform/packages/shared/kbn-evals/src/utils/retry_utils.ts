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
   * Optional extra predicate: an error that is otherwise retryable is rethrown when this returns false.
   */
  shouldRetry?: (error: unknown) => boolean;
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

export function getStatusCode(error: any): number | undefined {
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

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAY = '(?:mon|tue|wed|thu|fri|sat|sun)';
const LONG_DAY = '(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)';
const MONTH = `(${MONTHS.join('|')})`;
const TIME = '(\\d{2}):(\\d{2}):(\\d{2})';

// The three HTTP-date formats of RFC 9110 section 5.6.7. Senders use IMF-fixdate;
// recipients must still accept the obsolete RFC 850 and asctime forms.
const IMF_FIXDATE = new RegExp(`^${DAY}, (\\d{2}) ${MONTH} (\\d{4}) ${TIME} GMT$`, 'i');
const RFC850_DATE = new RegExp(`^${LONG_DAY}, (\\d{2})-${MONTH}-(\\d{2}) ${TIME} GMT$`, 'i');
const ASCTIME_DATE = new RegExp(`^${DAY} ${MONTH} ([ \\d]\\d) ${TIME} (\\d{4})$`, 'i');

/** UTC epoch ms for a calendar date, or undefined if any field is out of range (e.g. 30 Feb). */
function toUtcMs(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}): number | undefined {
  const { year, month, day, hour, minute, second } = parts;
  if (hour > 23 || minute > 59 || second > 60) return undefined;
  // `Date.UTC` would map years 0-99 to 1900-1999; set the full year explicitly instead.
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return undefined;
  }
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}

function parseHttpDateMs(value: string): number | undefined {
  const monthIndex = (name: string) => MONTHS.indexOf(name.toLowerCase());

  const imf = IMF_FIXDATE.exec(value);
  if (imf) {
    const [, day, month, year, hour, minute, second] = imf;
    return toUtcMs({
      year: Number(year),
      month: monthIndex(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
    });
  }

  const asctime = ASCTIME_DATE.exec(value);
  if (asctime) {
    const [, month, day, hour, minute, second, year] = asctime;
    return toUtcMs({
      year: Number(year),
      month: monthIndex(month),
      day: Number(day.trim()),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
    });
  }

  const rfc850 = RFC850_DATE.exec(value);
  if (rfc850) {
    const [, day, month, shortYear, hour, minute, second] = rfc850;
    const fields = {
      month: monthIndex(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
    };
    // RFC 9110: a two-digit year that appears more than 50 years ahead is the most recent
    // past year with the same last two digits. The boundary is exactly 50 calendar years
    // from now (UTC), not an average-length approximation.
    const limit = new Date(Date.now());
    limit.setUTCFullYear(limit.getUTCFullYear() + 50);
    const limitYear = limit.getUTCFullYear();
    // Latest year <= limitYear whose last two digits match.
    const year = limitYear - ((((limitYear - Number(shortYear)) % 100) + 100) % 100);
    const ms = toUtcMs({ ...fields, year });
    if (ms === undefined || ms <= limit.getTime()) return ms;
    return toUtcMs({ ...fields, year: year - 100 });
  }

  return undefined;
}

/**
 * A `Retry-After` header value in ms: delay-seconds (1*DIGIT) or an HTTP-date
 * (RFC 9110 section 10.2.3). Anything else is malformed and returns undefined, so callers
 * can still use a hint carried in the error message. A well-formed value with no time left
 * is 0, not undefined.
 */
export function parseRetryAfterHeaderMs(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const dateMs = parseHttpDateMs(trimmed);
  return dateMs === undefined ? undefined : Math.max(0, dateMs - Date.now());
}

function parseRetryAfterMsFromHeaders(error: any): number | undefined {
  const headers = error?.headers ?? error?.response?.headers;
  return parseRetryAfterHeaderMs(
    typeof headers?.get === 'function' ? headers.get('retry-after') : undefined
  );
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
  // `maxDelayMs` is a hard ceiling: jitter must not push the wait past it.
  return Math.min(maxDelayMs, base + Math.floor(Math.random() * extra));
}

const RETRYABLE_SERVER_STATUSES = new Set<number>([502, 503, 504]);

function isRetryable(error: any): { retry: boolean; retryAfterMs?: number } {
  const status = getStatusCode(error);
  const message = toErrorMessage(error);
  const retryAfterMs = parseRetryAfterMsFromHeaders(error) ?? parseRetryAfterMsFromMessage(message);

  // Primary target: rate limiting
  if (status === 429) return { retry: true, retryAfterMs };
  if (/status code 429|too many requests|ratelimit|rate limit/i.test(message)) {
    return { retry: true, retryAfterMs };
  }

  // Transient server-side failures (idempotent endpoints can safely retry).
  if (status !== undefined && RETRYABLE_SERVER_STATUSES.has(status)) {
    return { retry: true, retryAfterMs };
  }

  // Common transient network issues (best-effort).
  // "other side closed" / "fetch failed" are SocketError signatures from undici when a
  // keep-alive connection is closed by the server (e.g. Kibana's Node.js keepAliveTimeout)
  // while the eval worker is busy with a long ES replay operation.
  if (
    /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|other side closed|socket hang up|fetch failed/i.test(
      message
    )
  ) {
    return { retry: true, retryAfterMs };
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
      if (!retry || isLast || options.shouldRetry?.(error) === false) {
        throw error;
      }
      // A retry sent before the server's Retry-After window (a quota 429 can
      // advertise an hour) is still throttled and only burns an attempt.
      if (retryAfterMs !== undefined && retryAfterMs > maxDelayMs) {
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
