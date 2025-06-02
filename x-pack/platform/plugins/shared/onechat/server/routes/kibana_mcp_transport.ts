/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage, RequestId } from '@modelcontextprotocol/sdk/types.js';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import {
  isJSONRPCRequest,
  isJSONRPCResponse,
  isJSONRPCError,
  JSONRPCMessageSchema,
  isInitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '@kbn/logging';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import { randomUUID } from 'node:crypto';
import { CoreKibanaRequest } from '@kbn/core/packages/http/router-server-internal';
import type { IKibanaResponse } from '@kbn/core/server';

/**
 * Simple MCP transport that works with Kibana's request/response abstractions.
 * This transport handles direct JSON request/response without streaming.
 */
export class KibanaMCPTransport implements Transport {
  // when sessionId is not set (undefined), it means the transport is in stateless mode
  private sessionIdGenerator: (() => string) | undefined;
  private _started: boolean = false;
  private _streamMapping: Map<string, KibanaResponseFactory> = new Map();
  private _requestToStreamMapping: Map<RequestId, string> = new Map();
  private _requestResponseMap: Map<RequestId, JSONRPCMessage> = new Map();
  private _initialized: boolean = false;
  private _pendingResponses: Map<RequestId, JSONRPCMessage> = new Map();
  private _requestIds: Set<RequestId> = new Set();
  private logger: Logger;

  sessionId?: string | undefined;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: { authInfo?: AuthInfo }) => void;

  constructor(options: { sessionIdGenerator?: () => string; logger: Logger }) {
    this.sessionIdGenerator = options.sessionIdGenerator;
    this.logger = options.logger;
  }

  /**
   * Handles an incoming HTTP request, whether GET or POST
   */
  async handleRequest(
    req: CoreKibanaRequest,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    // todo: figure out how to handle GET and DELETE requests
    if (true) {
      await this.handlePostRequest(req, res);
    } else {
      throw new Error('Unsupported request method');
    }
  }

  /**
   * Starts the transport
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
    if (!this._started) {
      return;
    }
    this._started = false;
    this._initialized = false;
    this._pendingResponses.clear();
    this._requestIds.clear();
    this.onclose?.();
  }

  /**
   * Handles a Kibana request and processes MCP messages
   */
  async handlePostRequest(
    request: KibanaRequest<unknown, unknown, unknown>,
    responseFactory: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    try {
      this.logger.info('Starting to handle POST request');

      // Validate the Accept header
      const acceptHeader = request.headers.accept;
      this.logger.info(`Received Accept header: ${acceptHeader}`);

      // The client MUST include an Accept header, listing both application/json and text/event-stream as supported content types.
      if (
        !acceptHeader?.includes('application/json') ||
        !acceptHeader.includes('text/event-stream')
      ) {
        this.logger.warn('Invalid Accept header - missing required content types');
        return responseFactory.customError({
          statusCode: 406,
          body: JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message:
                'Not Acceptable: Client must accept both application/json and text/event-stream',
            },
            id: null,
          }),
        });
      }

      const ct = request.headers['content-type'];
      this.logger.info(`Received Content-Type header: ${ct}`);

      if (!ct || !ct.includes('application/json')) {
        this.logger.warn('Invalid Content-Type header - must be application/json');
        return responseFactory.customError({
          statusCode: 415,
          body: JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Unsupported Media Type: Content-Type must be application/json',
            },
            id: null,
          }),
        });
      }

      const rawMessage = request.body;

      this.logger.info(`Received request body ${JSON.stringify(request)}`);
      this.logger.info(`Received raw message: ${JSON.stringify(rawMessage)}`);

      let messages: JSONRPCMessage[];

      // handle batch and single messages
      if (Array.isArray(rawMessage)) {
        this.logger.info(`Processing batch request with ${rawMessage.length} messages`);
        messages = rawMessage.map((msg) => JSONRPCMessageSchema.parse(msg));
      } else {
        this.logger.info('Processing single message request');
        messages = [JSONRPCMessageSchema.parse(rawMessage)];
      }

      // Check if this is an initialization request
      const isInitializationRequest = messages.some(isInitializeRequest);
      this.logger.info(`Is initialization request: ${isInitializationRequest}`);

      if (isInitializationRequest) {
        if (this._initialized && this.sessionId !== undefined) {
          this.logger.warn('Rejecting initialization request - server already initialized');
          return responseFactory.badRequest({
            body: JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32600,
                message: 'Invalid Request: Server already initialized',
              },
              id: null,
            }),
          });
        }
        if (messages.length > 1) {
          this.logger.warn('Rejecting initialization request - multiple messages not allowed');
          return responseFactory.badRequest({
            body: JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32600,
                message: 'Invalid Request: Only one initialization request is allowed',
              },
              id: null,
            }),
          });
        }
        this.sessionId = this.sessionIdGenerator?.();
        this._initialized = true;
        this.logger.info(`Initialized session with ID: ${this.sessionId}`);
      }

      // check if it contains requests
      const hasRequests = messages.some(isJSONRPCRequest);
      this.logger.info(`Request contains JSON-RPC requests: ${hasRequests}`);

      if (!hasRequests) {
        this.logger.info('Processing notifications/responses only');
        // if it only contains notifications or responses, return 202
        responseFactory.accepted();

        // handle each message
        for (const message of messages) {
          this.onmessage?.(message);
        }
      } else if (hasRequests) {
        this.logger.info('Processing requests with potential streaming');
        // The default behavior is to use SSE streaming
        // but in some cases server will return JSON responses
        const streamId = randomUUID();
        this.logger.info(`Generated stream ID: ${streamId}`);

        // Store the response for this request to send messages back through this connection
        // We need to track by request ID to maintain the connection
        for (const message of messages) {
          if (isJSONRPCRequest(message)) {
            this.logger.info(`Mapping request ID ${message.id} to stream ${streamId}`);
            this._streamMapping.set(streamId, responseFactory);
            this._requestToStreamMapping.set(message.id, streamId);
          }
        }
        // Set up close handler for client disconnects
        request.events.aborted$.subscribe(() => {
          this.logger.info(`Stream ${streamId} aborted by client`);
          this._streamMapping.delete(streamId);
        });

        // handle each message
        for (const message of messages) {
          this.onmessage?.(message);
        }
        this.logger.info('Finished processing all messages');
      }
    } catch (error) {
      this.logger.error(`Error processing request: ${error}`);
      this.logger.info(`Error stack trace: ${error.stack}`);
      // return JSON-RPC formatted error
      return responseFactory.badRequest({
        body: JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32700,
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
  async send(message: JSONRPCMessage, options?: { relatedRequestId?: RequestId }): Promise<any> {
    try {
      this.logger.info(`Sending message: ${JSON.stringify(message)}`);

      let requestId = options?.relatedRequestId;
      if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
        // If the message is a response, use the request ID from the message
        requestId = message.id;
        this.logger.info(`Using message ID as request ID: ${String(requestId)}`);
      }

      if (requestId === undefined) {
        this.logger.info('No request ID found, treating as notification');
        // todo: handle notifications
        return;
      }

      // Get the response for this request
      const streamId = this._requestToStreamMapping.get(requestId);
      this.logger.info(`Found stream ID for request ${String(requestId)}: ${streamId}`);

      const response = this._streamMapping.get(streamId!);
      if (!streamId) {
        const error = `No connection established for request ID: ${String(requestId)}`;
        this.logger.error(error);
        throw new Error(error);
      }

      if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
        this.logger.info(`Processing response/error message for request ${String(requestId)}`);
        this._requestResponseMap.set(requestId, message);
        const relatedIds = Array.from(this._requestToStreamMapping.entries())
          .filter(([_, streamId]) => this._streamMapping.get(streamId) === response)
          .map(([id]) => id);

        this.logger.info(`Found related request IDs: ${relatedIds.join(', ')}`);

        // Check if we have responses for all requests using this connection
        const allResponsesReady = relatedIds.every((id) => this._requestResponseMap.has(id));
        this.logger.info(`All responses ready: ${allResponsesReady}`);

        if (allResponsesReady) {
          if (!response) {
            const error = `No connection established for request ID: ${String(requestId)}`;
            this.logger.error(error);
            throw new Error(error);
          }

          // All responses ready, send as JSON
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (this.sessionId !== undefined) {
            headers['mcp-session-id'] = this.sessionId;
            this.logger.info(`Adding session ID to headers: ${this.sessionId}`);
          }

          const responses = relatedIds.map((id) => this._requestResponseMap.get(id)!);
          const responseBody =
            responses.length === 1 ? JSON.stringify(responses[0]) : JSON.stringify(responses);
          this.logger.info(`Sending response body: ${responseBody}`);

          // Clean up
          for (const id of relatedIds) {
            this._requestResponseMap.delete(id);
            this._requestToStreamMapping.delete(id);
          }

          return response.ok({
            headers,
            body: responseBody,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error sending message: ${error}`);
      this.logger.info(`Error stack trace: ${error.stack}`);
      this.onerror?.(error as Error);
    }
  }
}
