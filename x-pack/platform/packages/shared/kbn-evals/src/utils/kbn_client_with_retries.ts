/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { withRetry } from './retry_utils';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getRetryAfterMsFromHeaders(
  headers: Record<string, unknown> | undefined
): number | undefined {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === 'retry-after');
  const value = key ? headers[key] : undefined;
  if (typeof value === 'string') {
    const seconds = Number.parseInt(value, 10);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    // Some clients may normalize to seconds.
    return value * 1000;
  }
  return undefined;
}

function parseRetryAfterMsFromMessage(message: string): number | undefined {
  // Many providers include: "Please retry after 5 seconds."
  const match = message.match(/retry after\s+(\d+)\s*seconds?/i);
  if (!match) return undefined;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return seconds * 1000;
}

function isSseRateLimitPayload(payload: unknown): boolean {
  if (typeof payload !== 'string') return false;
  // Only treat as retryable if it's clearly an SSE error plus rate limit signals.
  const looksLikeSseError =
    /"type"\s*:\s*"error"/i.test(payload) || /\bevent:\s*error\b/i.test(payload);
  const looksLikeRateLimit = /status code\s*429|too many requests|ratelimit|rate limit/i.test(
    payload
  );
  return looksLikeSseError && looksLikeRateLimit;
}

export function wrapKbnClientWithRetries({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
}): KbnClient {
  const maxAttempts = Number(process.env.KBN_EVALS_KBNCLIENT_MAX_ATTEMPTS ?? '6') || 6;
  const minDelayMs = Number(process.env.KBN_EVALS_KBNCLIENT_MIN_DELAY_MS ?? '2000') || 2000;
  const maxDelayMs = Number(process.env.KBN_EVALS_KBNCLIENT_MAX_DELAY_MS ?? '60000') || 60000;

  const wrappedRequest: KbnClient['request'] = async (params: any) => {
    return withRetry(
      async () => {
        const response = await (kbnClient.request as any)(params);

        // Some endpoints return SSE text with an embedded error instead of a non-2xx status.
        // When that error is clearly a rate-limit signal, treat it as retryable.
        if (isSseRateLimitPayload(response?.data)) {
          throw new Error(
            `Rate limited (SSE error payload): ${String(response.data).slice(0, 2000)}`
          );
        }

        return response;
      },
      {
        label: `kbnClient.request ${params?.method ?? 'GET'} ${params?.path ?? ''}`.trim(),
        maxAttempts,
        minDelayMs,
        maxDelayMs,
        onRetry: ({ attempt, maxAttempts: total, delayMs, error, label }) => {
          const message = toErrorMessage(error);
          const headers = (error as any)?.response?.headers ?? (error as any)?.headers;
          const retryAfterMs =
            getRetryAfterMsFromHeaders(headers) ??
            parseRetryAfterMsFromMessage(message) ??
            undefined;

          log.warning(
            `${label} failed (attempt ${attempt}/${total}); retrying in ${delayMs}ms${
              retryAfterMs ? ` (retry-after=${retryAfterMs}ms)` : ''
            }. Error: ${message}`
          );
        },
      }
    );
  };

  // Proxy all properties, override only request()
  return new Proxy(kbnClient as any, {
    get(target, prop, receiver) {
      if (prop === 'request') return wrappedRequest;
      return Reflect.get(target, prop, receiver);
    },
  }) as KbnClient;
}
