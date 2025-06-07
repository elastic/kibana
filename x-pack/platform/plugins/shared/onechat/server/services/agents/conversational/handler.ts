/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ConversationalAgentHandlerFn } from '@kbn/onechat-server';
import { runChatAgent } from './run_chat_agent';

export interface CreateConversationalAgentHandlerParams {
  logger: Logger;
}

const defaultAgentGraphName = 'default-onechat-agent';

/**
 * Create the handler function for the default onechat agent.
 */
export const createHandler = ({
  logger,
}: CreateConversationalAgentHandlerParams): ConversationalAgentHandlerFn => {
  return async (
    { agentParams: { nextInput, conversation = [] }, runId },
    { request, modelProvider, toolProvider, events, runner }
  ) => {
    const completedRound = await runChatAgent(
      {
        nextInput,
        conversation,
        agentGraphName: defaultAgentGraphName,
        runId,
        onEvent: (event) => {
          events.emit(event);
        },
        tools: toolProvider,
      },
      {
        logger,
        runner,
        request,
        modelProvider,
      }
    );

    return {
      result: {
        round: completedRound,
      },
    };
  };
};
