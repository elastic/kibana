/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions, HttpFetchOptionsWithPath, HttpHandler } from '@kbn/core/public';
import type { KbnClient } from '@kbn/test';
import { KbnClientRequesterError } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';

// redefine args type to make it easier to handle in a type-safe way
type HttpHandlerArgs =
  | [string, HttpFetchOptions & { asResponse: true }]
  | [HttpFetchOptionsWithPath & { asResponse: true }]
  | [string]
  | [string, HttpFetchOptions?]
  | [HttpFetchOptionsWithPath];

/**
 * Creates a function that matches the HttpHandler interface from Core's
 * API, using the KbnClient from @kbn/test
 */
export function httpHandlerFromKbnClient({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
}) {
  const fetch: HttpHandler = async (...args: HttpHandlerArgs) => {
    const options: HttpFetchOptionsWithPath =
      typeof args[0] === 'string' ? { path: args[0], ...(args[1] as any) } : args[0];

    const { method = 'GET', body, asResponse, rawResponse, query, signal, headers } = options;

    // Add a W3C baggage entry so Kibana can tag OTEL spans with the eval run id.
    // This enables correlating traces (traces-*) with eval score docs (kibana-evaluations*) via run_id.
    const runId = process.env.TEST_RUN_ID;
    const nextHeaders: Record<string, string> = headers
      ? ({ ...(headers as Record<string, unknown>) } as Record<string, string>)
      : {};

    if (runId) {
      const baggageEntry = `kibana.evals.run_id=${encodeURIComponent(runId)}`;
      const existingKey = Object.keys(nextHeaders).find((k) => k.toLowerCase() === 'baggage');
      const existing = existingKey ? nextHeaders[existingKey] : undefined;

      const merged = existing ? `${existing},${baggageEntry}` : baggageEntry;
      nextHeaders[existingKey ?? 'baggage'] = merged;
    }

    const finalHeaders = Object.keys(nextHeaders).length ? nextHeaders : undefined;

    const maxRetries = Number(process.env.KBN_EVALS_HTTP_RETRIES ?? '0') || 0;
    const retryStatuses = new Set([429, 503, 504]);

    async function sleep(ms: number) {
      await new Promise((r) => setTimeout(r, ms));
    }

    function toErrorMessage(err: unknown): string {
      if (err instanceof Error) return err.message;
      try {
        return JSON.stringify(err);
      } catch {
        return String(err);
      }
    }

    function parseRetryAfterMsFromHeaders(
      responseHeaders: Record<string, unknown> | undefined
    ): number | undefined {
      if (!responseHeaders) return undefined;
      const key = Object.keys(responseHeaders).find((k) => k.toLowerCase() === 'retry-after');
      const value = key ? responseHeaders[key] : undefined;
      if (typeof value === 'string') {
        const seconds = Number.parseInt(value, 10);
        if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
      }
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value * 1000;
      }
      return undefined;
    }

    function parseRetryAfterMsFromMessage(message: string): number | undefined {
      const match = message.match(/retry after\s+(\d+)\s*seconds?/i);
      if (!match) return undefined;
      const seconds = Number(match[1]);
      if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
      return seconds * 1000;
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await kbnClient.request({
          path: options.path,
          method: method as any,
          body: body && typeof body === 'string' ? JSON.parse(body) : null,
          query,
          responseType: rawResponse ? 'stream' : undefined,
          headers: finalHeaders,
          signal: signal || undefined,
          // We implement retries here so we can retry only on specific status codes.
          retries: 0,
        });
        // success
        const undiciHeaders = new Headers();
        for (const [key, value] of Object.entries(response.headers)) {
          if (Array.isArray(value)) {
            for (const v of value) undiciHeaders.append(key, v);
          } else if (value != null) {
            undiciHeaders.set(key, value);
          }
        }

        return asResponse
          ? {
              fetchOptions: options,
              request: response.request!,
              body: undefined,
              response: new Response(response.data as BodyInit, {
                status: response.status,
                statusText: response.statusText,
                headers: undiciHeaders,
              }),
            }
          : (response.data as any);
      } catch (err) {
        // Keep the richest error message possible.
        const maybeKbn = err instanceof KbnClientRequesterError ? err.axiosError ?? err : err;
        if (err instanceof KbnClientRequesterError && err.axiosError) {
          err.axiosError.message = err.message;
        }

        const status = (maybeKbn as any)?.status;
        const shouldRetry =
          attempt < maxRetries && typeof status === 'number' && retryStatuses.has(status);

        lastError = maybeKbn;

        if (!shouldRetry) {
          throw maybeKbn;
        }

        const message = toErrorMessage(maybeKbn);
        const responseHeaders = (maybeKbn as any)?.response?.headers ?? (maybeKbn as any)?.headers;
        const retryAfterMs =
          parseRetryAfterMsFromHeaders(responseHeaders) ?? parseRetryAfterMsFromMessage(message);

        // Exponential backoff (1s, 2s, 4s, ...) with jitter, but never sooner than retry-after.
        const baseBackoffMs = 1000 * Math.pow(2, attempt);
        const baseDelayMs = retryAfterMs ? Math.max(baseBackoffMs, retryAfterMs) : baseBackoffMs;
        const jitterMs = Math.floor(
          Math.random() * Math.min(1000, Math.max(100, baseDelayMs * 0.15))
        );
        const delayMs = baseDelayMs + jitterMs;

        log.warning(
          `HTTP ${status} from Kibana; retrying in ${Math.round(delayMs / 1000)}s (attempt ${
            attempt + 1
          }/${maxRetries + 1})`
        );
        await sleep(delayMs);
      }
    }

    throw lastError;
  };

  return fetch;
}
