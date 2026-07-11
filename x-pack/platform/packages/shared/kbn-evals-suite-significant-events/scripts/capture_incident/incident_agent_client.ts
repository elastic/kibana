/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'undici';
import type { ToolingLog } from '@kbn/tooling-log';
import { AGENT_BUILDER_API_VERSION, DEFAULT_AGENT_ID } from './constants';

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

/** A single step the agent took during a round (tool call, reasoning, …). */
interface ConverseStep {
  type: string;
  tool_id?: string;
}

/** The distilled result of one conversation turn. */
export interface AgentTurn {
  conversationId: string;
  message: string;
  steps: ConverseStep[];
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
 * and reduces the stream to the final assistant message plus the steps the agent
 * took. Streaming is required because a full round can outlast the sync endpoint's
 * proxy/await-headers timeout. Multi-turn conversations are supported by threading
 * the `conversationId` from one turn back into the next.
 *
 * Auth is a Kibana API key (needs `agentBuilder:read`) sent as `Authorization:
 * ApiKey <key>`. The public versioned route also requires `kbn-xsrf` and the
 * `elastic-api-version` header. No connector is specified — the Agent Builder
 * cluster picks its configured default.
 */
export class IncidentAgentClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly agentId: string;
  private readonly log: ToolingLog;
  private readonly signal?: AbortSignal;
  private readonly explicitConnectorId?: string;
  private connectorIdPromise?: Promise<string | undefined>;

  constructor({
    kibanaUrl,
    apiKey,
    agentId = DEFAULT_AGENT_ID,
    connectorId,
    log,
    signal,
  }: {
    kibanaUrl: string;
    apiKey: string;
    agentId?: string;
    connectorId?: string;
    log: ToolingLog;
    signal?: AbortSignal;
  }) {
    // Trim a trailing slash so URL joining stays predictable.
    this.baseUrl = kibanaUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.agentId = agentId;
    this.explicitConnectorId = connectorId;
    this.log = log;
    this.signal = signal;
  }

  /**
   * Resolves the inference connector to route the model to. An agent's own default
   * connector can go stale (a preconfigured `.inference` endpoint gets rotated /
   * removed on shared clusters), which surfaces as `No connector or inference
   * endpoint found for ID …`. Pinning a LIVE connector per request via
   * `connector_id` self-heals against that. Model choice matters: weaker models
   * mis-format the strict JSON contract and the metadata degrades to placeholders,
   * so prefer a strong instruction-follower (Claude Sonnet → Claude Opus → any
   * Claude → GPT-5 → any chat_completion → any inference), cached after the first
   * lookup. Returns `undefined` to fall back to the agent default when the
   * connector list can't be read.
   */
  private async resolveConnectorId(): Promise<string | undefined> {
    if (this.explicitConnectorId) {
      return this.explicitConnectorId;
    }
    if (!this.connectorIdPromise) {
      this.connectorIdPromise = this.pickConnector();
    }
    return this.connectorIdPromise;
  }

  private async pickConnector(): Promise<string | undefined> {
    const url = `${this.baseUrl}/api/actions/connectors`;
    let connectors: Array<{ id: string; connector_type_id?: string; name?: string }> = [];
    try {
      const response = await fetch(url, {
        headers: { Authorization: `ApiKey ${this.apiKey}`, 'kbn-xsrf': 'true' },
        signal: this.signal,
      } as RequestInit);
      if (!response.ok) {
        return undefined;
      }
      connectors = (await response.json()) as typeof connectors;
    } catch {
      return undefined;
    }

    const inference = connectors.filter((c) => c.connector_type_id === '.inference');
    // Prefer a full chat-completion Claude endpoint first (higher output budget than
    // the named EIS endpoints, which truncated the large metadata JSON), then any
    // Claude, then GPT-5, then any chat-completion endpoint.
    const preferences = [
      /claude.*chat_completion/i,
      /opus/i,
      /sonnet/i,
      /claude/i,
      /gpt-5/i,
      /chat_completion/i,
    ];
    for (const pattern of preferences) {
      const hit = inference.find((c) => pattern.test(c.id) || pattern.test(c.name ?? ''));
      if (hit) {
        this.log.debug(`Routing Agent Builder to inference connector "${hit.id}".`);
        return hit.id;
      }
    }
    const fallback = inference[0]?.id;
    if (fallback) {
      this.log.debug(`Routing Agent Builder to inference connector "${fallback}" (fallback).`);
    }
    return fallback;
  }

  /**
   * Runs an ES|QL query on this cluster via Kibana's Console proxy, authenticated
   * with the key's own ES privileges. Used to read structured facts (e.g. incident
   * timestamps) deterministically instead of trusting the LLM to transcribe them.
   */
  async queryEsql(
    query: string
  ): Promise<{ columns: Array<{ name: string; type: string }>; values: unknown[][] }> {
    const url = `${this.baseUrl}/api/console/proxy?path=${encodeURIComponent(
      '_query'
    )}&method=POST`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'kibana',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: this.signal,
    } as RequestInit);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`ES|QL query failed (${response.status}) at ${url}: ${text || '<no body>'}`);
    }
    return (await response.json()) as {
      columns: Array<{ name: string; type: string }>;
      values: unknown[][];
    };
  }

  /**
   * Sends one user message and consumes the streamed agent round. Pass
   * `conversationId` (from a previous turn) to continue the same conversation.
   */
  async converse({
    input,
    conversationId,
  }: {
    input: string;
    conversationId?: string;
  }): Promise<AgentTurn> {
    const url = `${this.baseUrl}/api/agent_builder/converse/async`;
    const body: Record<string, unknown> = {
      input,
      agent_id: this.agentId,
    };
    if (conversationId) {
      body.conversation_id = conversationId;
    }
    const connectorId = await this.resolveConnectorId();
    if (connectorId) {
      body.connector_id = connectorId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
        'kbn-xsrf': 'true',
        'elastic-api-version': AGENT_BUILDER_API_VERSION,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal: this.signal,
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

  /** Reduces the SSE stream to the final message, conversation id, and tool steps. */
  private async consumeStream(body: ReadableStream<Uint8Array>): Promise<AgentTurn> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let conversationId = '';
    let message = '';
    let chunks = '';
    const steps: ConverseStep[] = [];
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
        case 'conversation_id_set':
        case 'conversation_created':
        case 'conversation_updated':
          if (typeof data.conversation_id === 'string') {
            conversationId = data.conversation_id;
          }
          break;
        case 'tool_call':
          steps.push({ type: 'tool_call', tool_id: data.tool_id as string | undefined });
          break;
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
          const round = data.round as
            | {
                response?: { message?: string };
                steps?: Array<{ type?: string; tool_id?: string }>;
              }
            | undefined;
          if (!message && typeof round?.response?.message === 'string') {
            message = round.response.message;
          }
          for (const step of round?.steps ?? []) {
            if (step?.type) {
              steps.push({ type: step.type, tool_id: step.tool_id });
            }
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

    const toolCalls = steps.filter((step) => step.type === 'tool_call');
    if (toolCalls.length > 0) {
      this.log.debug(
        `Agent used ${toolCalls.length} tool call(s): ${toolCalls
          .map((step) => step.tool_id ?? 'unknown')
          .join(', ')}`
      );
    }

    if (pausedForPrompt && !message) {
      throw new Error(
        'The agent paused awaiting user input (prompt_request); a non-interactive capture run ' +
          'cannot continue. Rephrase the prompt so the agent completes autonomously.'
      );
    }

    return { conversationId, message, steps };
  }
}
