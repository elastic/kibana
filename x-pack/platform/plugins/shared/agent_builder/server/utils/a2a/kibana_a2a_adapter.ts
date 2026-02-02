/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory, IKibanaResponse } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  InMemoryTaskStore,
  DefaultRequestHandler,
  JsonRpcTransportHandler,
  A2AError,
} from '@a2a-js/sdk/server';
import type { AgentCard } from '@a2a-js/sdk';

import type { InternalStartServices } from '../../services';
import { createAgentCard } from './create_agent_card';
import { KibanaAgentExecutor } from './kibana_agent_executor';

/**
 * Kibana adapter for the A2A SDK
 */
export class KibanaA2AAdapter {
  constructor(
    private logger: Logger,
    private getInternalServices: () => InternalStartServices,
    private getBaseUrl: (request: KibanaRequest) => Promise<string>
  ) {}

  /**
   * Create A2A components for a specific agent and request
   */
  private async createA2AComponents(kibanaRequest: KibanaRequest, agentId: string) {
    // Get agent and create agent card
    const { agents, tools } = this.getInternalServices();
    const agentRegistry = await agents.getRegistry({ request: kibanaRequest });
    const agent = await agentRegistry.get(agentId);

    const agentCard = await createAgentCard({
      agent,
      baseUrl: await this.getBaseUrl(kibanaRequest),
      toolsService: tools,
      request: kibanaRequest,
    });

    // Kibana load balancing lacks session affinity, user requests may hit different nodes.
    // This task store is unused but required by the A2A SDK.
    const taskStore = new InMemoryTaskStore();

    const agentExecutor = new KibanaAgentExecutor(
      this.logger,
      this.getInternalServices,
      kibanaRequest,
      agentId
    );

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
        statusCode: 500,
        body: { message: `Failed to serve agent card: ${error}` },
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

      // Process request through A2A SDK
      const { jsonRpcHandler } = await this.createA2AComponents(req, agentId);
      const result = await jsonRpcHandler.handle(req.body);

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
        statusCode: 500,
        body: { message: `Internal server error: ${error}` },
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
