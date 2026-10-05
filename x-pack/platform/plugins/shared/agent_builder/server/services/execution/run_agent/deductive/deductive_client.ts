/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createParser } from 'eventsource-parser';
import { DeductiveError } from './errors';
import { DeductiveSessionUnavailableError } from './session_unavailable_error';

export { DeductiveError } from './errors';
export { DeductiveSessionUnavailableError } from './session_unavailable_error';

/**
 * Raw HTTP/SSE client for the Deductive chat API (uses the native `fetch` API).
 *
 * Contract (verified against the `deductive-ai/dx` CLI source):
 *   POST /api/v1/sessions                 { mode: 'ask' }               -> { session_id, url }
 *   GET  /api/v1/sessions/{id}                                           -> { session_id, url }
 *   POST /api/v1/sessions/{id}/messages   { message, output_schema }     -> 200/202
 *   GET  /api/v1/sessions/{id}/stream     SSE                            -> events
 *
 * Streaming flow: open the SSE stream FIRST, wait for the `connected` event,
 * THEN post the message. Sessions that are gone (404/403/410) must be recreated.
 * Heartbeat lines start with `:` and are ignored.
 */

export interface DeductiveSession {
  sessionId: string;
  url: string;
}

export interface DeductiveStreamCallbacks {
  /** Called for every `answer` content chunk as it arrives. */
  onAnswerChunk?: (content: string) => void;
  /** Called for `progress` updates from the agent. */
  onProgress?: (message: string) => void;
}

export interface DeductiveRunResult {
  /** The final answer text (concatenation of all `answer` events). */
  answer: string;
  /** Wall-clock ms from stream start to the first answer chunk. */
  timeToFirstTokenMs: number;
}

interface StreamOptions {
  endpoint: string;
  token: string;
  teamId?: string;
  sessionId: string;
  message: string;
  /** Optional JSON-object string that instructs the server to enforce structured output. */
  outputSchema?: string;
  /** Max total wall-clock time for the stream, in ms. Defaults to 5 minutes. */
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  callbacks?: DeductiveStreamCallbacks;
}

const DEFAULT_STREAM_TIMEOUT_MS = 300_000;

/**
 * Combines an optional caller signal with a deadline-driven abort into a single signal,
 * without relying on `AbortSignal.timeout`/`AbortSignal.any` (absent in some test envs).
 */
const withTimeoutSignal = (
  timeoutMs: number,
  abortSignal?: AbortSignal
): { signal: AbortSignal | undefined; clear: () => void } => {
  if (typeof AbortController === 'undefined') {
    return { signal: abortSignal, clear: () => {} };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Capture the handler so `clear` detaches the exact listener that was added.
  const onAbort = () => controller.abort();
  abortSignal?.addEventListener?.('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      abortSignal?.removeEventListener?.('abort', onAbort);
    },
  };
};

interface JsonResponseBody {
  session_id?: string;
  url?: string;
  access_token?: string;
  refresh_token?: string;
  error?: string;
}

const authHeaders = (token: string, teamId?: string) => ({
  Authorization: `Bearer ${token}`,
  ...(teamId ? { 'X-Team-Id': teamId } : {}),
});

const jsonHeaders = (token: string, teamId?: string) => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  ...authHeaders(token, teamId),
});

const readJson = async (response: Response): Promise<JsonResponseBody> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export const createDeductiveSession = async ({
  endpoint,
  token,
  teamId,
}: {
  endpoint: string;
  token: string;
  teamId?: string;
}): Promise<DeductiveSession> => {
  const { signal, clear } = withTimeoutSignal(30_000);
  try {
    const response = await fetch(`${endpoint}/api/v1/sessions`, {
      method: 'POST',
      headers: jsonHeaders(token, teamId),
      body: JSON.stringify({ mode: 'ask' }),
      signal,
    });
    if (response.status !== 200 && response.status !== 201) {
      throw new DeductiveError(`failed to create session: ${response.status}`, response.status);
    }
    const body = await readJson(response);
    return { sessionId: body.session_id ?? '', url: body.url ?? '' };
  } finally {
    clear();
  }
};

export const refreshDeductiveToken = async ({
  endpoint,
  refreshToken,
}: {
  endpoint: string;
  refreshToken: string;
}): Promise<{ token: string; refreshToken: string }> => {
  const response = await fetch(`${endpoint}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: jsonHeaders(''),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (response.status !== 200) {
    throw new DeductiveError(`token refresh failed: ${response.status}`, response.status);
  }

  const body = await readJson(response);
  return {
    token: body.access_token ?? '',
    refreshToken: body.refresh_token ?? refreshToken,
  };
};

/**
 * Opens the SSE stream, waits for `connected`, posts the user message, then
 * consumes events until `complete` (or `error`). Fails fast on 401; session-level
 * failures throw DeductiveSessionUnavailableError for the caller to recover.
 */
export const sendDeductiveMessageAndReadSse = async ({
  endpoint,
  token,
  teamId,
  sessionId,
  message,
  outputSchema,
  timeoutMs = DEFAULT_STREAM_TIMEOUT_MS,
  abortSignal,
  callbacks,
}: StreamOptions): Promise<DeductiveRunResult> => {
  const streamUrl = `${endpoint}/api/v1/sessions/${encodeURIComponent(sessionId)}/stream`;

  // Hard wall-clock bound for the entire Deductive interaction (headers, SSE, message POST):
  // aborts a pending `fetch` if the backend stalls before headers or between SSE chunks.
  const { signal: combinedSignal, clear } = withTimeoutSignal(timeoutMs, abortSignal);

  // This flow can throw at many points (401, session-unavailable, non-200, SSE error);
  // `finally` guarantees the deadline timer and caller-signal listener are always released.
  try {
    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...authHeaders(token, teamId),
      },
      signal: combinedSignal,
    });

    if (response.status === 401) {
      throw new DeductiveError('deductive stream authentication failed', 401);
    }
    if (response.status === 403 || response.status === 404 || response.status === 410) {
      throw new DeductiveSessionUnavailableError(response.status);
    }
    if (response.status !== 200) {
      throw new DeductiveError(`server returned status ${response.status}`, response.status);
    }
    if (!response.body) {
      throw new DeductiveError('deductive stream returned no body');
    }

    const startedAt = Date.now();
    const deadline = startedAt + timeoutMs;
    let connected = false;
    let messageSent = false;
    let completed = false;
    let answer = '';
    let timeToFirstTokenMs: number | undefined;

    const parserFeedBuffer: string[] = [];
    const parser = createParser({
      onEvent: (event) => {
        parserFeedBuffer.push(event.data);
      },
    });

    const feed = (raw: string) => {
      let event: { type?: string; content?: string; message?: string };
      try {
        event = JSON.parse(raw);
      } catch {
        return;
      }
      switch (event.type) {
        case 'connected':
          connected = true;
          break;
        case 'progress':
          callbacks?.onProgress?.(event.message ?? '');
          break;
        case 'answer':
          if (timeToFirstTokenMs === undefined) {
            timeToFirstTokenMs = Date.now() - startedAt;
          }
          answer += event.content ?? '';
          callbacks?.onAnswerChunk?.(event.content ?? '');
          break;
        case 'complete':
          completed = true;
          break;
        case 'error':
          throw new DeductiveError(event.message ?? 'deductive stream error');
        default:
          break;
      }
    };

    const decoder = new TextDecoder();

    async function drainEventBuffer() {
      for (const raw of parserFeedBuffer.splice(0)) {
        feed(raw);
      }
    }

    for await (const chunk of response.body) {
      if (Date.now() > deadline) {
        throw new DeductiveError('deductive stream timed out', 408);
      }
      parser.feed(typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true }));
      await drainEventBuffer();

      if (completed) {
        break;
      }

      // The stream stays open while the agent works; the message is only
      // accepted once the server has confirmed we are connected.
      if (connected && !messageSent) {
        messageSent = true;
        const body: Record<string, string> = { message };
        if (outputSchema) {
          body.output_schema = outputSchema;
        }
        const messageResponse = await fetch(
          `${endpoint}/api/v1/sessions/${encodeURIComponent(sessionId)}/messages`,
          {
            method: 'POST',
            headers: jsonHeaders(token, teamId),
            body: JSON.stringify(body),
            signal: combinedSignal,
          }
        );
        // The endpoints can expire/validate the session independently, so map the same
        // session-gone statuses here as on the stream GET to keep recovery symmetric.
        if (
          messageResponse.status === 403 ||
          messageResponse.status === 404 ||
          messageResponse.status === 410
        ) {
          throw new DeductiveSessionUnavailableError(messageResponse.status);
        }
        if (messageResponse.status !== 200 && messageResponse.status !== 202) {
          throw new DeductiveError(
            `failed to send message: ${messageResponse.status}`,
            messageResponse.status
          );
        }
      }
    }

    // Flush any trailing buffered SSE.
    parser.feed(decoder.decode());
    await drainEventBuffer();

    if (!completed) {
      // Premature EOF: the stream closed without the protocol's `complete` event. Treat it as
      // an error rather than presenting a truncated answer as finished.
      throw new DeductiveError('deductive stream closed before completion', 500);
    }
    if (answer.length === 0) {
      throw new DeductiveError('deductive stream closed without an answer');
    }

    return {
      answer,
      timeToFirstTokenMs: timeToFirstTokenMs ?? 0,
    };
  } finally {
    clear();
  }
};
