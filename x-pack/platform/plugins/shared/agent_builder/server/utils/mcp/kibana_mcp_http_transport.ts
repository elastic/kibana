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
import { PassThrough } from 'node:stream';

import type { KibanaResponseFactory, KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { IKibanaResponse } from '@kbn/core/server';

interface SseStream {
  stream: PassThrough;
  requestIds: Set<RequestId>;
  responseFactory: KibanaResponseFactory;
}

/**
 * Server transport for Streamable HTTP: this implements the MCP Streamable HTTP transport specification.
 * It supports SSE streaming for bidirectional communication (required for elicitations).
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
  private sessionIdGenerator: (() => string) | undefined;
  private _started: boolean = false;
  private _initialized: boolean = false;
  private _logger: Logger;

  // SSE stream management
  private _activeSseStreams: Map<string, SseStream> = new Map();
  private _requestToStreamMapping: Map<RequestId, string> = new Map();
  private _pendingResponses: Map<RequestId, JSONRPCMessage> = new Map();
  // Track the current POST stream during synchronous request processing
  private _currentPostStreamId: string | null = null;

  sessionId?: string;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;

  constructor(options: { sessionIdGenerator?: () => string; logger: Logger }) {
    this.sessionIdGenerator = options.sessionIdGenerator;
    this._logger = options.logger;
  }

  /**
   * Handles an incoming HTTP request
   */
  async handleRequest(req: KibanaRequest, res: KibanaResponseFactory): Promise<IKibanaResponse> {
    if (req.route.method === 'post') {
      return await this.handlePostRequest(req, res);
    } else if (req.route.method === 'delete') {
      return await this.handleDeleteRequest(req, res);
    } else if (req.route.method === 'get') {
      return await this.handleGetRequest(req, res);
    } else {
      return await this.handleUnsupportedRequest(res);
    }
  }

  /**
   * Handles GET requests for standalone SSE streams (server-to-client notifications)
   */
  async handleGetRequest(
    request: KibanaRequest,
    responseFactory: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    // Validate session
    const incomingSessionId = request.headers['mcp-session-id'] as string | undefined;

    if (this.sessionIdGenerator !== undefined) {
      if (!this._initialized) {
        return this.createJsonErrorResponse(
          responseFactory,
          400,
          -32000,
          'Bad Request: Server not initialized'
        );
      }

      if (!incomingSessionId) {
        return this.createJsonErrorResponse(
          responseFactory,
          400,
          -32000,
          'Bad Request: Mcp-Session-Id header is required'
        );
      }

      if (incomingSessionId !== this.sessionId) {
        return this.createJsonErrorResponse(responseFactory, 404, -32001, 'Session not found');
      }
    }

    // Create a standalone SSE stream for server-to-client notifications
    const streamId = '_GET_stream';

    // Close any existing GET stream (new connection replaces old)
    const existingStream = this._activeSseStreams.get(streamId);
    if (existingStream) {
      existingStream.stream.end();
      this._activeSseStreams.delete(streamId);
    }

    // Create PassThrough stream for SSE
    const sseStream = new PassThrough();

    this._activeSseStreams.set(streamId, {
      stream: sseStream,
      requestIds: new Set(),
      responseFactory,
    });

    // Set up close handler
    request.events.aborted$.subscribe(() => {
      this._activeSseStreams.delete(streamId);
    });

    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'identity',
      Pragma: 'no-cache',
      Expires: '0',
    };

    if (this.sessionId !== undefined) {
      headers['mcp-session-id'] = this.sessionId;
    }

    // Send a priming comment to establish the SSE connection
    sseStream.write(': sse-connected\n\n');

    // Keep-alive ping every 15 seconds to keep the connection active
    const keepAliveInterval = setInterval(() => {
      if (sseStream.writable && !sseStream.destroyed) {
        sseStream.write(': keep-alive\n\n');
      } else {
        clearInterval(keepAliveInterval);
      }
    }, 15000);

    // Clean up interval when stream closes
    request.events.aborted$.subscribe(() => {
      clearInterval(keepAliveInterval);
    });

    return responseFactory.ok({
      headers,
      body: sseStream,
    });
  }

  /**
   * Handles DELETE requests to terminate sessions
   */
  async handleDeleteRequest(
    request: KibanaRequest,
    responseFactory: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    // Validate session
    const incomingSessionId = request.headers['mcp-session-id'] as string | undefined;

    if (this.sessionIdGenerator !== undefined) {
      if (!incomingSessionId) {
        return this.createJsonErrorResponse(
          responseFactory,
          400,
          -32000,
          'Bad Request: Mcp-Session-Id header is required'
        );
      }

      if (incomingSessionId !== this.sessionId) {
        return this.createJsonErrorResponse(responseFactory, 404, -32001, 'Session not found');
      }
    }

    // Close the transport (this will close all streams)
    await this.close();

    return responseFactory.ok({ body: {} });
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
    // Close all active SSE streams
    for (const [streamId, sseStream] of this._activeSseStreams) {
      this._logger.debug(`Closing SSE stream: ${streamId}`);
      sseStream.stream.end();
    }
    this._activeSseStreams.clear();
    this._requestToStreamMapping.clear();
    this._pendingResponses.clear();

    // Clear session state
    this.sessionId = undefined;
    this._initialized = false;
    this.onclose?.();
  }

  /**
   * Writes an SSE event to the stream
   * Format follows the Streamable HTTP specification (no event type)
   */
  private writeSSEEvent(stream: PassThrough, message: JSONRPCMessage, eventId?: string): void {
    let eventData = '';
    if (eventId) {
      eventData += `id: ${eventId}\n`;
    }
    // Streamable HTTP format: just id and data, no event type
    eventData += `data: ${JSON.stringify(message)}\n\n`;
    stream.write(eventData);
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

      // The client MUST include an Accept header, listing application/json or text/event-stream
      const acceptsJson = acceptHeader?.includes('application/json');
      const acceptsSse = acceptHeader?.includes('text/event-stream');

      if (!acceptsJson && !acceptsSse) {
        this._logger.warn('Request rejected: Invalid Accept header');
        return this.createJsonErrorResponse(
          responseFactory,
          406,
          ErrorCode.ConnectionClosed,
          'Not Acceptable: Client must accept application/json or text/event-stream'
        );
      }

      const ct = request.headers['content-type'];

      if (!ct || !ct.includes('application/json')) {
        this._logger.warn('Request rejected: Invalid Content-Type');
        return this.createJsonErrorResponse(
          responseFactory,
          415,
          ErrorCode.ConnectionClosed,
          'Unsupported Media Type: Content-Type must be application/json'
        );
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
          return this.createJsonErrorResponse(
            responseFactory,
            400,
            ErrorCode.InvalidRequest,
            'Invalid Request: Server already initialized'
          );
        }
        if (messages.length > 1) {
          this._logger.warn('Initialization request rejected - multiple messages not allowed');
          return this.createJsonErrorResponse(
            responseFactory,
            400,
            ErrorCode.InvalidRequest,
            'Invalid Request: Only one initialization request is allowed'
          );
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
        // if it only contains notifications or responses, return 202
        for (const message of messages) {
          this.onmessage?.(message, { requestInfo });
        }
        return responseFactory.accepted();
      } else {
        // For requests, return an SSE stream
        const streamId = randomUUID();

        // Create PassThrough stream for SSE
        // Note: Don't use highWaterMark: 0 as we need to buffer data before the stream is piped
        const sseStream = new PassThrough();
        const requestIds = new Set<RequestId>();

        // Track which requests belong to this stream
        for (const message of messages) {
          if (isJSONRPCRequest(message)) {
            requestIds.add(message.id);
            this._requestToStreamMapping.set(message.id, streamId);
          }
        }

        this._activeSseStreams.set(streamId, {
          stream: sseStream,
          requestIds,
          responseFactory,
        });

        // Set up close handler for client disconnects
        request.events.aborted$.subscribe(() => {
          this._logger.debug(`SSE stream ${streamId} aborted by client`);
          this.cleanupStream(streamId);
        });

        // Return SSE response with the stream
        // Include headers to prevent buffering at all levels
        const headers: Record<string, string> = {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Connection: 'keep-alive',
          'X-Content-Type-Options': 'nosniff',
          'X-Accel-Buffering': 'no',
          // Disable compression to prevent buffering
          'Content-Encoding': 'identity',
          Pragma: 'no-cache',
          Expires: '0',
        };

        if (this.sessionId !== undefined) {
          headers['mcp-session-id'] = this.sessionId;
        }

        // Send a priming comment to establish the SSE connection
        sseStream.write(': sse-connected\n\n');

        // Set current POST stream context - this allows send() to route
        // server-to-client messages (like elicitations) to this stream
        this._currentPostStreamId = streamId;

        // Process messages synchronously
        // The stream is already set up and the response will be returned with it
        for (const message of messages) {
          this.onmessage?.(message, { requestInfo });
        }

        return responseFactory.ok({
          headers,
          body: sseStream,
        });
      }
    } catch (error) {
      this._logger.error(`Request processing error: ${error}`);
      this.onerror?.(error as Error);
      return this.createJsonErrorResponse(
        responseFactory,
        400,
        ErrorCode.ParseError,
        'Parse error',
        String(error)
      );
    }
  }

  /**
   * Sends a JSON-RPC message (response or server-to-client request)
   */
  async send(message: JSONRPCMessage, options?: { relatedRequestId?: RequestId }): Promise<void> {
    try {
      let requestId = options?.relatedRequestId;

      // For responses/errors, use the message's id
      if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
        requestId = message.id;
      }

      // Find the stream to send on
      let streamId: string | undefined;

      if (requestId !== undefined) {
        streamId = this._requestToStreamMapping.get(requestId);
      }

      // If no stream found and this is a request (server-to-client), find the right stream
      if (!streamId && isJSONRPCRequest(message)) {
        // Prefer the current POST stream - all elicitations during a tool call
        // should go to the same stream the client is reading from
        if (this._currentPostStreamId) {
          const currentStream = this._activeSseStreams.get(this._currentPostStreamId);
          if (currentStream && currentStream.stream.writable) {
            streamId = this._currentPostStreamId;
          }
        }

        // Fall back to GET stream for server-initiated messages outside of a tool call
        if (!streamId) {
          const getStream = this._activeSseStreams.get('_GET_stream');
          if (getStream && getStream.stream.writable) {
            streamId = '_GET_stream';
          }
        }

        // Last resort: any active POST stream
        if (!streamId) {
          for (const entry of this._activeSseStreams.entries()) {
            if (entry[0] !== '_GET_stream' && entry[1].stream.writable) {
              streamId = entry[0];
              break;
            }
          }
        }

        if (streamId) {
          // Track this request so we can route the response back
          this._requestToStreamMapping.set(message.id, streamId);
          this._activeSseStreams.get(streamId)?.requestIds.add(message.id);
        }
      }

      if (!streamId) {
        this._logger.debug(`No stream found for message (requestId: ${requestId})`);
        return;
      }

      const sseStreamData = this._activeSseStreams.get(streamId);
      if (!sseStreamData) {
        this._logger.debug(`Stream data not found for streamId: ${streamId}`);
        return;
      }

      // Write the message to the SSE stream
      const eventId = randomUUID();
      this.writeSSEEvent(sseStreamData.stream, message, eventId);

      // If this is a response to a client request, check if we should close the stream
      if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
        this._pendingResponses.set(requestId!, message);

        // Check if all original requests have been responded to
        const allResponded = Array.from(sseStreamData.requestIds).every((id) =>
          this._pendingResponses.has(id)
        );

        if (allResponded) {
          this._logger.debug(`All requests responded, closing SSE stream: ${streamId}`);
          // Give a small delay to ensure the client receives the final message
          setTimeout(() => {
            this.cleanupStream(streamId!);
          }, 100);
        }
      }
    } catch (error) {
      this._logger.error(`Error sending message: ${error}`);
      this.onerror?.(error as Error);
    }
  }

  /**
   * Cleans up a stream and its associated resources
   */
  private cleanupStream(streamId: string): void {
    const sseStreamData = this._activeSseStreams.get(streamId);
    if (sseStreamData) {
      sseStreamData.stream.end();
      for (const reqId of sseStreamData.requestIds) {
        this._requestToStreamMapping.delete(reqId);
        this._pendingResponses.delete(reqId);
      }
      this._activeSseStreams.delete(streamId);

      // Clear current POST stream reference if this was it
      if (this._currentPostStreamId === streamId) {
        this._currentPostStreamId = null;
      }

      this._logger.debug(`Cleaned up SSE stream: ${streamId}`);
    }
  }

  /**
   * Creates a JSON error response
   */
  private createJsonErrorResponse(
    responseFactory: KibanaResponseFactory,
    statusCode: number,
    errorCode: number,
    message: string,
    data?: string
  ): IKibanaResponse {
    const errorBody: Record<string, unknown> = {
      jsonrpc: '2.0',
      error: {
        code: errorCode,
        message,
      },
      id: null,
    };
    if (data) {
      (errorBody.error as Record<string, unknown>).data = data;
    }
    return responseFactory.customError({
      statusCode,
      body: JSON.stringify(errorBody),
    });
  }

  /**
   * Handles unsupported requests (GET, DELETE, PUT, PATCH, etc.)
   */
  private async handleUnsupportedRequest(res: KibanaResponseFactory): Promise<IKibanaResponse> {
    return this.createJsonErrorResponse(res, 405, ErrorCode.InvalidRequest, 'Method not allowed.');
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

    return this.createJsonErrorResponse(
      res,
      400,
      ErrorCode.InvalidRequest,
      `Bad Request: Unsupported protocol version [${protocolVersion}] (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(
        ', '
      )})`
    );
  }
}
