/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import WebSocket from 'ws';
import type { Logger } from '@kbn/core/server';

/** Frames exchanged with the bridge over the spawn WebSocket. */
interface StdioFrame {
  type: 'stdout' | 'stderr' | 'exit';
  data?: string;
  enc?: 'b64';
  code?: number;
}

/**
 * A ChildProcess-compatible facade over the bridge's spawn WebSocket. Exposes
 * `stdin` (writable), `stdout`/`stderr` (readable), `kill()`, and emits `close`
 * with the exit code — the subset the OpenCode ACP runtime relies on, so a
 * Cloud Run sandbox is driven exactly like a local `kubectl exec` child.
 *
 * The bridge tunnels `sandbox exec <name> -- <argv>` stdio as JSON frames; this
 * maps them onto the standard streams. Uses the `ws` client (auth headers are
 * resolved lazily, since minting the GCP ID token is async).
 */
export class BridgeChildProcess extends EventEmitter {
  readonly stdin: PassThrough;
  readonly stdout: PassThrough;
  readonly stderr: PassThrough;

  private socket?: WebSocket;
  private closed = false;
  private connected = false;
  private pendingStdin: Buffer[] = [];

  constructor(
    private readonly url: URL,
    getAuthHeaders: () => Promise<Record<string, string>>,
    private readonly logger: Logger
  ) {
    super();
    this.stdin = new PassThrough();
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.stdin.on('data', (chunk: Buffer) => this.sendFrame(chunk));
    this.stdin.on('end', () => this.send({ type: 'stdin_end' }));
    getAuthHeaders()
      .then((headers) => this.connect(headers))
      .catch((e) => this.fail(e as Error));
  }

  private connect(headers: Record<string, string>): void {
    if (this.closed) return;
    // ws:// or wss:// depending on the bridge scheme.
    const wsUrl = new URL(this.url.toString());
    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(wsUrl, { headers });
    this.socket = socket;

    socket.on('open', () => {
      this.connected = true;
      for (const chunk of this.pendingStdin) this.sendFrame(chunk);
      this.pendingStdin = [];
      this.emit('spawn');
    });
    socket.on('message', (data: WebSocket.RawData) => this.handleFrame(data.toString()));
    socket.on('close', () => this.finish(0));
    socket.on('error', (e) => this.fail(e as Error));
  }

  private handleFrame(text: string): void {
    let frame: StdioFrame;
    try {
      frame = JSON.parse(text);
    } catch {
      return;
    }
    if (frame.type === 'exit') {
      this.finish(frame.code ?? 0);
      return;
    }
    const buf =
      frame.enc === 'b64' && frame.data
        ? Buffer.from(frame.data, 'base64')
        : Buffer.from(frame.data ?? '');
    if (frame.type === 'stdout') this.stdout.write(buf);
    else if (frame.type === 'stderr') this.stderr.write(buf);
  }

  private sendFrame(data: Buffer): void {
    if (!this.connected) {
      this.pendingStdin.push(data);
      return;
    }
    this.send({ type: 'stdin', data: data.toString('base64'), enc: 'b64' });
  }

  private send(obj: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(obj));
    }
  }

  private finish(code: number): void {
    if (this.closed) return;
    this.closed = true;
    this.stdout.end();
    this.stderr.end();
    try {
      this.socket?.close();
    } catch {
      // ignore
    }
    this.emit('close', code);
    this.emit('exit', code);
  }

  private fail(err: Error): void {
    this.logger.warn(`cloud-run bridge spawn error: ${err.message}`);
    this.emit('error', err);
    this.finish(1);
  }

  kill(signal: NodeJS.Signals = 'SIGTERM'): void {
    this.send({ type: 'signal', signal });
    setTimeout(() => this.finish(0), 250);
  }
}
