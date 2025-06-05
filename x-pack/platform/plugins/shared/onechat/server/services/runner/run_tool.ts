/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ToolHandlerContext,
  ScopedRunnerRunToolsParams,
  RunToolReturn,
} from '@kbn/onechat-server';
import { forkContextForToolRun } from './utils/run_context';
import { createToolEventEmitter } from './utils/events';
import type { RunnerManager } from './runner';

export const runTool = async <TParams = Record<string, unknown>, TResult = unknown>({
  toolExecutionParams,
  parentManager,
}: {
  toolExecutionParams: ScopedRunnerRunToolsParams<TParams>;
  parentManager: RunnerManager;
}): Promise<RunToolReturn<TResult>> => {
  const { toolId, toolParams } = toolExecutionParams;

  const context = forkContextForToolRun({ parentContext: parentManager.context, toolId });
  const manager = parentManager.createChild(context);

  const { toolsService, request } = manager.deps;

  const tool = await toolsService.registry.get({ toolId, request });
  const toolHandlerContext = createToolHandlerContext<TParams>({ toolExecutionParams, manager });
  const toolResult = await tool.handler(toolParams as Record<string, any>, toolHandlerContext);

  return {
    runId: manager.context.runId,
    result: toolResult as TResult,
  };
};

export const createToolHandlerContext = <TParams = Record<string, unknown>>({
  manager,
  toolExecutionParams,
}: {
  toolExecutionParams: ScopedRunnerRunToolsParams<TParams>;
  manager: RunnerManager;
}): ToolHandlerContext => {
  const { onEvent } = toolExecutionParams;
  const { request, defaultConnectorId, elasticsearch, modelProviderFactory } = manager.deps;
  return {
    request,
    esClient: elasticsearch.client.asScoped(request),
    modelProvider: modelProviderFactory({ request, defaultConnectorId }),
    runner: manager.getRunner(),
    events: createToolEventEmitter({ eventHandler: onEvent, context: manager.context }),
  };
};
