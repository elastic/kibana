/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type {
  MessageExtraInfo,
  RequestInfo,
  JSONRPCMessage,
  RequestId,
} from '@modelcontextprotocol/sdk/types.js';
import {
  ErrorCode,
  isInitializeRequest,
  isJSONRPCError,
  isJSONRPCRequest,
  isJSONRPCResponse,
  JSONRPCMessageSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
  DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';

import type { KibanaResponseFactory, KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { IKibanaResponse } from '@kbn/core/server';

/**
 * Server transport for Streamable HTTP: this implements the MCP Streamable HTTP transport specification.
 * It supports direct HTTP responses. It doesn't support SSE streaming.
 *
 * It is compatible with Kibana's HTTP request/response abstractions. Implementation is adapted from:
 * https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/server/streamableHttp.ts
 *
 * In stateful mode:
 * - Session ID is generated and included in response headers
 * - Session ID is always included in initialization responses
 * - Requests with invalid session IDs are rejected with 404 Not Found
 * - Non-initialization requests without a session ID are rejected with 400 Bad Request
 * - State is maintained in-memory (connections, message history)
 *
 * In stateless mode:
 * - No Session ID is included in any responses
 * - No session validation is performed
 */
export class KibanaMcpHttpTransport implements Transport {
  // when sessionId is not set (undefined), it means the transport is in stateless mode
  private sessionIdGenerator: (() => string) | undefined;
  private _started: boolean = false;
  private _streamMapping: Map<string, KibanaResponseFactory> = new Map();
  private _requestToStreamMapping: Map<RequestId, string> = new Map();
  private _requestResponseMap: Map<RequestId, JSONRPCMessage> = new Map();
  private _initialized: boolean = false;
  private _logger: Logger;
  private _responseCallbacks: Map<string, (response: IKibanaResponse) => void> = new Map();

  sessionId?: string;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;

  constructor(options: { sessionIdGenerator?: () => string; logger: Logger }) {
    this.sessionIdGenerator = options.sessionIdGenerator;
    this._logger = options.logger;
  }

  /**
   * Registers a callback for when a response is ready for a specific stream
   */
  private registerResponseCallback(
    streamId: string,
    callback: (response: IKibanaResponse) => void
  ) {
    this._responseCallbacks.set(streamId, callback);
  }

  /**
   * Handles an incoming HTTP request, whether GET or POST
   */
  async handleRequest(req: KibanaRequest, res: KibanaResponseFactory): Promise<IKibanaResponse> {
    if (req.route.method === 'post') {
      return await this.handlePostRequest(req, res);
    } else {
      return await this.handleUnsupportedRequest(res);
    }
  }

  /**
   * Starts the transport. This is required by the Transport interface but is a no-op
   * for the Streamable HTTP transport as connections are managed per-request.
   */
  async start(): Promise<void> {
    if (this._started) {
      throw new Error('Transport already started');
    }
    this._started = true;
  }

  /**
   * Closes the transport and cleans up resources
   */
  async close(): Promise<void> {
    this._streamMapping.clear();

    // Clear any pending responses
    this._requestResponseMap.clear();
    this._requestToStreamMapping.clear();
    this._responseCallbacks.clear();

    // Clear session state
    this.sessionId = undefined;
    this._initialized = false;
    this.onclose?.();
  }

  /**
   * Handles POST requests containing JSON-RPC messages compatible with MCP specification
   */
  async handlePostRequest(
    request: KibanaRequest<unknown, unknown, unknown>,
    responseFactory: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    try {
      // Validate the Accept header
      const acceptHeader = request.headers.accept;

      // The client MUST include an Accept header, listing application/json as supported content type.
      if (!acceptHeader?.includes('application/json')) {
        this._logger.warn('Request rejected: Invalid Accept header');
        return responseFactory.customError({
          statusCode: 406,
          body: JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: ErrorCode.ConnectionClosed,
              message: 'Not Acceptable: Client must accept application/json',
            },
            id: null,
          }),
        });
      }

      const ct = request.headers['content-type'];

      if (!ct || !ct.includes('application/json')) {
        this._logger.warn('Request rejected: Invalid Content-Type');
        return responseFactory.customError({
          statusCode: 415,
          body: JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: ErrorCode.ConnectionClosed,
              message: 'Unsupported Media Type: Content-Type must be application/json',
            },
            id: null,
          }),
        });
      }

      const rawMessage = request.body;
      const requestInfo: RequestInfo = { headers: request.headers };
      let messages: JSONRPCMessage[];

      // handle batch and single messages
      if (Array.isArray(rawMessage)) {
        this._logger.debug(`Processing batch request with ${rawMessage.length} messages`);
        messages = rawMessage.map((msg) => JSONRPCMessageSchema.parse(msg));
      } else {
        this._logger.debug('Processing single message request');
        messages = [JSONRPCMessageSchema.parse(rawMessage)];
      }

      // Check if this is an initialization request
      const isInitializationRequest = messages.some(isInitializeRequest);

      if (isInitializationRequest) {
        if (this._initialized && this.sessionId !== undefined) {
          this._logger.warn('Initialization request rejected - server already initialized');
          return responseFactory.badRequest({
            body: JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: ErrorCode.InvalidRequest,
                message: 'Invalid Request: Server already initialized',
              },
              id: null,
            }),
          });
        }
        if (messages.length > 1) {
          this._logger.warn('Initialization request rejected - multiple messages not allowed');
          return responseFactory.badRequest({
            body: JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: ErrorCode.InvalidRequest,
                message: 'Invalid Request: Only one initialization request is allowed',
              },
              id: null,
            }),
          });
        }
        this.sessionId = this.sessionIdGenerator?.();
        this._initialized = true;
        this._logger.debug(`Session initialized: ${this.sessionId}`);
      }
      if (!isInitializationRequest) {
        // Mcp-Protocol-Version header is required for all requests after initialization.
        if (!this.validateProtocolVersion(request)) {
          return this.generateProtocolVersionErrorResponse(request, responseFactory);
        }
      }

      // check if it contains requests
      const hasRequests = messages.some(isJSONRPCRequest);

      if (!hasRequests) {
        this._logger.debug('Processing notifications/responses');
        // if it only contains notifications or responses, return 202
        const response = responseFactory.accepted();

        // handle each message
        for (const message of messages) {
          this.onmessage?.(message, { requestInfo });
        }
        return response;
      } else {
        const streamId = randomUUID();
        this._logger.debug(`Processing requests with stream ID: ${streamId}`);

        // Create a promise that will resolve when the response is ready
        const responsePromise = new Promise<IKibanaResponse>((resolve) => {
          this.registerResponseCallback(streamId, resolve);
        });

        // Store the response factory for this request to send messages back through this connection
        for (const message of messages) {
          if (isJSONRPCRequest(message)) {
            this._logger.debug(`Mapping request ${message.id} to stream ${streamId}`);
            this._streamMapping.set(streamId, responseFactory);
            this._requestToStreamMapping.set(message.id, streamId);
          }
        }

        // Set up close handler for client disconnects
        request.events.aborted$.subscribe(() => {
          this._logger.debug(`Stream ${streamId} aborted by client`);
          this._streamMapping.delete(streamId);
          this._responseCallbacks.delete(streamId);
        });

        // handle each message
        for (const message of messages) {
          this.onmessage?.(message, { requestInfo });
        }

        // Wait for the response to be ready
        return await responsePromise;
      }
    } catch (error) {
      this._logger.error(`Request processing error: ${error}`);
      this.onerror?.(error as Error);
      return responseFactory.badRequest({
        body: JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: ErrorCode.ParseError,
            message: 'Parse error',
            data: String(error),
          },
          id: null,
        }),
      });
    }
  }

  /**
   * Sends a JSON-RPC message
   */
  async send(message: JSONRPCMessage, options?: { relatedRequestId?: RequestId }): Promise<void> {
    try {
      this._logger.debug('Processing outgoing message');

      let requestId = options?.relatedRequestId;
      if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
        requestId = message.id;
      }

      if (requestId === undefined) {
        this._logger.debug('Processing notification message');
        // todo: handle notifications
        return;
      }

      // Get the response for this request
      const streamId = this._requestToStreamMapping.get(requestId);
      const responseFactory = this._streamMapping.get(streamId!);

      if (!streamId) {
        const error = `No connection established for request ID: ${String(requestId)}`;
        this._logger.error(error);
        throw new Error(error);
      }

      if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
        this._logger.debug(`Processing response for request ${String(requestId)}`);
        this._requestResponseMap.set(requestId, message);
        const relatedIds = Array.from(this._requestToStreamMapping.entries())
          .filter(([_, sid]) => this._streamMapping.get(sid) === responseFactory)
          .map(([id]) => id);

        // Check if we have responses for all requests using this connection
        const allResponsesReady = relatedIds.every((id) => this._requestResponseMap.has(id));

        if (allResponsesReady) {
          if (!responseFactory) {
            const error = `No connection established for request ID: ${String(requestId)}`;
            this._logger.error(error);
            throw new Error(error);
          }

          // All responses ready, send as JSON
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (this.sessionId !== undefined) {
            headers['mcp-session-id'] = this.sessionId;
          }

          const responses = relatedIds.map((id) => this._requestResponseMap.get(id)!);
          const responseBody =
            responses.length === 1 ? JSON.stringify(responses[0]) : JSON.stringify(responses);

          const response = responseFactory.ok({
            headers,
            body: responseBody,
          });

          // Trigger the response callback
          const callback = this._responseCallbacks.get(streamId);
          if (callback) {
            callback(response);
            this._responseCallbacks.delete(streamId);
          }

          // Clean up
          for (const id of relatedIds) {
            this._requestResponseMap.delete(id);
            this._requestToStreamMapping.delete(id);
          }
          this._streamMapping.delete(streamId);
          this._logger.debug('Request mappings cleaned up');
        }
      }
    } catch (error) {
      this._logger.error(`Error sending message: ${error}`);
      this.onerror?.(error as Error);
    }
  }

  /**
   * Handles unsupported requests (GET, DELETE, PUT, PATCH, etc.)
   */
  private async handleUnsupportedRequest(res: KibanaResponseFactory): Promise<IKibanaResponse> {
    return res.customError({
      statusCode: 405,
      body: JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: ErrorCode.InvalidRequest,
          message: 'Method not allowed.',
        },
        id: null,
      }),
    });
  }

  private getProtocolVersion(req: KibanaRequest): string {
    let protocolVersion =
      req.headers['mcp-protocol-version'] ?? DEFAULT_NEGOTIATED_PROTOCOL_VERSION;
    if (Array.isArray(protocolVersion)) {
      protocolVersion = protocolVersion[protocolVersion.length - 1];
    }
    return protocolVersion;
  }

  private validateProtocolVersion(req: KibanaRequest): boolean {
    const protocolVersion = this.getProtocolVersion(req);
    return SUPPORTED_PROTOCOL_VERSIONS.includes(protocolVersion);
  }

  private generateProtocolVersionErrorResponse(
    req: KibanaRequest,
    res: KibanaResponseFactory
  ): IKibanaResponse {
    const protocolVersion = this.getProtocolVersion(req);

    return res.badRequest({
      body: JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: ErrorCode.InvalidRequest,
          message: `Bad Request: Unsupported protocol version [${protocolVersion}] (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(
            ', '
          )})`,
        },
        id: null,
      }),
    });
  }
}
