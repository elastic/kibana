/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { getAgentFromRunContext } from '@kbn/agent-builder-server';
import type {
  ServerHandlerStepDefinition,
  StepHandlerContext,
} from '@kbn/workflows-extensions/server';
import { ActionSourceTypes, toActionSource } from '../../../common/types/domain';
import { ACTION_SOURCE_STEP_CONFIG_KEY } from '../../common/constants';

/**
 * Invokes a Cases workflow step handler from an agent builder tool context.
 *
 * Builds a minimal StepHandlerContext stub and stamps `actionSource` from the agent run.
 */
export async function invokeStepHandler(
  stepDef: ServerHandlerStepDefinition,
  input: Record<string, unknown>,
  toolContext: ToolHandlerContext,
  extraConfig: Record<string, unknown> = {}
) {
  const fakeContextManager = {
    getFakeRequest: () => toolContext.request,
    getContext: () => {
      throw new Error('getContext is not available in the agent builder execution context');
    },
    getScopedEsClient: () => {
      throw new Error('getScopedEsClient is not available in the agent builder execution context');
    },
    renderInputTemplate: <T>(v: T) => v,
    callKibanaApi: () => {
      throw new Error('callKibanaApi is not available in the agent builder execution context');
    },
  };

  const agentEntry =
    toolContext.runContext != null ? getAgentFromRunContext(toolContext.runContext) : undefined;
  const actionSource =
    agentEntry != null
      ? toActionSource({
          type: ActionSourceTypes.agent,
          id: agentEntry.agentId,
          name: agentEntry.agentName,
          runId: agentEntry.conversationId,
        })
      : undefined;

  const fakeStepCtx = {
    input,
    config: {
      'push-case': false,
      ...extraConfig,
      ...(actionSource != null ? { [ACTION_SOURCE_STEP_CONFIG_KEY]: actionSource } : {}),
    },
    rawInput: input,
    contextManager: fakeContextManager,
    logger: toolContext.logger,
    // ToolHandlerContext does not expose an AbortSignal, so step handlers
    // cannot be cancelled when the HTTP request is aborted. Using a fresh
    // (never-aborted) signal satisfies the StepHandlerContext type contract.
    abortSignal: new AbortController().signal,
    stepId: stepDef.id,
    stepType: stepDef.id,
  } as StepHandlerContext;

  const result = await stepDef.handler(fakeStepCtx);

  if (result.error) {
    throw result.error;
  }

  return { results: [{ type: 'other' as const, data: result.output ?? {} }] };
}
