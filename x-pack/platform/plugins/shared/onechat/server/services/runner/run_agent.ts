/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentHandlerContext,
  ScopedRunnerRunAgentParams,
  RunAgentReturn,
} from '@kbn/onechat-server';
// remove
import { createAgentEventEmitter, forkContextForAgentRun } from './utils';
import { createToolHandlerContext, RunnerManager } from './runner';

export const createAgentHandlerContext = <TParams = Record<string, unknown>>({
  manager,
  toolExecutionParams,
}: {
  toolExecutionParams: ScopedRunnerRunAgentParams<TParams>;
  manager: RunnerManager;
}): AgentHandlerContext => {
  const { onEvent } = toolExecutionParams;
  const { request, defaultConnectorId, elasticsearch, modelProviderFactory, toolsService } =
    manager.deps;
  return {
    request,
    esClient: elasticsearch.client.asScoped(request),
    modelProvider: modelProviderFactory({ request, defaultConnectorId }),
    runner: manager.getRunner(),
    toolProvider: toolsService.registry.asPublicRegistry(),
    events: createAgentEventEmitter({ eventHandler: onEvent, context: manager.context }),
  };
};

//

export const runAgent = async <TParams = Record<string, unknown>, TResult = unknown>({
  toolExecutionParams,
  parentManager,
}: {
  toolExecutionParams: ScopedRunnerRunAgentParams<TParams>;
  parentManager: RunnerManager;
}): Promise<RunAgentReturn<TResult>> => {
  const { agentId, agentParams } = toolExecutionParams;

  const context = forkContextForAgentRun({ parentContext: parentManager.context, agentId });
  const manager = parentManager.createChild(context);

  // / TODO: adapt to use agent service
  const { toolsService, request } = manager.deps;
  const tool = await toolsService.registry.get({ toolId, request });
  const toolHandlerContext = createToolHandlerContext<TParams>({ toolExecutionParams, manager });
  const toolResult = await tool.handler(toolParams as Record<string, any>, toolHandlerContext);
  // / END TODO

  return {
    result: toolResult as TResult,
  };
};
