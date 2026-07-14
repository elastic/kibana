/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'undici';
import type { ToolingLog } from '@kbn/tooling-log';

// A full agent round (rootly lookup, PagerDuty, ES|QL probes, …) can take several
// minutes. The synchronous `/converse` endpoint holds the response until the round
// finishes, which trips both undici's default 5-minute headers timeout AND the
// Elastic Cloud proxy's await-headers timeout. The streaming `/converse/async`
// endpoint returns headers immediately and streams SSE events, keeping the
// connection active. A generous body timeout still guards against a stalled stream.
const STREAM_IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const longRoundDispatcher = new Agent({
  headersTimeout: STREAM_IDLE_TIMEOUT_MS,
  bodyTimeout: STREAM_IDLE_TIMEOUT_MS,
});

/** The distilled result of one conversation turn. */
export interface AgentTurn {
  message: string;
}

/**
 * Agent Builder SSE frames carry the event name in the `event:` line and a
 * `data:` JSON payload wrapped as `{ "data": <eventData> }`, e.g.
 *   event: message_complete
 *   data: {"data":{"message_id":"…","message_content":"…"}}
 */
type ChatStreamData = Record<string, unknown>;

/**
 * Thin client over the platform-logging cluster's Agent Builder API. It calls the
 * streaming `POST /api/agent_builder/converse/async` endpoint (Server-Sent Events)
 * and reduces the stream to the final assistant message. Streaming is required
 * because a full round can outlast the sync endpoint's proxy/await-headers timeout.
 *
 * Auth is a Kibana API key (needs `agentBuilder:read`) sent as `Authorization:
 * ApiKey <key>`. The public versioned route also requires `kbn-xsrf` and the
 * `elastic-api-version` header. A live `.inference` connector is resolved and
 * pinned per request (see `resolveConnectorId`) rather than relying on the
 * agent's configured default, which can go stale on shared clusters.
 */
export class IncidentAgentClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly agentId: string;
  private readonly log: ToolingLog;
  private connectorIdPromise?: Promise<string | undefined>;

  constructor({
    kibanaUrl,
    apiKey,
    agentId = 'elastic-ai-agent',
    log,
  }: {
    kibanaUrl: string;
    apiKey: string;
    agentId?: string;
    log: ToolingLog;
  }) {
    // Trim a trailing slash so URL joining stays predictable.
    this.baseUrl = kibanaUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.agentId = agentId;
    this.log = log;
  }

  /**
   * Resolves (and memoizes) the inference connector to route the model to. An
   * agent's own default connector can go stale (a preconfigured `.inference`
   * endpoint gets rotated / removed on shared clusters), which surfaces as `No
   * connector or inference endpoint found for ID …`. Pinning a LIVE connector per
   * request via `connector_id` self-heals against that. Model choice matters —
   * weaker models mis-format the strict JSON contract — so prefer a Claude
   * endpoint, else fall back to the first available `.inference` connector.
   * Returns `undefined` to fall back to the agent default when the connector list
   * can't be read.
   */
  private resolveConnectorId(): Promise<string | undefined> {
    this.connectorIdPromise ??= (async (): Promise<string | undefined> => {
      const url = `${this.baseUrl}/api/actions/connectors`;
      let connectors: Array<{ id: string; connector_type_id?: string; name?: string }> = [];
      try {
        const response = await fetch(url, {
          headers: { Authorization: `ApiKey ${this.apiKey}`, 'kbn-xsrf': 'true' },
        } as RequestInit);
        if (!response.ok) {
          return undefined;
        }
        connectors = (await response.json()) as typeof connectors;
      } catch {
        return undefined;
      }

      const inference = connectors.filter((c) => c.connector_type_id === '.inference');
      const claude = inference.find((c) => /claude/i.test(c.id) || /claude/i.test(c.name ?? ''));
      const chosen = claude ?? inference[0];
      if (chosen) {
        this.log.debug(`Routing Agent Builder to inference connector "${chosen.id}".`);
      }
      return chosen?.id;
    })();
    return this.connectorIdPromise;
  }

  /** Sends one user message and consumes the streamed agent round. */
  async converse({ input }: { input: string }): Promise<AgentTurn> {
    const url = `${this.baseUrl}/api/agent_builder/converse/async`;
    const body: Record<string, unknown> = {
      input,
      agent_id: this.agentId,
    };
    const connectorId = await this.resolveConnectorId();
    if (connectorId) {
      body.connector_id = connectorId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
        'kbn-xsrf': 'true',
        'elastic-api-version': '2023-10-31',
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      // `dispatcher` is an undici (Node global fetch) extension not present in the
      // DOM RequestInit type; cast as the repo does elsewhere for custom fetch.
      dispatcher: longRoundDispatcher,
    } as RequestInit);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Agent Builder converse failed (${response.status} ${response.statusText}) at ${url}: ${
          text || '<no body>'
        }`
      );
    }
    if (!response.body) {
      throw new Error(`Agent Builder converse returned no response body at ${url}`);
    }

    return this.consumeStream(response.body);
  }

  /** Reduces the SSE stream to the final assistant message. */
  private async consumeStream(body: ReadableStream<Uint8Array>): Promise<AgentTurn> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let message = '';
    let chunks = '';
    let pausedForPrompt = false;
    let streamError: string | undefined;

    const handleEvent = (type: string | undefined, data: ChatStreamData): void => {
      switch (type) {
        case 'error': {
          // The agent reports failures (auth, connector, tool) as an in-stream
          // `error` event rather than an HTTP status. Capture it so we surface the
          // real cause instead of an empty message.
          const err = data.error as { message?: string; code?: string } | undefined;
          streamError =
            err?.message ??
            (typeof data.message === 'string' ? data.message : undefined) ??
            JSON.stringify(data);
          break;
        }
        case 'message_chunk':
          // Streamed partial answer; accumulate as a fallback for when the terminal
          // `message_complete` arrives empty or never lands.
          if (typeof data.text_chunk === 'string') {
            chunks += data.text_chunk;
          }
          break;
        case 'message_complete':
          if (typeof data.message_content === 'string') {
            message = data.message_content;
          }
          break;
        case 'round_complete': {
          const round = data.round as { response?: { message?: string } } | undefined;
          if (!message && typeof round?.response?.message === 'string') {
            message = round.response.message;
          }
          break;
        }
        case 'prompt_request':
        case 'user_question_asked':
          pausedForPrompt = true;
          break;
        default:
          break;
      }
    };

    const processFrame = (frame: string): void => {
      let eventType: string | undefined;
      const dataParts: string[] = [];
      for (const rawLine of frame.split('\n')) {
        const line = rawLine.replace(/\r$/, '');
        if (line.startsWith('event:')) {
          eventType = line.slice('event:'.length).trim();
        } else if (line.startsWith('data:')) {
          dataParts.push(line.slice('data:'.length).trim());
        }
      }
      const payload = dataParts.join('\n');
      if (!payload || payload === '[DONE]') {
        return;
      }
      try {
        // Normal events wrap the payload as `{ "data": <eventData> }`; `error`
        // events are unwrapped (`{ "error": {…} }`). Fall back to the whole object
        // so both shapes reach the handler.
        const parsed = JSON.parse(payload) as { data?: ChatStreamData };
        handleEvent(eventType, parsed?.data ?? (parsed as ChatStreamData) ?? {});
      } catch {
        // Ignore keep-alive comments / non-JSON frames.
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        processFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    }
    if (buffer.trim()) {
      processFrame(buffer);
    }

    // Fall back to the streamed chunks when the terminal message never populated.
    if (!message && chunks) {
      message = chunks;
    }

    if (streamError && !message) {
      throw new Error(`Agent Builder round failed: ${streamError}`);
    }

    if (pausedForPrompt && !message) {
      throw new Error(
        'The agent paused awaiting user input (prompt_request); a non-interactive capture run ' +
          'cannot continue. Rephrase the prompt so the agent completes autonomously.'
      );
    }

    return { message };
  }
}
