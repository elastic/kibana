/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaMcpHttpTransport } from './kibana_mcp_http_transport';
import type { KibanaRequest, KibanaResponseFactory, RouteMethod } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { CallToolResult, JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from '@kbn/zod';

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');

interface TestServerConfig {
  sessionIdGenerator: (() => string) | undefined;
}

/**
 * Creates a minimal response factory for testing that returns proper response objects
 */
function createMinimalResponseFactory(): KibanaResponseFactory {
  return {
    ok: (options?: { body?: any; headers?: Record<string, string> }) => ({
      status: 200,
      payload: options?.body,
      options: {
        headers: options?.headers || {},
      },
    }),
    accepted: (options?: { body?: any; headers?: Record<string, string> }) => ({
      status: 202,
      payload: options?.body,
      options: {
        headers: options?.headers || {},
      },
    }),
    badRequest: (options?: { body?: any; headers?: Record<string, string> }) => ({
      status: 400,
      payload: options?.body,
      options: {
        headers: options?.headers || {},
      },
    }),
    customError: (options: {
      statusCode: number;
      body?: any;
      headers?: Record<string, string>;
    }) => ({
      status: options.statusCode,
      payload: options.body,
      options: {
        headers: options?.headers || {},
      },
    }),
  } as unknown as KibanaResponseFactory;
}

async function createTestServer(
  config: TestServerConfig = { sessionIdGenerator: () => randomUUID() }
): Promise<{
  transport: KibanaMcpHttpTransport;
  mcpServer: McpServer;
}> {
  const mcpServer = new McpServer(
    { name: 'test-server', version: '1.0.0' },
    { capabilities: { logging: {} } }
  );

  mcpServer.tool(
    'greet',
    'A simple greeting tool',
    { name: z.string().describe('Name to greet') },
    async ({ name }): Promise<CallToolResult> => {
      return { content: [{ type: 'text', text: `Hello, ${name}!` }] };
    }
  );

  const transport = new KibanaMcpHttpTransport({
    sessionIdGenerator: config.sessionIdGenerator,
    logger: mockLogger,
  });

  await mcpServer.connect(transport);

  return { transport, mcpServer };
}

const createMockKibanaRequest = (
  body?: any,
  headers: Record<string, string> = {},
  method: RouteMethod = 'post'
): jest.Mocked<KibanaRequest> =>
  httpServerMock.createKibanaRequest({
    headers,
    body,
    method,
    path: '/test',
  });

const TEST_MESSAGES = {
  initialize: {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      clientInfo: { name: 'test-client', version: '1.0' },
      protocolVersion: '2025-03-26',
      capabilities: {},
    },
    id: 'init-1',
  } as JSONRPCMessage,

  toolsList: {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 'tools-1',
  } as JSONRPCMessage,
};

describe('KibanaMcpHttpTransport', () => {
  let transport: KibanaMcpHttpTransport;
  let responseFactory: KibanaResponseFactory;

  beforeEach(async () => {
    jest.clearAllMocks();
    const { transport: newTransport } = await createTestServer();
    transport = newTransport;
    responseFactory = createMinimalResponseFactory();
  });

  afterEach(async () => {
    await transport.close();
  });

  describe('Initialization', () => {
    it('should reject starting transport twice', async () => {
      await expect(transport.start()).rejects.toThrow('Transport already started');
      await transport.close();
    });

    it('should initialize server and generate session ID', async () => {
      const request = createMockKibanaRequest(TEST_MESSAGES.initialize, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(200);
      const headers = response.options.headers as Record<string, string>;
      expect(headers?.['mcp-session-id']).toBeDefined();
      expect(headers?.['Content-Type']).toBe('application/json');
    });

    it('should reject second initialization request', async () => {
      // First initialization
      const firstRequest = createMockKibanaRequest(TEST_MESSAGES.initialize, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      await transport.handleRequest(firstRequest, responseFactory);

      // Second initialization
      const secondRequest = createMockKibanaRequest(
        { ...TEST_MESSAGES.initialize, id: 'second-init' },
        { 'content-type': 'application/json', accept: 'application/json' }
      );

      const response = await transport.handleRequest(secondRequest, responseFactory);

      expect(response.status).toBe(400);
      const errorData = JSON.parse(response.payload as string);
      expect(errorData).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: expect.stringMatching(/Server already initialized/),
        },
      });
    });

    it('should reject batch initialize request', async () => {
      const batchInitMessages = [
        TEST_MESSAGES.initialize,
        { ...TEST_MESSAGES.initialize, id: 'init-2' },
      ];

      const request = createMockKibanaRequest(batchInitMessages, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(400);
      const errorData = JSON.parse(response.payload as string);
      expect(errorData).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: expect.stringMatching(/Only one initialization request is allowed/),
        },
      });
    });
  });

  describe('Request Handling', () => {
    beforeEach(async () => {
      // Initialize transport to get session ID
      const initRequest = createMockKibanaRequest(TEST_MESSAGES.initialize, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      await transport.handleRequest(initRequest, responseFactory);
    });

    it('should handle POST requests with valid session', async () => {
      const request = createMockKibanaRequest(TEST_MESSAGES.toolsList, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(200);
      const headers = response.options.headers as Record<string, string | string[]>;
      expect(headers?.['Content-Type']).toBe('application/json');

      const responseData = JSON.parse(response.payload as string);

      expect(responseData).toMatchObject({
        jsonrpc: '2.0',
        result: {
          tools: [
            {
              name: 'greet',
              description: 'A simple greeting tool',
              inputSchema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Name to greet',
                  },
                },
                required: ['name'],
                additionalProperties: false,
                $schema: 'http://json-schema.org/draft-07/schema#',
              },
            },
          ],
        },
        id: 'tools-1',
      });
    });

    it('should handle notifications with 202 response', async () => {
      const request = createMockKibanaRequest(
        { jsonrpc: '2.0', method: 'notification/progress', params: { progress: 1 } },
        {
          'content-type': 'application/json',
          accept: 'application/json',
        }
      );

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(202);
    });

    it('should handle batch notifications with 202 response', async () => {
      const batchNotifications = [
        { jsonrpc: '2.0', method: 'notification/progress', params: { progress: 1 } },
        { jsonrpc: '2.0', method: 'notification/progress', params: { progress: 2 } },
      ];

      const request = createMockKibanaRequest(batchNotifications, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(202);
    });

    it('should handle batch requests with multiple responses', async () => {
      const batchRequests = [
        { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 'req-1' },
        { jsonrpc: '2.0', method: 'ping', params: {}, id: 'req-2' },
      ];

      const request = createMockKibanaRequest(batchRequests, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(200);

      const responseData = JSON.parse(response.payload as string);
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData).toHaveLength(2);
    });
  });

  describe('Protocol Version Handling', () => {
    it('should accept requests with matching protocol version', async () => {
      const request = createMockKibanaRequest(TEST_MESSAGES.toolsList, {
        'content-type': 'application/json',
        accept: 'application/json',
        'mcp-protocol-version': '2025-06-18',
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(200);
    });

    it('should accept requests without protocol version header', async () => {
      const request = createMockKibanaRequest(TEST_MESSAGES.toolsList, {
        'content-type': 'application/json',
        accept: 'application/json',
        // No mcp-protocol-version header
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(200);
    });

    it('should reject requests with unsupported protocol version', async () => {
      const request = createMockKibanaRequest(TEST_MESSAGES.toolsList, {
        'content-type': 'application/json',
        accept: 'application/json',
        'mcp-protocol-version': '1999-01-01',
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(400);
      const errorData = JSON.parse(response.payload as string);
      expect(errorData).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: expect.stringMatching(
            /Bad Request: Unsupported protocol version \[1999-01-01\] \(supported versions: .+\)/
          ),
        },
      });
    });

    it('should accept when protocol version differs from negotiated version', async () => {
      const request = createMockKibanaRequest(TEST_MESSAGES.toolsList, {
        'content-type': 'application/json',
        accept: 'application/json',
        'mcp-protocol-version': '2024-11-05', // Different but supported version
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should reject requests without Accept header containing application/json', async () => {
      const request = createMockKibanaRequest(TEST_MESSAGES.initialize, {
        'content-type': 'application/json',
        accept: 'text/html',
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(406);
      const errorData = JSON.parse(response.payload as string);
      expect(errorData).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: expect.stringMatching(/Client must accept application\/json/),
        },
      });
    });

    it('should reject requests with invalid Content-Type', async () => {
      const request = createMockKibanaRequest(TEST_MESSAGES.initialize, {
        'content-type': 'text/plain',
        accept: 'application/json',
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(415);
      const errorData = JSON.parse(response.payload as string);
      expect(errorData).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: expect.stringMatching(/Content-Type must be application\/json/),
        },
      });
    });

    it('should handle unsupported HTTP methods', async () => {
      const request = createMockKibanaRequest(undefined, {}, 'get');

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(405);
      const errorData = JSON.parse(response.payload as string);
      expect(errorData).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Method not allowed.',
        },
      });
    });

    it('should handle invalid JSON data', async () => {
      // Create request with invalid JSON structure that will fail parsing
      const request = createMockKibanaRequest(
        'invalid json', // This will cause JSON parsing to fail
        { 'content-type': 'application/json', accept: 'application/json' }
      );

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(400);
      const errorData = JSON.parse(response.payload as string);
      expect(errorData).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
        },
      });
    });

    it('should handle invalid JSON-RPC messages', async () => {
      const invalidMessage = { method: 'test', params: {} }; // missing jsonrpc and id

      const request = createMockKibanaRequest(invalidMessage, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(400);
    });
  });

  describe('Session Management', () => {
    it('should include session ID in responses after initialization', async () => {
      const initRequest = createMockKibanaRequest(TEST_MESSAGES.initialize, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      const initResponse = await transport.handleRequest(initRequest, responseFactory);
      const initHeaders = initResponse.options.headers as Record<string, string | string[]>;
      const sessionId = initHeaders?.['mcp-session-id'] as string;

      expect(sessionId).toBeDefined();

      const toolsRequest = createMockKibanaRequest(TEST_MESSAGES.toolsList, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      const toolsResponse = await transport.handleRequest(toolsRequest, responseFactory);

      expect(toolsResponse.status).toBe(200);
      const toolsHeaders = toolsResponse.options.headers as Record<string, string | string[]>;
      expect(toolsHeaders?.['mcp-session-id']).toBe(sessionId);
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      const initRequest = createMockKibanaRequest(TEST_MESSAGES.initialize, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      await transport.handleRequest(initRequest, responseFactory);
    });

    it('should send responses for requests', async () => {
      const request = createMockKibanaRequest(TEST_MESSAGES.toolsList, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      const response = await transport.handleRequest(request, responseFactory);

      expect(response.status).toBe(200);

      const responseData = JSON.parse(response.payload as string);
      expect(responseData).toMatchObject({
        jsonrpc: '2.0',
        result: {
          tools: [
            {
              name: 'greet',
              description: 'A simple greeting tool',
              inputSchema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Name to greet',
                  },
                },
                required: ['name'],
                additionalProperties: false,
                $schema: 'http://json-schema.org/draft-07/schema#',
              },
            },
          ],
        },
        id: 'tools-1',
      });
    });
  });

  describe('Connection Management', () => {
    it('should clean up resources on close', async () => {
      const initRequest = createMockKibanaRequest(TEST_MESSAGES.initialize, {
        'content-type': 'application/json',
        accept: 'application/json',
      });

      await transport.handleRequest(initRequest, responseFactory);

      const onCloseSpy = jest.fn();
      transport.onclose = onCloseSpy;

      await transport.close();

      expect(onCloseSpy).toHaveBeenCalled();
      expect((transport as any)._initialized).toBe(false);
      expect((transport as any).sessionId).toBeUndefined();
    });
  });

  describe('Error Handling in send()', () => {
    it('should call onerror callback when send() fails', async () => {
      const onErrorSpy = jest.fn();
      transport.onerror = onErrorSpy;

      // Try to send a response without establishing a connection
      const response: JSONRPCMessage = {
        jsonrpc: '2.0',
        result: {},
        id: 'non-existent',
      };

      await transport.send(response);

      expect(onErrorSpy).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
