/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage, RequestId } from '@modelcontextprotocol/sdk/types.js';
import type { KibanaResponseFactory, KibanaRequest } from '@kbn/core-http-server';
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
  private _responseCallbacks: Map<string, (response: IKibanaResponse) => void> = new Map();

  sessionId?: string | undefined;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: { authInfo?: AuthInfo }) => void;

  constructor(options: { sessionIdGenerator?: () => string; logger: Logger }) {
    this.sessionIdGenerator = options.sessionIdGenerator;
    this.logger = options.logger;
  }

  /**
   * Registers a callback for when a response is ready for a specific stream
   */
  registerResponseCallback(streamId: string, callback: (response: IKibanaResponse) => void) {
    this._responseCallbacks.set(streamId, callback);
  }

  /**
   * Handles an incoming HTTP request, whether GET or POST
   */
  async handleRequest(req: KibanaRequest, res: KibanaResponseFactory): Promise<IKibanaResponse> {
    // todo: figure out how to handle GET and DELETE requests
    if (true) {
      return await this.handlePostRequest(req, res);
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
      this.logger.debug('Processing POST request');

      // Validate the Accept header
      const acceptHeader = request.headers.accept;

      // The client MUST include an Accept header, listing both application/json and text/event-stream as supported content types.
      if (
        !acceptHeader?.includes('application/json') ||
        !acceptHeader.includes('text/event-stream')
      ) {
        this.logger.warn('Request rejected: Invalid Accept header');
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

      if (!ct || !ct.includes('application/json')) {
        this.logger.warn('Request rejected: Invalid Content-Type');
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
      let messages: JSONRPCMessage[];

      // handle batch and single messages
      if (Array.isArray(rawMessage)) {
        this.logger.debug(`Processing batch request with ${rawMessage.length} messages`);
        messages = rawMessage.map((msg) => JSONRPCMessageSchema.parse(msg));
      } else {
        this.logger.debug('Processing single message request');
        messages = [JSONRPCMessageSchema.parse(rawMessage)];
      }

      // Check if this is an initialization request
      const isInitializationRequest = messages.some(isInitializeRequest);

      if (isInitializationRequest) {
        if (this._initialized && this.sessionId !== undefined) {
          this.logger.warn('Initialization request rejected - server already initialized');
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
          this.logger.warn('Initialization request rejected - multiple messages not allowed');
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
        this.logger.debug(`Session initialized: ${this.sessionId}`);
      }

      // check if it contains requests
      const hasRequests = messages.some(isJSONRPCRequest);

      if (!hasRequests) {
        this.logger.debug('Processing notifications/responses');
        // if it only contains notifications or responses, return 202
        const response = responseFactory.accepted();

        // handle each message
        for (const message of messages) {
          this.onmessage?.(message);
        }
        return response;
      } else {
        const streamId = randomUUID();
        this.logger.debug(`Processing requests with stream ID: ${streamId}`);

        // Create a promise that will resolve when the response is ready
        const responsePromise = new Promise<IKibanaResponse>((resolve) => {
          this.registerResponseCallback(streamId, resolve);
        });

        // Store the response factory for this request to send messages back through this connection
        for (const message of messages) {
          if (isJSONRPCRequest(message)) {
            this.logger.debug(`Mapping request ${message.id} to stream ${streamId}`);
            this._streamMapping.set(streamId, responseFactory);
            this._requestToStreamMapping.set(message.id, streamId);
          }
        }

        // Set up close handler for client disconnects
        request.events.aborted$.subscribe(() => {
          this.logger.debug(`Stream ${streamId} aborted by client`);
          this._streamMapping.delete(streamId);
          this._responseCallbacks.delete(streamId);
        });

        // handle each message
        for (const message of messages) {
          this.onmessage?.(message);
        }

        // Wait for the response to be ready
        return await responsePromise;
      }
    } catch (error) {
      this.logger.error(`Request processing error: ${error}`);
      this.onerror?.(error as Error);
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
  async send(message: JSONRPCMessage, options?: { relatedRequestId?: RequestId }): Promise<void> {
    try {
      this.logger.debug('Processing outgoing message');

      let requestId = options?.relatedRequestId;
      if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
        requestId = message.id;
      }

      if (requestId === undefined) {
        this.logger.debug('Processing notification message');
        // todo: handle notifications
        return;
      }

      // Get the response for this request
      const streamId = this._requestToStreamMapping.get(requestId);
      const responseFactory = this._streamMapping.get(streamId!);

      if (!streamId) {
        const error = `No connection established for request ID: ${String(requestId)}`;
        this.logger.error(error);
        throw new Error(error);
      }

      if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
        this.logger.debug(`Processing response for request ${String(requestId)}`);
        this._requestResponseMap.set(requestId, message);
        const relatedIds = Array.from(this._requestToStreamMapping.entries())
          .filter(([_, sid]) => this._streamMapping.get(sid) === responseFactory)
          .map(([id]) => id);

        // Check if we have responses for all requests using this connection
        const allResponsesReady = relatedIds.every((id) => this._requestResponseMap.has(id));

        if (allResponsesReady) {
          if (!responseFactory) {
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
          this.logger.debug('Request mappings cleaned up');
        }
      }
    } catch (error) {
      this.logger.error(`Error sending message: ${error}`);
      this.onerror?.(error as Error);
    }
  }
}
