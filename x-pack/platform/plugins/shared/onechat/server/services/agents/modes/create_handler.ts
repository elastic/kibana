/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentHandlerFn } from '@kbn/onechat-server';
import type { InternalAgentDefinition } from '../agent_registry';
import { runAgent } from './run_agent';

/**
 * Create the handler function for the default onechat agent.
 */
export const createAgentHandler = ({
  agent,
}: {
  agent: InternalAgentDefinition;
}): AgentHandlerFn => {
  return async (
    { agentParams: { nextInput, conversation = [], capabilities }, runId, abortSignal },
    context
  ) => {
    const { round } = await runAgent(
      {
        nextInput,
        conversation,
        capabilities,
        runId,
        abortSignal,
        agentId: agent.id,
        toolSelection: agent.configuration.tools,
        customInstructions: agent.configuration.instructions,
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
