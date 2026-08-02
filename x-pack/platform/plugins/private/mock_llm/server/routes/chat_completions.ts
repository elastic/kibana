/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, KibanaRequest } from '@kbn/core/server';
import { PassThrough } from 'stream';

/**
 * Canned tool-call arguments returned when the mock decides to emit a tool
 * call. The values are arbitrary but well-formed so the caller can parse them.
 */
const TOOL_ARGS = JSON.stringify({
  _tstart: '2024-01-01T00:00:00.000Z',
  _tend: '2024-12-31T23:59:59.999Z',
});

/** Default artificial latency (ms) when the tuning header is absent. */
const DEFAULT_DELAY_MS = 2000;

/** 25mb — agent contexts (system prompt + history + tools) can get large. */
const MAX_BODY_BYTES = 26_214_400;

/**
 * Shape of the OpenAI ChatCompletion request we actually read. The route
 * validates the body with `unknowns: 'allow'`, so the real payload contains
 * many more fields; we only care about these.
 */
interface MockChatCompletionRequest {
  messages?: Array<{ role?: string }>;
  tools?: Array<{ function?: { name?: string } }>;
  model?: string;
  stream?: boolean;
}

/**
 * Reads a single header value. Node lower-cases header names and may surface a
 * repeated header as a string array, so we normalize to the first value.
 */
const getHeader = (request: KibanaRequest, name: string): string | undefined => {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * Resolves after `ms`, or immediately if the request is aborted first. This
 * keeps a long `x-mock-delay-ms` from holding the handler open after the
 * client (the connector's axios call) has already hung up.
 */
const waitUnlessAborted = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

/**
 * Registers the mock chat-completions route.
 *
 * Path note: the inference plugin's OpenAI adapter reaches this connector via
 * the `stream` sub-action, which POSTs to `config.apiUrl` *verbatim* (it does
 * NOT append `/chat/completions`; that stripping/re-appending only happens for
 * the OpenAI SDK client used by other sub-actions). So the connector's
 * `apiUrl` must be the full path that matches this route exactly, e.g.
 * `https://<kibana>/api/mock_llm/chat/completions`.
 */
export function registerChatCompletionsRoute(router: IRouter, logger: Logger) {
  router.post(
    {
      path: '/api/mock_llm/chat/completions',
      validate: {
        // Accept an arbitrary OpenAI ChatCompletion request body.
        body: schema.object({}, { unknowns: 'allow' }),
      },
      options: {
        // `/api/` (not `/internal/`) + explicit `public` so the route is
        // reachable without the `x-elastic-internal-origin` header that the
        // connector's axios client never sends.
        access: 'public',
        // The connector calls Kibana with a plain axios request that carries
        // neither `kbn-xsrf` nor `kbn-version`, so XSRF protection must be
        // opted out or every POST would be rejected with a 400.
        xsrfRequired: false,
        body: { maxBytes: MAX_BODY_BYTES },
      },
      security: {
        // The .gen-ai connector sends an OpenAI-style `Authorization: Bearer`
        // token, NOT a Kibana credential. On this Kibana version the canonical
        // way to make a route callable with no Kibana auth is to disable BOTH
        // authc (authentication) and authz (authorization) here — this is the
        // exact shape used by e.g. the security `/api/security/logout` route.
        authc: {
          enabled: false,
          reason:
            'Mock LLM endpoint for QA/load testing. It is called by the .gen-ai connector with an OpenAI-style bearer token rather than a Kibana credential, so it must be anonymous.',
        },
        authz: {
          enabled: false,
          reason:
            'Mock LLM endpoint for QA/load testing; no data access, returns canned responses.',
        },
      },
    },
    async (_context, request, response) => {
      // `unknowns: 'allow'` yields a `{}` body type; widen to the fields we use.
      const body = request.body as MockChatCompletionRequest;

      // Tuning knobs live on the connector's `config.headers` so behaviour can
      // be retuned by editing the connector — no Kibana rebuild. The OpenAI
      // connector forwards `config.headers` on both the streaming and
      // non-streaming request paths.
      const rawDelay = Number(getHeader(request, 'x-mock-delay-ms'));
      const delayMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : DEFAULT_DELAY_MS;
      const toolCallMode = String(getHeader(request, 'x-mock-tool-call') ?? '0');

      // Abort the artificial delay if the caller disconnects (e.g. the
      // connector's per-call axios timeout fires).
      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => abortController.abort());
      await waitUnlessAborted(delayMs, abortController.signal);

      const messages = Array.isArray(body?.messages) ? body.messages : [];
      const tools = Array.isArray(body?.tools) ? body.tools : [];
      const hasToolResult = messages.some((m) => m?.role === 'tool');
      const offersTools = tools.length > 0;
      const isStream = !!body?.stream;

      const id = 'chatcmpl-' + Math.random().toString(36).slice(2);
      const created = Math.floor(Date.now() / 1000);
      const model = body?.model ?? 'mock-model';

      // Decision logic: only emit a tool call when tool-call mode is on, the
      // request offers tools, and we have not already received a tool result
      // (otherwise we'd loop forever instead of answering).
      let decided: 'answer' | 'toolcall' = 'answer';
      let fn: string | undefined;
      if (!hasToolResult && toolCallMode === '1' && offersTools) {
        decided = 'toolcall';
        fn = tools[0]?.function?.name;
      }

      logger.info(
        `mock_llm ${JSON.stringify({ stream: isStream, offersTools, hasToolResult, decided })}`
      );

      const text = hasToolResult ? 'Done — 5 orders found.' : 'Hello! How can I help you today?';
      const finishReason = decided === 'toolcall' ? 'tool_calls' : 'stop';

      if (isStream) {
        // Server-Sent Events stream. Returning a `PassThrough` as the response
        // body is the same mechanism used by the elastic_console chat route;
        // the extra headers below prevent Hapi from buffering/compressing the
        // stream so chunks flush immediately.
        const stream = new PassThrough();
        const firstDelta =
          decided === 'toolcall'
            ? {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_1',
                    type: 'function',
                    function: { name: fn, arguments: TOOL_ARGS },
                  },
                ],
              }
            : { role: 'assistant', content: text };
        const firstChunk = {
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: firstDelta, finish_reason: null }],
        };
        const finalChunk = {
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
        };
        stream.write(`data: ${JSON.stringify(firstChunk)}\n\n`);
        stream.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
        stream.write('data: [DONE]\n\n');
        stream.end();

        return response.ok({
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Transfer-Encoding': 'chunked',
            'X-Accel-Buffering': 'no',
          },
          body: stream,
        });
      }

      // Non-streaming path. The connector validates this JSON against its
      // `RunActionResponseSchema`, which REQUIRES a `usage` object and
      // `choices[].message.role`. Extra fields (`refusal`, `tool_calls`) are
      // stripped by that schema rather than rejected, so they are safe to send.
      const message =
        decided === 'toolcall'
          ? {
              role: 'assistant',
              content: null,
              refusal: null,
              tool_calls: [
                { id: 'call_1', type: 'function', function: { name: fn, arguments: TOOL_ARGS } },
              ],
            }
          : { role: 'assistant', content: text, refusal: null };

      return response.ok({
        headers: { 'Content-Type': 'application/json' },
        body: {
          id,
          object: 'chat.completion',
          created,
          model,
          choices: [{ index: 0, finish_reason: finishReason, message }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        },
      });
    }
  );
}
