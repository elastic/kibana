/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentMode, AgentDefinition } from '@kbn/onechat-common';
import type { AgentHandlerFn } from '@kbn/onechat-server';
import { runAgent } from './run_agent';

/**
 * Create the handler function for the default onechat agent.
 */
export const createAgentHandler = ({ agent }: { agent: AgentDefinition }): AgentHandlerFn => {
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
