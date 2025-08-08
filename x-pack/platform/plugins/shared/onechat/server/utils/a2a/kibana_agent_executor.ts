/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { AgentExecutor, RequestContext, ExecutionEventBus } from '@a2a-js/sdk/server';
import type { Part, TextPart } from '@a2a-js/sdk';
import { AgentMode, isRoundCompleteEvent } from '@kbn/onechat-common';
import { firstValueFrom, toArray } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import type { InternalStartServices } from '../../services';

const generateMessageId = () => `msg-${uuidv4()}`;

/**
 * Agent executor that bridges A2A requests to Kibana's onechat system
 */
export class KibanaAgentExecutor implements AgentExecutor {
  constructor(
    private logger: Logger,
    private getInternalServices: () => InternalStartServices,
    private kibanaRequest: KibanaRequest,
    private agentId: string
  ) {}

  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const { taskId, userMessage } = requestContext;

    try {
      this.logger.debug(`A2A: Starting task ${taskId}`);

      // Extract text from message parts
      const userText = userMessage.parts
        .filter((part: Part): part is TextPart => part.kind === 'text')
        .map((part: TextPart) => part.text)
        .join(' ');

      // Execute chat with onechat service
      const { chat } = this.getInternalServices();

      const chatEvents$ = chat.converse({
        agentId: this.agentId,
        mode: AgentMode.normal,
        nextInput: { message: userText },
        request: this.kibanaRequest,
      });

      // Process chat response
      const events = await firstValueFrom(chatEvents$.pipe(toArray()));
      const roundCompleteEvent = events.find(isRoundCompleteEvent);

      if (!roundCompleteEvent) {
        throw new Error('No complete response received from chat service');
      }

      const responseText = roundCompleteEvent.data.round.response.message;

      // Send response back through A2A
      eventBus.publish({
        kind: 'message',
        role: 'agent',
        messageId: generateMessageId(),
        parts: [{ kind: 'text', text: responseText }],
        taskId,
        contextId: requestContext.contextId,
      });

      eventBus.finished();
      this.logger.debug(`A2A: Task ${taskId} completed`);
    } catch (error) {
      this.logger.error(`A2A: Task ${taskId} failed: ${error}`);
      this.sendErrorResponse(eventBus, taskId, requestContext.contextId, error);
    }
  }

  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    this.logger.debug(`A2A: Canceling task ${taskId}`);

    eventBus.publish({
      kind: 'message',
      role: 'agent',
      messageId: generateMessageId(),
      parts: [{ kind: 'text', text: 'Task was canceled.' }],
      taskId,
      contextId: taskId,
    });

    eventBus.finished();
  }

  private sendErrorResponse(
    eventBus: ExecutionEventBus,
    taskId: string,
    contextId: string,
    error: unknown
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    eventBus.publish({
      kind: 'message',
      role: 'agent',
      messageId: generateMessageId(),
      parts: [{ kind: 'text', text: `Error: ${errorMessage}` }],
      taskId,
      contextId,
    });

    eventBus.finished();
  }
}
