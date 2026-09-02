/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { KibanaRequest, KibanaResponseFactory, IKibanaResponse } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { DefaultRequestHandler, JsonRpcTransportHandler, A2AError } from '@a2a-js/sdk/server';
import type { AgentCard, JSONRPCResponse } from '@a2a-js/sdk';
import { isAgentBuilderError } from '@kbn/agent-builder-common';

import type { InternalStartServices } from '../../services';
import { createAgentCard } from './create_agent_card';
import { KibanaAgentExecutor } from './kibana_agent_executor';
import { KibanaTaskStore } from './kibana_task_store';
import { asyncGeneratorToA2ASSE } from './a2a_sse_stream';
import { getSSEResponseHeaders } from '../../routes/utils';

/**
 * JSON-RPC methods that return a streaming response (AsyncGenerator).
 */
const STREAMING_METHODS = new Set(['message/stream', 'tasks/resubscribe']);

/**
 * Reads the JSON-RPC `message/send` blocking flag from the raw request body.
 * Defaults to `true` (today's synchronous behavior) when absent or for other methods.
 */
const isBlockingRequest = (body: unknown): boolean =>
  get(body, 'params.configuration.blocking') !== false;

const isStreamingMethod = (body: unknown): boolean => {
  const method = get(body, 'method');
  return typeof method === 'string' && STREAMING_METHODS.has(method);
};

/**
 * The A2A SDK's `JsonRpcTransportHandler.handle()` returns either a Promise
 * (for `message/send` etc.) or an AsyncGenerator (for `message/stream` /
 * `tasks/resubscribe`). We only need to detect the streaming shape, and any
 * async-iterable is sufficient for `for await`; hence this checks the general
 * iterable protocol rather than an AsyncGenerator specifically.
 */
const isAsyncIterable = (value: unknown): value is AsyncIterable<JSONRPCResponse> =>
  value !== null &&
  typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === 'function';

const statusCodeForError = (error: unknown): number => {
  if (isAgentBuilderError(error) && typeof error.meta?.statusCode === 'number') {
    return error.meta.statusCode;
  }
  return 500;
};

const describeError = (error: unknown): string => {
  if (isAgentBuilderError(error)) {
    return `[${error.code}] ${error.message}`;
  }
  return `${error}`;
};

export interface KibanaA2AAdapterDeps {
  logger: Logger;
  getInternalServices: () => InternalStartServices;
  getBaseUrl: (request: KibanaRequest) => Promise<string>;
  isCloudEnabled?: boolean;
}

/**
 * Kibana adapter for the A2A SDK
 */
export class KibanaA2AAdapter {
  private readonly logger: Logger;
  private readonly getInternalServices: () => InternalStartServices;
  private readonly getBaseUrl: (request: KibanaRequest) => Promise<string>;
  private readonly isCloudEnabled: boolean;

  constructor({
    logger,
    getInternalServices,
    getBaseUrl,
    isCloudEnabled = false,
  }: KibanaA2AAdapterDeps) {
    this.logger = logger;
    this.getInternalServices = getInternalServices;
    this.getBaseUrl = getBaseUrl;
    this.isCloudEnabled = isCloudEnabled;
  }

  /**
   * Create A2A components for a specific agent and request
   */
  private async createA2AComponents(
    kibanaRequest: KibanaRequest,
    agentId: string,
    {
      blocking = true,
      isStreaming = false,
      abortSignal,
    }: { blocking?: boolean; isStreaming?: boolean; abortSignal?: AbortSignal } = {}
  ) {
    // Get agent and create agent card
    const { agents, tools } = this.getInternalServices();
    const agentRegistry = await agents.getRegistry({ request: kibanaRequest });
    const agent = await agentRegistry.get(agentId);
    const configuration = await agents.resolveAgentConfiguration({ agent, request: kibanaRequest });

    const agentCard = await createAgentCard({
      agent,
      configuration,
      baseUrl: await this.getBaseUrl(kibanaRequest),
      toolsService: tools,
      request: kibanaRequest,
    });

    // Kibana load balancing lacks session affinity, so `tasks/get` polling for a non-blocking
    // execution may land on a different node than the one that scheduled it. Backing the store
    // with the ES-persisted execution document (rather than in-memory) makes that safe.
    const taskStore = new KibanaTaskStore(this.getInternalServices, kibanaRequest);

    const agentExecutor = new KibanaAgentExecutor({
      logger: this.logger,
      getInternalServices: this.getInternalServices,
      request: kibanaRequest,
      agentId,
      blocking,
      isStreaming,
      abortSignal,
    });

    const requestHandler = new DefaultRequestHandler(
      agentCard as AgentCard,
      taskStore,
      agentExecutor
    );

    const jsonRpcHandler = new JsonRpcTransportHandler(requestHandler);

    return { requestHandler, jsonRpcHandler };
  }

  /**
   * Handle agent card requests
   */
  async handleAgentCardRequest(
    req: KibanaRequest,
    res: KibanaResponseFactory,
    agentId: string
  ): Promise<IKibanaResponse> {
    try {
      const { requestHandler } = await this.createA2AComponents(req, agentId);
      const agentCard = await requestHandler.getAgentCard();

      return res.ok({
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
        body: agentCard,
      });
    } catch (error) {
      this.logger.error(`A2A: Failed to serve agent card for ${agentId}: ${error}`);
      return res.customError({
        statusCode: statusCodeForError(error),
        body: { message: `Failed to serve agent card: ${describeError(error)}` },
      });
    }
  }

  /**
   * Handle A2A JSON-RPC requests
   */
  async handleA2ARequest(
    req: KibanaRequest,
    res: KibanaResponseFactory,
    agentId: string
  ): Promise<IKibanaResponse> {
    try {
      this.logger.debug(`A2A: Processing request for agent ${agentId}`);

      // Validate content type
      const contentType = req.headers['content-type'];
      if (!contentType?.includes('application/json')) {
        return res.badRequest({
          body: { message: 'Content-Type must be application/json' },
        });
      }

      const streaming = isStreamingMethod(req.body);

      const abortController = new AbortController();
      const abortSub = req.events.aborted$.subscribe(() => abortController.abort());

      const { jsonRpcHandler } = await this.createA2AComponents(req, agentId, {
        blocking: isBlockingRequest(req.body),
        isStreaming: streaming,
        abortSignal: abortController.signal,
      });

      const result = await jsonRpcHandler.handle(req.body);

      if (isAsyncIterable(result)) {
        const body = asyncGeneratorToA2ASSE(result, {
          logger: this.logger,
          signal: abortController.signal,
          requestId: get(req.body, 'id', null) as string | number | null,
          isCloudEnabled: this.isCloudEnabled,
        });

        body.on('close', () => abortSub.unsubscribe());

        return res.ok({
          headers: getSSEResponseHeaders(),
          body,
        });
      }

      abortSub.unsubscribe();
      return res.ok({
        headers: { 'Content-Type': 'application/json' },
        body: result,
      });
    } catch (error) {
      this.logger.error(`A2A: Request failed for agent ${agentId}: ${error}`);

      if (error instanceof A2AError) {
        return res.badRequest({
          body: error.toJSONRPCError(),
        });
      }

      return res.customError({
        statusCode: statusCodeForError(error),
        body: { message: `Internal server error: ${describeError(error)}` },
      });
    }
  }

  /**
   * Handle unsupported methods
   */
  async handleUnsupportedRequest(
    req: KibanaRequest,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    this.logger.warn(`A2A: Unsupported method: ${req.route.method}`);
    return res.customError({
      statusCode: 405,
      body: { message: 'Method not allowed' },
    });
  }
}
