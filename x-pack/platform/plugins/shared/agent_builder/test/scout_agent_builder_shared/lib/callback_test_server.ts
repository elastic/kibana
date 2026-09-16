/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import getPort from 'get-port';

export interface CallbackTestServerRequest {
  method?: string;
  url?: string;
  headers: http.IncomingHttpHeaders;
  rawBody: string;
  body: unknown;
}

interface PendingWaiter {
  resolve: (request: CallbackTestServerRequest) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class CallbackTestServer {
  private server: http.Server | null = null;
  private port: number | null = null;
  private readonly requests: CallbackTestServerRequest[] = [];
  private readonly waiters: PendingWaiter[] = [];

  async start(): Promise<string> {
    this.port = await getPort({ port: getPort.makeRange(18400, 18499) });

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        resolve(this.getUrl());
      });

      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const waiter of this.waiters.splice(0)) {
        clearTimeout(waiter.timeout);
        waiter.reject(new Error('CallbackTestServer stopped before receiving callback request'));
      }

      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.port = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getUrl(): string {
    if (!this.port) {
      throw new Error('CallbackTestServer has not been started');
    }

    return `http://127.0.0.1:${this.port}`;
  }

  waitForRequest(timeoutMs = 120_000): Promise<CallbackTestServerRequest> {
    const request = this.requests.shift();
    if (request) {
      return Promise.resolve(request);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const waiterIndex = this.waiters.findIndex((waiter) => waiter.resolve === resolve);
        if (waiterIndex >= 0) {
          this.waiters.splice(waiterIndex, 1);
        }
        reject(new Error(`Timed out waiting ${timeoutMs}ms for callback request`));
      }, timeoutMs);

      this.waiters.push({ resolve, reject, timeout });
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const rawBody = await this.readBody(req);
    const request: CallbackTestServerRequest = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      rawBody,
      body: rawBody ? JSON.parse(rawBody) : undefined,
    };

    const waiter = this.waiters.shift();
    if (waiter) {
      clearTimeout(waiter.timeout);
      waiter.resolve(request);
    } else {
      this.requests.push(request);
    }

    res.writeHead(204);
    res.end();
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }
}
