/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions, HttpFetchOptionsWithPath, HttpHandler } from '@kbn/core/public';
import type { KbnClient, KbnClientRequesterError } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { EXECUTION_ID_BAGGAGE_KEY, EVAL_EXPERIMENT_ID_BAGGAGE_KEY } from '@kbn/inference-tracing';

// redefine args type to make it easier to handle in a type-safe way
type HttpHandlerArgs =
  | [string, HttpFetchOptions & { asResponse: true }]
  | [HttpFetchOptionsWithPath & { asResponse: true }]
  | [string]
  | [string, HttpFetchOptions?]
  | [HttpFetchOptionsWithPath];

const TRANSPORT_ERROR_CODES = new Set([
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ETIMEDOUT',
]);

/**
 * True when the request never got an HTTP response because the connection failed or was
 * closed (e.g. Kibana's `server.socketTimeout` closing a stalled handler). Caller aborts are
 * never transport errors.
 */
export function isTransportError(error: unknown): boolean {
  if (typeof (error as { status?: unknown } | undefined)?.status === 'number') {
    return false;
  }
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    const { name, code, message } = current as { name?: string; code?: string; message?: string };
    if (name === 'AbortError') {
      return false;
    }
    if (code && TRANSPORT_ERROR_CODES.has(code)) {
      return true;
    }
    if (current instanceof TypeError && message === 'fetch failed') {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

// Inference calls hold no server-side state, so re-sending one after a dropped connection is
// safe. Other POSTs may have taken effect before the socket closed, so they are not retried.
const isSafeToResend = (method: string, path: string): boolean =>
  ['GET', 'HEAD'].includes(method.toUpperCase()) || path.startsWith('/internal/inference/');

/**
 * Creates a function that matches the HttpHandler interface from Core's
 * API, using the KbnClient from @kbn/kbn-client
 */
export function httpHandlerFromKbnClient({
  kbnClient,
  log,
  getExecutionId,
  getExperimentId,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  getExecutionId?: () => string | undefined;
  getExperimentId?: () => string | undefined;
}) {
  const fetch: HttpHandler = async (...args: HttpHandlerArgs) => {
    const options: HttpFetchOptionsWithPath =
      typeof args[0] === 'string' ? { path: args[0], ...(args[1] as any) } : args[0];

    const { method = 'GET', body, asResponse, rawResponse, query, signal, headers } = options;

    // Add a W3C baggage entry so Kibana can tag OTEL spans with the per-model build run ID.
    const executionId = getExecutionId?.() ?? process.env.TEST_RUN_ID;
    const nextHeaders: Record<string, string> = headers
      ? ({ ...(headers as Record<string, unknown>) } as Record<string, string>)
      : {};

    const baggageEntries: string[] = [];
    if (executionId) {
      baggageEntries.push(`${EXECUTION_ID_BAGGAGE_KEY}=${encodeURIComponent(executionId)}`);
    }
    const experimentId = getExperimentId?.();
    if (experimentId) {
      baggageEntries.push(`${EVAL_EXPERIMENT_ID_BAGGAGE_KEY}=${encodeURIComponent(experimentId)}`);
    }
    if (baggageEntries.length > 0) {
      const existingKey = Object.keys(nextHeaders).find((k) => k.toLowerCase() === 'baggage');
      const existing = existingKey ? nextHeaders[existingKey] : undefined;
      const merged = existing
        ? `${existing},${baggageEntries.join(',')}`
        : baggageEntries.join(',');
      nextHeaders[existingKey ?? 'baggage'] = merged;
    }

    const finalHeaders = Object.keys(nextHeaders).length ? nextHeaders : undefined;

    const maxRetries = Number(process.env.KBN_EVALS_HTTP_RETRIES ?? '0') || 0;
    const retryStatuses = new Set([429, 503, 504]);

    async function sleep(ms: number) {
      await new Promise((r) => setTimeout(r, ms));
    }

    function parseRetryAfterMsFromHeaders(
      responseHeaders: Headers | undefined
    ): number | undefined {
      const value = responseHeaders?.get('retry-after');
      if (!value) {
        return undefined;
      }

      const seconds = Number.parseInt(value, 10);
      if (!Number.isFinite(seconds) || seconds <= 0) {
        return undefined;
      }

      return seconds * 1000;
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
        if (asResponse) {
          // `HttpResponse.request` is required by Core's type. We don't have access to undici's
          // underlying outgoing Request, so reconstruct an equivalent stub from the inputs. Strip
          // user:pass from the URL because `new Request(...)` rejects URLs with embedded credentials
          // (same WHATWG parsing as fetch).
          const requestUrl = new URL(kbnClient.resolveUrl(options.path));
          requestUrl.username = '';
          requestUrl.password = '';

          return {
            fetchOptions: options,
            request: new Request(requestUrl, {
              method,
              headers: finalHeaders,
              signal: signal || undefined,
            }),
            body: undefined,
            response: new Response(response.data as BodyInit, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            }),
          };
        }
        return response.data as any;
      } catch (err) {
        // `kbnClient.request` only ever throws `KbnClientRequesterError`.
        const error = err as KbnClientRequesterError;
        const status = error.status;

        lastError = error;

        const retryableStatus = typeof status === 'number' && retryStatuses.has(status);
        const retryableTransport =
          !signal?.aborted && isTransportError(error) && isSafeToResend(method, options.path);

        if (attempt >= maxRetries || !(retryableStatus || retryableTransport)) {
          throw error;
        }

        const retryAfterMs =
          parseRetryAfterMsFromHeaders(error.headers) ??
          parseRetryAfterMsFromMessage(error.message);

        // Exponential backoff (1s, 2s, 4s, ...) with jitter, but never sooner than retry-after.
        const baseBackoffMs = 1000 * Math.pow(2, attempt);
        const baseDelayMs = retryAfterMs ? Math.max(baseBackoffMs, retryAfterMs) : baseBackoffMs;
        const jitterMs = Math.floor(
          Math.random() * Math.min(1000, Math.max(100, baseDelayMs * 0.15))
        );
        const delayMs = baseDelayMs + jitterMs;

        log.warning(
          `${
            retryableStatus ? `HTTP ${status}` : `Transport error (${error.message.slice(0, 200)})`
          } from Kibana on ${method} ${options.path}; retrying in ${Math.round(
            delayMs / 1000
          )}s (attempt ${attempt + 1}/${maxRetries + 1})`
        );
        await sleep(delayMs);
      }
    }

    throw lastError;
  };

  return fetch;
}
