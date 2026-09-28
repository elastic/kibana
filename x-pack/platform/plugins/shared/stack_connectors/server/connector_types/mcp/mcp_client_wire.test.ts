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

/**
 * Minimal Streamable HTTP MCP endpoint. Auth is checked before JSON-RPC handling. A successful
 * tool call follows initialize, the initialized 202 (which arms the SSE gate), and the GET SSE channel.
 */
const startMcpServer = async (): Promise<{
  url: string;
  authorizations: string[];
  close: () => Promise<void>;
}> => {
  const authorizations: string[] = [];
  const sessionId = randomUUID();
  const openStreams = new Set<ServerResponse>();

  const httpServer: Server = createServer(async (req, res) => {
    const authorization = req.headers.authorization;
    if (authorization !== AUTH_HEADER) {
      sendJson(res, 401, { error: 'unauthorized' });
      return;
    }
    authorizations.push(authorization);

    if (req.method === 'GET') {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'mcp-session-id': sessionId,
      });
      res.write(': open\n\n');
      res.socket?.unref();
      openStreams.add(res);
      res.on('close', () => openStreams.delete(res));
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
    authorizations,
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

  it('connects and calls a tool through the real fetch and SSE gate', async () => {
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

  it('rejects a connection when the bearer token is wrong', async () => {
    await expect(
      clientTypes.mcp.build(makeBuildContext(server.url, 'Bearer wrong'))
    ).rejects.toThrow();
  });
});
