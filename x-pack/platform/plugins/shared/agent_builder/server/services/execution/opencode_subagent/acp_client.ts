/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable, Writable } from 'stream';
import type { Logger } from '@kbn/core/server';

/**
 * Minimal Agent Client Protocol (ACP) client, spoken over a child process's
 * stdio (newline-delimited JSON-RPC 2.0). This is a self-contained PoC
 * implementation of the small slice of ACP we need to drive `opencode acp`:
 *
 *   initialize -> session/new -> session/prompt
 *
 * plus handling two inbound messages from the agent:
 *   - session/update       (streaming progress: text, tool calls, plans)
 *   - session/request_permission (auto-approved here)
 *
 * The production path would depend on `@agentclientprotocol/sdk` directly; this
 * avoids adding a root dependency + bootstrap for the spike while matching the
 * SDK's exact wire format (protocolVersion 1).
 */

const PROTOCOL_VERSION = 1;

export interface AcpMcpServer {
  type: 'http';
  name: string;
  url: string;
  headers?: Array<{ name: string; value: string }>;
}

export interface AcpTextContent {
  type: 'text';
  text: string;
}

/**
 * A content block inside a tool_call / message update. ACP nests the actual
 * payload under `content` (a ContentBlock) for text/output, so we look one level
 * deeper as well.
 */
export interface AcpContentBlock {
  type?: string;
  text?: string;
  // Some agents wrap the block again as { type: 'content', content: {...} }.
  content?: AcpTextContent | { type?: string; text?: string };
  [k: string]: unknown;
}

/** One entry in a `plan` update (OpenCode's todo list). */
export interface AcpPlanEntry {
  content?: string;
  status?: string; // pending | in_progress | completed
  priority?: string;
  [k: string]: unknown;
}

export interface AcpSessionUpdate {
  sessionUpdate: string;
  /** message/thought chunk text payload. */
  content?: AcpTextContent;
  /** tool_call display title (e.g. "bash", the command, an MCP tool name). */
  title?: string;
  toolCallId?: string;
  /** pending | in_progress | completed | failed */
  status?: string;
  /** tool_call kind: e.g. execute, read, edit, search, fetch, think, other. */
  kind?: string;
  /** The raw tool input — for a shell tool this holds the command + args. */
  rawInput?: Record<string, unknown>;
  /** Output/content blocks produced by the tool call (e.g. stdout, a diff). */
  toolContent?: AcpContentBlock[];
  /** `plan` update entries (the agent's todo list). */
  entries?: AcpPlanEntry[];
}

export interface AcpPromptResult {
  stopReason: string;
  [k: string]: unknown;
}

export interface AcpClientEvents {
  /** Called for every session/update notification from the agent. */
  onUpdate?: (update: AcpSessionUpdate) => void;
}

interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/**
 * Normalize a raw ACP `session/update` payload into `AcpSessionUpdate`.
 *
 * ACP shapes vary by update kind:
 *   - agent_message_chunk / agent_thought_chunk: { content: { type:'text', text } }
 *   - tool_call / tool_call_update: { toolCallId, title, kind, status, rawInput,
 *       content: [ { type:'content', content: { type:'text', text } }, ... ] }
 *   - plan: { entries: [ { content, status, priority }, ... ] }
 *
 * We keep the message-chunk `content` as-is (a single text block) but lift the
 * tool_call `content` array into `toolContent` so the two never collide.
 */
const normalizeUpdate = (raw: Record<string, unknown>): AcpSessionUpdate => {
  const sessionUpdate = String(raw.sessionUpdate ?? '');
  const isToolCall = sessionUpdate === 'tool_call' || sessionUpdate === 'tool_call_update';

  const update: AcpSessionUpdate = {
    sessionUpdate,
    title: typeof raw.title === 'string' ? raw.title : undefined,
    toolCallId: typeof raw.toolCallId === 'string' ? raw.toolCallId : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    kind: typeof raw.kind === 'string' ? raw.kind : undefined,
    rawInput:
      raw.rawInput && typeof raw.rawInput === 'object'
        ? (raw.rawInput as Record<string, unknown>)
        : undefined,
    entries: Array.isArray(raw.entries) ? (raw.entries as AcpPlanEntry[]) : undefined,
  };

  if (isToolCall) {
    update.toolContent = Array.isArray(raw.content)
      ? (raw.content as AcpContentBlock[])
      : undefined;
  } else if (raw.content && typeof raw.content === 'object' && !Array.isArray(raw.content)) {
    update.content = raw.content as AcpTextContent;
  }

  return update;
};

/**
 * Pull readable text out of a tool_call content array (stdout, diffs, etc.),
 * handling the common single- and double-nested content shapes.
 */
export const extractToolText = (blocks?: AcpContentBlock[]): string => {
  if (!blocks?.length) return '';
  const parts: string[] = [];
  for (const block of blocks) {
    if (typeof block.text === 'string') {
      parts.push(block.text);
    } else if (block.content && typeof block.content === 'object') {
      const inner = block.content as { text?: string };
      if (typeof inner.text === 'string') parts.push(inner.text);
    }
  }
  return parts.join('');
};

/**
 * Drives one `opencode acp` process over stdio. One client per session/run.
 */
export class AcpStdioClient {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private buffer = '';
  private closed = false;

  constructor(
    private readonly stdin: Writable,
    private readonly stdout: Readable,
    private readonly logger: Logger,
    private readonly events: AcpClientEvents = {}
  ) {
    this.stdout.setEncoding('utf8');
    this.stdout.on('data', (chunk: string) => this.onData(chunk));
    this.stdout.on('close', () => this.onClose(new Error('ACP stdout closed')));
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let idx = this.buffer.indexOf('\n');
    while (idx !== -1) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (line.length > 0) {
        this.handleLine(line);
      }
      idx = this.buffer.indexOf('\n');
    }
  }

  private handleLine(line: string): void {
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(line);
    } catch (e) {
      // opencode may emit non-JSON log noise on stdout in some modes; ignore it.
      return;
    }

    // Response to one of our requests.
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const pending = this.pending.get(msg.id as number);
      if (!pending) return;
      this.pending.delete(msg.id as number);
      if (msg.error) {
        pending.reject(new Error(`ACP error ${msg.error.code}: ${msg.error.message}`));
      } else {
        pending.resolve(msg.result);
      }
      return;
    }

    // Inbound request or notification from the agent.
    if (msg.method) {
      this.handleInbound(msg);
    }
  }

  private handleInbound(msg: JsonRpcMessage): void {
    const params = (msg.params ?? {}) as Record<string, unknown>;

    if (msg.method === 'session/update') {
      const raw = (params.update ?? params) as Record<string, unknown>;
      this.events.onUpdate?.(normalizeUpdate(raw));
      return;
    }

    if (msg.method === 'session/request_permission') {
      // Auto-approve. The sandbox (network policy + ephemeral pod) is the real
      // boundary; we don't gate individual tool calls in the PoC.
      const options = (params.options ?? []) as Array<{ name: string; optionId: string }>;
      const allow =
        options.find((o) => /allow|yes|approve|once|always/i.test(o.name)) ?? options[0];
      this.respond(msg.id, {
        outcome: allow
          ? { outcome: 'selected', optionId: allow.optionId }
          : { outcome: 'cancelled' },
      });
      return;
    }

    // Unknown inbound request: reply with method-not-found so the agent isn't
    // left waiting.
    if (msg.id !== undefined) {
      this.respondError(msg.id, -32601, `Method not handled: ${msg.method}`);
    }
  }

  private send(msg: JsonRpcMessage): void {
    if (this.closed) return;
    this.stdin.write(`${JSON.stringify(msg)}\n`);
  }

  private respond(id: JsonRpcMessage['id'], result: unknown): void {
    this.send({ jsonrpc: '2.0', id, result });
  }

  private respondError(id: JsonRpcMessage['id'], code: number, message: string): void {
    this.send({ jsonrpc: '2.0', id, error: { code, message } });
  }

  private request<T>(method: string, params: unknown, timeoutMs: number): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`ACP request "${method}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v as T);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  private onClose(err: Error): void {
    if (this.closed) return;
    this.closed = true;
    for (const [, p] of this.pending) {
      p.reject(err);
    }
    this.pending.clear();
  }

  async initialize(timeoutMs = 30_000): Promise<void> {
    await this.request(
      'initialize',
      { protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} },
      timeoutMs
    );
    this.logger.debug('ACP initialize complete');
  }

  async newSession({
    cwd,
    mcpServers,
    timeoutMs = 60_000,
  }: {
    cwd: string;
    mcpServers: AcpMcpServer[];
    timeoutMs?: number;
  }): Promise<string> {
    const result = await this.request<{ sessionId: string }>(
      'session/new',
      { cwd, mcpServers },
      timeoutMs
    );
    this.logger.debug(`ACP session created: ${result.sessionId}`);
    return result.sessionId;
  }

  async prompt({
    sessionId,
    text,
    timeoutMs,
  }: {
    sessionId: string;
    text: string;
    timeoutMs: number;
  }): Promise<AcpPromptResult> {
    return this.request<AcpPromptResult>(
      'session/prompt',
      { sessionId, prompt: [{ type: 'text', text }] },
      timeoutMs
    );
  }

  close(): void {
    this.onClose(new Error('ACP client closed'));
  }
}
