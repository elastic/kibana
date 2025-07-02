/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentMode, ToolSelection } from '@kbn/onechat-common';
import type { ConversationalAgentHandlerFn } from '@kbn/onechat-server';
import { runAgent } from '../modes';

export interface CreateConversationalAgentHandlerParams {
  agentId: string;
  toolSelection: ToolSelection[];
  customInstructions?: string;
}

/**
 * Create the handler function for the default onechat agent.
 */
export const createHandler = ({
  agentId,
  toolSelection,
  customInstructions,
}: CreateConversationalAgentHandlerParams): ConversationalAgentHandlerFn => {
  return async (
    { agentParams: { nextInput, conversation = [], agentMode = AgentMode.normal }, runId },
    context
  ) => {
    const { round } = await runAgent(
      {
        mode: agentMode,
        nextInput,
        conversation,
        runId,
        agentId,
        toolSelection,
        customInstructions,
      },
      context
    );

    return {
      result: {
        round,
      },
    };
  };
};
