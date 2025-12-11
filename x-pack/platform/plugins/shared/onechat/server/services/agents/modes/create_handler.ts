/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { AgentHandlerFn, AgentHandlerContext } from '@kbn/onechat-server';
import type { InternalAgentDefinition } from '../agent_registry';
import { runAgent } from './run_agent';

/**
 * Extended agent handler function type that includes savedObjectsClient
 */
export type ExtendedAgentHandlerFn = (
  params: Parameters<AgentHandlerFn>[0],
  context: AgentHandlerContext,
  extra: { savedObjectsClient?: SavedObjectsClientContract }
) => ReturnType<AgentHandlerFn>;

/**
 * Create the handler function for the default onechat agent.
 */
export const createAgentHandler = ({
  agent,
}: {
  agent: InternalAgentDefinition;
}): ExtendedAgentHandlerFn => {
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
      },
      runId,
      abortSignal,
    },
    context,
    { savedObjectsClient }
  ) => {
    const effectiveConfiguration = {
      ...agent.configuration,
      ...(configurationOverrides || {}),
    };

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
        savedObjectsClient,
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
