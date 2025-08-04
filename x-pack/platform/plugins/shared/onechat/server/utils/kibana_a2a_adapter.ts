/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory, IKibanaResponse } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

// Import A2A SDK components (ignore linter - these work at runtime)
// eslint-disable-next-line import/no-unresolved
import {
  InMemoryTaskStore,
  DefaultRequestHandler,
  JsonRpcTransportHandler,
  A2AError,
} from '@a2a-js/sdk/server';

import type { AgentCard } from '@a2a-js/sdk';
import {
  oneChatDefaultAgentId,
  AgentMode,
  isRoundCompleteEvent,
  ConversationCreatedEvent,
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
  ConversationUpdatedEvent,
} from '@kbn/onechat-common';
import { firstValueFrom, toArray } from 'rxjs';
import type { InternalStartServices } from '../services';
import { createAgentCard } from './create_agent_card';

interface KibanaA2AAdapterParams {
  logger: Logger;
  getInternalServices: () => InternalStartServices;
  getBaseUrl: () => string;
}

/**
 * Simple Agent Executor that integrates with Kibana's onechat infrastructure
 * Follows the AgentExecutor interface from the A2A SDK
 */
class KibanaAgentExecutor {
  private logger: Logger;
  private getInternalServices: () => InternalStartServices;
  private kibanaRequest: KibanaRequest;

  constructor(
    logger: Logger,
    getInternalServices: () => InternalStartServices,
    kibanaRequest: KibanaRequest
  ) {
    this.logger = logger;
    this.getInternalServices = getInternalServices;
    this.kibanaRequest = kibanaRequest;
  }

  async execute(requestContext: any, eventBus: any): Promise<void> {
    const { taskId, userMessage } = requestContext;

    try {
      this.logger.info(`Kibana A2A: Executing task ${taskId}`);

      // Extract user message text
      const userText = userMessage.parts
        .filter((part: any) => part.kind === 'text')
        .map((part: any) => part.text)
        .join(' ');

      // Get onechat services and execute conversation
      const { agents, chat } = this.getInternalServices();
      const agentClient = await agents.getScopedClient({ request: this.kibanaRequest });
      const agent = await agentClient.get(oneChatDefaultAgentId);

      this.logger.info(`Kibana A2A: Using agent ${agent.name} for message: "${userText}"`);

      // Execute chat
      const chatEvents$ = chat.converse({
        agentId: oneChatDefaultAgentId,
        mode: AgentMode.normal,
        nextInput: { message: userText },
        request: this.kibanaRequest,
      });

      const events = await firstValueFrom(chatEvents$.pipe(toArray()));
      const {
        data: { round },
      } = events.find(isRoundCompleteEvent)!;
      // const {
      //   data: { conversation_id: convId },
      // } = events.find(
      //   (e): e is ConversationUpdatedEvent | ConversationCreatedEvent =>
      //     isConversationUpdatedEvent(e) || isConversationCreatedEvent(e)
      // )!;

      this.logger.info(`Kibana A2A: Conversation ID: ${round.response}`);

      const responseText = round.response.message;

      // Publish response as A2A message
      eventBus.publish({
        kind: 'message',
        role: 'agent',
        messageId: `msg-${Date.now()}`,
        parts: [{ kind: 'text', text: responseText }],
        taskId,
        contextId: requestContext.contextId,
      });

      eventBus.finished();
      this.logger.info(`Kibana A2A: Task ${taskId} completed`);
    } catch (error) {
      this.logger.error(`Kibana A2A: Task ${taskId} failed: ${error}`);

      eventBus.publish({
        kind: 'message',
        role: 'agent',
        messageId: `msg-${Date.now()}`,
        parts: [
          {
            kind: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        taskId,
        contextId: requestContext.contextId,
      });

      eventBus.finished();
    }
  }

  async cancelTask(taskId: string, eventBus: any): Promise<void> {
    this.logger.info(`Kibana A2A: Canceling task ${taskId}`);

    eventBus.publish({
      kind: 'message',
      role: 'agent',
      messageId: `msg-${Date.now()}`,
      parts: [{ kind: 'text', text: 'Task was canceled.' }],
      taskId,
      contextId: taskId,
    });

    eventBus.finished();
  }
}

/**
 * Kibana adapter for the A2A SDK that integrates with Kibana's HTTP abstractions
 * Simplified implementation following the official A2A Express app pattern
 */
export class KibanaA2AAdapter {
  private logger: Logger;
  private getInternalServices: () => InternalStartServices;
  private getBaseUrl: () => string;
  private requestHandler: any = null;
  private jsonRpcHandler: any = null;

  constructor({ logger, getInternalServices, getBaseUrl }: KibanaA2AAdapterParams) {
    this.logger = logger;
    this.getInternalServices = getInternalServices;
    this.getBaseUrl = getBaseUrl;
  }

  /**
   * Initialize the A2A handlers with agent card for a specific request
   */
  private async initializeForRequest(kibanaRequest: KibanaRequest): Promise<void> {
    try {
      // Create agent card using existing utility
      const { agents, tools } = this.getInternalServices();
      const agentClient = await agents.getScopedClient({ request: kibanaRequest });
      const agent = await agentClient.get(oneChatDefaultAgentId);

      const agentCard = await createAgentCard({
        agent,
        baseUrl: this.getBaseUrl(),
        toolsService: tools,
        request: kibanaRequest,
      });

      // Create A2A components following the SDK pattern
      const taskStore = new InMemoryTaskStore();
      const agentExecutor = new KibanaAgentExecutor(
        this.logger,
        this.getInternalServices,
        kibanaRequest
      );

      // Use the SDK's DefaultRequestHandler directly
      this.requestHandler = new DefaultRequestHandler(
        agentCard as AgentCard,
        taskStore,
        agentExecutor
      );
      this.jsonRpcHandler = new JsonRpcTransportHandler(this.requestHandler);

      this.logger.info('Kibana A2A Adapter: Initialized for request');
    } catch (error) {
      this.logger.error(`Kibana A2A Adapter: Failed to initialize: ${error}`);
      throw error;
    }
  }

  /**
   * Handle agent card requests (/.well-known/agent.json)
   */
  async handleAgentCardRequest(
    req: KibanaRequest,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> {
    try {
      await this.initializeForRequest(req);
      const agentCard = await this.requestHandler.getAgentCard();

      return res.ok({
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
        body: agentCard,
      });
    } catch (error) {
      this.logger.error(`Kibana A2A Adapter: Error serving agent card: ${error}`);
      return res.customError({
        statusCode: 500,
        body: { message: `Failed to serve agent card: ${error}` },
      });
    }
  }

  /**
   * Handle A2A JSON-RPC requests
   */
  async handleA2ARequest(req: KibanaRequest, res: KibanaResponseFactory): Promise<IKibanaResponse> {
    try {
      this.logger.info('Kibana A2A Adapter: Processing A2A request');

      // Validate Content-Type
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        return res.badRequest({
          body: { message: 'Content-Type must be application/json' },
        });
      }

      // Initialize handlers for this specific request
      await this.initializeForRequest(req);

      // Use the A2A SDK JSON-RPC handler
      const result = await this.jsonRpcHandler.handle(req.body);

      // Handle streaming vs non-streaming responses
      if (Symbol.asyncIterator in result) {
        // For streaming responses, collect all events (simplified)
        const events = [];
        for await (const event of result as AsyncGenerator<any>) {
          events.push(event);
        }

        return res.ok({
          headers: { 'Content-Type': 'application/json' },
          body: events,
        });
      } else {
        // Single response
        return res.ok({
          headers: { 'Content-Type': 'application/json' },
          body: result,
        });
      }
    } catch (error) {
      this.logger.error(`Kibana A2A Adapter: Error processing request: ${error}`);

      // Handle A2A errors properly
      if (error instanceof A2AError) {
        return res.customError({
          statusCode: 400,
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
    this.logger.warn(`Kibana A2A Adapter: Unsupported method: ${req.route.method}`);
    return res.customError({
      statusCode: 405,
      body: { message: 'Method not allowed' },
    });
  }
}
