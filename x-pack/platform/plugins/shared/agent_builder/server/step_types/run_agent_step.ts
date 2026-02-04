/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
  isRoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { firstValueFrom, toArray } from 'rxjs';
import type { ServiceManager } from '../services';
import { runAgentStepCommonDefinition } from '../../common/step_types/run_agent_step';

/**
 * Server step definition for the "ai.agent" step.
 * This step executes an agentBuilder agent using the internal runner service.
 */
export const getRunAgentStepDefinition = (serviceManager: ServiceManager) => {
  return createServerStepDefinition({
    ...runAgentStepCommonDefinition,
    handler: async (context) => {
      try {
        const { schema, message, conversation_id: conversationId } = context.input;

        const {
          'agent-id': agentId,
          'connector-id': connectorId,
          'create-conversation': createConversation,
        } = context.config;

        context.logger.debug('ai.agent step started');
        const request = context.contextManager.getFakeRequest();
        if (!request) {
          throw new Error('No request available in workflow context');
        }

        context.logger.debug('Executing ai.agent step', {
          agentId: agentId || agentBuilderDefaultAgentId,
        });

        const effectiveAgentId = (agentId as string | undefined) || agentBuilderDefaultAgentId;
        const effectiveConnectorId = connectorId as string | undefined;

        const storeConversation = createConversation || Boolean(conversationId);

        const chatService = serviceManager.internalStart?.chat;
        if (!chatService) {
          throw new Error('chat service is not available');
        }

        const chatEvents$ = chatService.converse({
          agentId: effectiveAgentId,
          connectorId: effectiveConnectorId,
          conversationId,
          autoCreateConversationWithId: createConversation,
          storeConversation,
          request,
          abortSignal: context.abortSignal,
          structuredOutput: !!schema,
          outputSchema: schema,
          nextInput: {
            message,
          },
        });

        const events = await firstValueFrom(chatEvents$.pipe(toArray()));
        const roundEvent = events.find(isRoundCompleteEvent);
        if (!roundEvent) {
          throw new Error('No round_complete event received from chat service');
        }

        const round = roundEvent.data.round;
        const outputMessage = schema
          ? JSON.stringify(round.response.structured_output)
          : round.response.message;

        let outputConversationId: string | undefined;
        if (storeConversation) {
          const conversationEvent = events.find(
            (e) => isConversationCreatedEvent(e) || isConversationUpdatedEvent(e)
          );
          if (!conversationEvent) {
            throw new Error('No conversation_created / conversation_updated event received');
          }
          outputConversationId = conversationEvent.data.conversation_id;
        }

        return {
          output: {
            message: outputMessage,
            structured_output: round.response.structured_output,
            ...(outputConversationId && { conversation_id: outputConversationId }),
          },
        };
      } catch (error) {
        context.logger.error(
          'agentBuilder.runAgent step failed',
          error instanceof Error ? error : new Error(String(error))
        );
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  });
};
