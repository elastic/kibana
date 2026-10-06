/**
 * @jest-environment node
 */

/* eslint-disable @kbn/eslint/require-license-header */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { clientTypes } from '@kbn/connector-specs/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { BuildContext } from '@kbn/connector-specs';

const AUTH_HEADER = 'Bearer secret-token';

interface JsonRpcMessage {
  id?: number | string;
  method?: string;
  params?: {
    protocolVersion?: string;
    name?: string;
  };
}

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const sendJson = (res: ServerResponse, status: number, body: unknown, sessionId?: string): void => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
    ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
  });
  res.end(payload);
};

type FailNextInitializeWith = 503 | 'destroy' | undefined;

/**
 * Minimal Streamable HTTP MCP endpoint. Auth is checked before JSON-RPC handling. A successful
 * tool call follows initialize, the initialized 202, and the GET SSE channel. With `holdGetStream`
 * the GET request is parked without a response until `releaseGetStreams()` is called.
 */
const startMcpServer = async (): Promise<{
  url: string;
  authorizations: string[];
  initializeCount: number;
  getCount: number;
  heldGetCount: number;
  failNextInitializeWith: FailNextInitializeWith;
  holdGetStream: boolean;
  waitForHeldGet: () => Promise<void>;
  releaseGetStreams: () => void;
  reset: () => void;
  close: () => Promise<void>;
}> => {
  const state: {
    authorizations: string[];
    initializeCount: number;
    getCount: number;
    failNextInitializeWith: FailNextInitializeWith;
    holdGetStream: boolean;
  } = {
    authorizations: [],
    initializeCount: 0,
    getCount: 0,
    failNextInitializeWith: undefined,
    holdGetStream: false,
  };
  const sessionId = randomUUID();
  const openStreams = new Set<ServerResponse>();
  const heldStreams = new Set<ServerResponse>();
  let heldGetWaiters: Array<() => void> = [];

  const openSseStream = (res: ServerResponse) => {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      'mcp-session-id': sessionId,
    });
    res.write(': open\n\n');
    res.socket?.unref();
    openStreams.add(res);
    res.on('close', () => openStreams.delete(res));
  };

  const httpServer: Server = createServer(async (req, res) => {
    const authorization = req.headers.authorization;
    if (authorization !== AUTH_HEADER) {
      if (req.method === 'POST') {
        state.initializeCount += 1;
      }
      sendJson(res, 401, { error: 'unauthorized' });
      return;
    }
    state.authorizations.push(authorization);

    if (req.method === 'GET') {
      state.getCount += 1;
      if (state.holdGetStream) {
        heldStreams.add(res);
        res.on('close', () => heldStreams.delete(res));
        const waiters = heldGetWaiters;
        heldGetWaiters = [];
        waiters.forEach((resolve) => resolve());
        return;
      }
      openSseStream(res);
      return;
    }

    if (req.method === 'DELETE') {
      res.writeHead(200);
      res.end();
      return;
    }

    const raw = await readBody(req);
    const message = (raw ? JSON.parse(raw) : {}) as JsonRpcMessage;
    const method = message.method;

    if (method === 'initialize') {
      state.initializeCount += 1;
      const failWith = state.failNextInitializeWith;
      if (failWith !== undefined) {
        state.failNextInitializeWith = undefined;
        if (failWith === 503) {
          sendJson(res, 503, { error: 'unavailable' });
          return;
        }
        req.socket.destroy();
        return;
      }
      sendJson(
        res,
        200,
        {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: message.params?.protocolVersion,
            capabilities: { tools: {} },
            serverInfo: { name: 'wire-test', version: '1.0.0' },
          },
        },
        sessionId
      );
      return;
    }

    if (method === 'notifications/initialized') {
      res.writeHead(202, { 'mcp-session-id': sessionId });
      res.end();
      return;
    }

    if (method === 'tools/call' && message.params?.name === 'ping') {
      sendJson(
        res,
        200,
        {
          jsonrpc: '2.0',
          id: message.id,
          result: { content: [{ type: 'text', text: 'pong' }] },
        },
        sessionId
      );
      return;
    }

    sendJson(
      res,
      200,
      {
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32601, message: `Unhandled method ${method}` },
      },
      sessionId
    );
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', resolve);
  });
  httpServer.unref();
  const address = httpServer.address();
  if (address === null || typeof address === 'string') {
    throw new Error('MCP test server did not bind to a TCP port');
  }

  return {
    url: `http://127.0.0.1:${address.port}/mcp`,
    authorizations: state.authorizations,
    get initializeCount() {
      return state.initializeCount;
    },
    get getCount() {
      return state.getCount;
    },
    get heldGetCount() {
      return heldStreams.size;
    },
    get holdGetStream() {
      return state.holdGetStream;
    },
    set holdGetStream(value: boolean) {
      state.holdGetStream = value;
    },
    waitForHeldGet: () =>
      heldStreams.size > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            heldGetWaiters.push(resolve);
          }),
    releaseGetStreams: () => {
      for (const res of heldStreams) {
        heldStreams.delete(res);
        openSseStream(res);
      }
    },
    get failNextInitializeWith() {
      return state.failNextInitializeWith;
    },
    set failNextInitializeWith(value: FailNextInitializeWith) {
      state.failNextInitializeWith = value;
    },
    reset: () => {
      state.initializeCount = 0;
      state.getCount = 0;
      state.failNextInitializeWith = undefined;
      state.holdGetStream = false;
      state.authorizations.length = 0;
      heldGetWaiters = [];
      for (const res of heldStreams) {
        heldStreams.delete(res);
        res.destroy();
      }
    },
    close: async () => {
      for (const stream of openStreams) {
        stream.end();
      }
      httpServer.closeAllConnections();
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    },
  };
};

const makeBuildContext = (serverUrl: string, authorization: string): BuildContext => ({
  logger: loggerMock.create(),
  config: { serverUrl },
  networkSettings: {
    ensureUriAllowed: (uri) => {
      const { hostname } = new URL(uri);
      if (hostname !== '127.0.0.1') {
        throw new Error(`target url "${uri}" is not allowed`);
      }
    },
    ensureHostnameAllowed: () => undefined,
    getSslSettings: () => ({}),
    getProxySettings: () => undefined,
    getCustomHostSettings: () => undefined,
    getResponseSettings: () => ({ timeout: 60_000, maxContentLength: 1_000_000 }),
  },
  platform: {
    resolveSrvHosts: async () => [],
    buildTlsOptions: () => ({}),
  },
  credential: {
    getAuthHeaders: async () => ({ Authorization: authorization }),
  },
});

describe('MCP client wire', () => {
  let server: Awaited<ReturnType<typeof startMcpServer>>;

  beforeAll(async () => {
    server = await startMcpServer();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    server.reset();
  });

  it('connects and calls a tool through the real fetch', async () => {
    const client = await clientTypes.mcp.build(makeBuildContext(server.url, AUTH_HEADER));

    try {
      const result = await client.callTool({ name: 'ping', arguments: {} });
      expect(result.content).toEqual([{ type: 'text', text: 'pong' }]);
      expect(server.authorizations.length).toBeGreaterThan(0);
      expect(server.authorizations.every((value) => value === AUTH_HEADER)).toBe(true);
    } finally {
      await clientTypes.mcp.terminate(client);
    }
  });

  it('calls a tool while the GET SSE stream has not answered yet', async () => {
    server.holdGetStream = true;
    const client = await clientTypes.mcp.build(makeBuildContext(server.url, AUTH_HEADER));

    try {
      await server.waitForHeldGet();
      expect(server.heldGetCount).toBe(1);

      const result = await client.callTool({ name: 'ping', arguments: {} });
      expect(result.content).toEqual([{ type: 'text', text: 'pong' }]);
      expect(server.heldGetCount).toBe(1);
    } finally {
      server.releaseGetStreams();
      await clientTypes.mcp.terminate(client);
    }
  });

  it('retries initialize after HTTP 503 then connects', async () => {
    server.failNextInitializeWith = 503;
    const client = await clientTypes.mcp.build(makeBuildContext(server.url, AUTH_HEADER));

    try {
      expect(server.initializeCount).toBe(2);
    } finally {
      await clientTypes.mcp.terminate(client);
    }
  });

  it('retries initialize after the first socket is destroyed then connects', async () => {
    server.failNextInitializeWith = 'destroy';
    const client = await clientTypes.mcp.build(makeBuildContext(server.url, AUTH_HEADER));

    try {
      expect(server.initializeCount).toBe(2);
    } finally {
      await clientTypes.mcp.terminate(client);
    }
  });

  it('rejects a connection when the bearer token is wrong and makes exactly one initialize attempt', async () => {
    await expect(
      clientTypes.mcp.build(makeBuildContext(server.url, 'Bearer wrong'))
    ).rejects.toThrow();
    expect(server.initializeCount).toBe(1);
  });
});
