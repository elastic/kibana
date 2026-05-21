/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentConfiguration } from '@kbn/agent-builder-common';
import type { AgentHandlerFn } from '@kbn/agent-builder-server';
import type { InternalAgentDefinition } from '../../agents/agent_registry';
import { runAgent } from './run_agent';

/**
 * Create the handler function for the default agentBuilder agent.
 */
export const createAgentHandler = ({
  agent,
  effectiveConfiguration,
}: {
  agent: InternalAgentDefinition;
  effectiveConfiguration: AgentConfiguration;
}): AgentHandlerFn => {
  return async (
    {
      agentParams: {
        nextInput,
        conversation,
        capabilities,
        browserApiTools,
        structuredOutput,
        outputSchema,
        configurationOverrides,
        action,
        executionId,
      },
      runId,
      abortSignal,
    },
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
        agentConfiguration: effectiveConfiguration,
        browserApiTools,
        structuredOutput,
        outputSchema,
        configurationOverrides,
        action,
        executionId,
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
