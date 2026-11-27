/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler, isLegacyRequest } from '@modelcontextprotocol/server';
import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';

/**
 * Builds the web-standard request the SDK classifies and serves. The body is not copied:
 * Kibana has already parsed it, so it is handed to the SDK as `parsedBody` instead.
 */
const toWebRequest = (request: KibanaRequest): Request => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    for (const item of [value ?? []].flat()) {
      headers.append(name, item);
    }
  }
  return new Request(request.url, { method: 'POST', headers });
};

/** Whether the request uses the per-request envelope introduced by MCP protocol revision 2026-07-28. */
export const isModernMcpRequest = async (request: KibanaRequest): Promise<boolean> =>
  !(await isLegacyRequest(toWebRequest(request), request.body));

/** Serves an MCP protocol revision 2026-07-28 request with a server built by `createServer`. */
export const serveModernMcpRequest = async ({
  request,
  response,
  createServer,
}: {
  request: KibanaRequest;
  response: KibanaResponseFactory;
  createServer: () => Promise<McpServer>;
}): Promise<IKibanaResponse> => {
  // 2025-era traffic is served by KibanaMcpHttpTransport, and Kibana does not stream responses.
  const handler = createMcpHandler(createServer, { legacy: 'reject', responseMode: 'json' });
  const abortSubscription = request.events.aborted$.subscribe(() => handler.close());

  try {
    const webResponse = await handler.fetch(toWebRequest(request), { parsedBody: request.body });
    return response.custom({
      statusCode: webResponse.status,
      headers: Object.fromEntries(webResponse.headers.entries()),
      body: await webResponse.text(),
      // JSON-RPC errors (e.g. an unsupported protocol version) travel in 4xx bodies, which
      // clients parse to negotiate; Kibana's default error formatting would rewrite them.
      bypassErrorFormat: true,
    });
  } finally {
    abortSubscription.unsubscribe();
  }
};
