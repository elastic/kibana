/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { getAgentFromRunContext } from '@kbn/agent-builder-server';
import type { ActionSource } from '../../../common/types/domain';
import { ActionSourceTypes, toActionSource } from '../../../common/types/domain';
import type { CasesClient } from '../../client';

export type GetCasesClientWithOptionsFn = (
  request: KibanaRequest,
  options?: { actionSource?: ActionSource }
) => Promise<CasesClient>;

/** The agent running the tool, as the actor Activity shows. Same stamp as `invokeStepHandler`. */
export const getAgentActionSource = (toolContext: ToolHandlerContext): ActionSource | undefined => {
  const agent =
    toolContext.runContext != null ? getAgentFromRunContext(toolContext.runContext) : undefined;
  return agent != null
    ? toActionSource({
        type: ActionSourceTypes.agent,
        id: agent.agentId,
        name: agent.agentName,
        runId: agent.conversationId,
      })
    : undefined;
};

/**
 * A Cases client for a tool call: the user's permissions (the request), the agent as the actor.
 */
export const getAgentCasesClient = (
  getCasesClient: GetCasesClientWithOptionsFn,
  toolContext: ToolHandlerContext
) => {
  const actionSource = getAgentActionSource(toolContext);
  return getCasesClient(toolContext.request, actionSource ? { actionSource } : undefined);
};

export const toolResult = (data: Record<string, unknown>) => ({
  results: [{ type: 'other' as const, data }],
});
