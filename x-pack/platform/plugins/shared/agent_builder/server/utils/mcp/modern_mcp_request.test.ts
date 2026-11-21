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

import { Subject } from 'rxjs';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { McpServer } from '@modelcontextprotocol/server';
import { z } from '@kbn/zod/v4';
import { isModernMcpRequest, serveModernMcpRequest } from './modern_mcp_request';

const MODERN_VERSION = '2026-07-28';

const envelope = (protocolVersion: string = MODERN_VERSION) => ({
  'io.modelcontextprotocol/protocolVersion': protocolVersion,
  'io.modelcontextprotocol/clientInfo': { name: 'test-client', version: '1.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {},
});

const createRequest = ({
  body,
  headers = {},
}: {
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}) =>
  ({
    url: new URL('http://localhost/api/agent_builder/mcp'),
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      ...headers,
    },
    body,
    events: { aborted$: new Subject<void>() },
  } as unknown as KibanaRequest);

const createModernRequest = ({
  method,
  name,
  params = {},
  protocolVersion = MODERN_VERSION,
}: {
  method: string;
  name?: string;
  params?: Record<string, unknown>;
  protocolVersion?: string;
}) =>
  createRequest({
    body: {
      jsonrpc: '2.0',
      id: 1,
      method,
      params: { ...params, _meta: envelope(protocolVersion) },
    },
    headers: {
      'mcp-protocol-version': protocolVersion,
      'mcp-method': method,
      ...(name ? { 'mcp-name': name } : {}),
    },
  });

const response = {
  custom: jest.fn((options) => options),
} as unknown as KibanaResponseFactory;

const createServer = async () => {
  const server = new McpServer({ name: 'test-server', version: '1.0.0' });
  server.registerTool(
    'greet',
    { description: 'Greets', inputSchema: { name: z.string() } },
    async ({ name }) => ({ content: [{ type: 'text', text: `Hello, ${name}!` }] })
  );
  return server;
};

const serve = async (request: KibanaRequest) => {
  const result = (await serveModernMcpRequest({ request, response, createServer })) as unknown as {
    statusCode: number;
    body: string;
    bypassErrorFormat: boolean;
  };
  return { ...result, json: JSON.parse(result.body) };
};

describe('isModernMcpRequest', () => {
  it('returns false for a 2025-era initialize request', async () => {
    const request = createRequest({
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      },
    });

    expect(await isModernMcpRequest(request)).toBe(false);
  });

  it('returns true for a request carrying the 2026-07-28 envelope', async () => {
    expect(await isModernMcpRequest(createModernRequest({ method: 'tools/list' }))).toBe(true);
  });
});

describe('serveModernMcpRequest', () => {
  it('advertises 2026-07-28 on server/discover', async () => {
    const { statusCode, json } = await serve(createModernRequest({ method: 'server/discover' }));

    expect(statusCode).toBe(200);
    expect(json.result.supportedVersions).toContain(MODERN_VERSION);
  });

  it('calls a tool', async () => {
    const { statusCode, json } = await serve(
      createModernRequest({
        method: 'tools/call',
        name: 'greet',
        params: { name: 'greet', arguments: { name: 'Kibana' } },
      })
    );

    expect(statusCode).toBe(200);
    expect(json.result.content).toEqual([{ type: 'text', text: 'Hello, Kibana!' }]);
  });

  it('returns JSON-RPC errors unformatted so clients can negotiate the version', async () => {
    const { statusCode, json, bypassErrorFormat } = await serve(
      createModernRequest({ method: 'tools/list', protocolVersion: '2099-01-01' })
    );

    expect(statusCode).toBe(400);
    expect(bypassErrorFormat).toBe(true);
    expect(json.error.code).toBe(-32022);
  });
});
