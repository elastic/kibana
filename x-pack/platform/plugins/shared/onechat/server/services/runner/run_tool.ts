/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import type { ToolResult, ToolType } from '@kbn/onechat-common';
import { createBadRequestError } from '@kbn/onechat-common';
import { withExecuteToolSpan } from '@kbn/inference-tracing';
import type { RunToolReturn, ToolHandlerContext, ToolHandlerReturn } from '@kbn/onechat-server';
import type {
  ScopedRunnerRunToolsParams,
  ScopedRunnerRunInternalToolParams,
} from '@kbn/onechat-server/runner';
import { createErrorResult } from '@kbn/onechat-server';
import type { InternalToolDefinition } from '@kbn/onechat-server/tools';
import { getToolResultId } from '@kbn/onechat-server/tools';
import { getCurrentSpaceId } from '../../utils/spaces';
import { ToolCallSource } from '../../telemetry';
import { forkContextForToolRun, createToolEventEmitter, createToolProvider } from './utils';
import type { RunnerManager } from './runner';

export const runTool = async <TParams = Record<string, unknown>>({
  toolExecutionParams,
  parentManager,
}: {
  toolExecutionParams: ScopedRunnerRunToolsParams<TParams>;
  parentManager: RunnerManager;
}): Promise<RunToolReturn> => {
  const { trackingService, toolsService, request } = parentManager.deps;
  const { toolId, ...scopedParams } = toolExecutionParams;

  const toolRegistry = await toolsService.getRegistry({ request });
  const tool = (await toolRegistry.get(toolId)) as InternalToolDefinition<
    ToolType,
    any,
    ZodObject<any>
  >;

  if (trackingService) {
    try {
      trackingService.trackToolCall(toolId, ToolCallSource.API);
    } catch (error) {
      /* empty */
    }
  }

  return runInternalTool({ toolExecutionParams: { ...scopedParams, tool }, parentManager });
};

export const runInternalTool = async <TParams = Record<string, unknown>>({
  toolExecutionParams,
  parentManager,
}: {
  toolExecutionParams: ScopedRunnerRunInternalToolParams<TParams>;
  parentManager: RunnerManager;
}): Promise<RunToolReturn> => {
  const { tool, toolParams } = toolExecutionParams;

  const context = forkContextForToolRun({ parentContext: parentManager.context, toolId: tool.id });
  const manager = parentManager.createChild(context);
  const { resultStore } = manager.deps;

  const { results } = await withExecuteToolSpan(
    tool.id,
    { tool: { input: toolParams } },
    async (): Promise<ToolHandlerReturn> => {
      const schema = await tool.getSchema();
      const validation = schema.safeParse(toolParams);
      if (validation.error) {
        throw createBadRequestError(
          `Tool ${tool.id} was called with invalid parameters: ${validation.error.message}`
        );
      }

      const toolHandlerContext = await createToolHandlerContext<TParams>({
        toolExecutionParams: { ...toolExecutionParams, toolId: tool.id },
        manager,
      });

      try {
        const toolHandler = await tool.getHandler();
        return await toolHandler(validation.data as Record<string, any>, toolHandlerContext);
      } catch (err) {
        return {
          results: [createErrorResult(err.message)],
        };
      }
    }
  );

  const resultsWithIds = results.map<ToolResult>(
    (result) =>
      ({
        ...result,
        tool_result_id: result.tool_result_id ?? getToolResultId(),
      } as ToolResult)
  );

  resultsWithIds.forEach((result) => {
    resultStore.add(result);
  });

  return {
    results: resultsWithIds,
  };
};

export const createToolHandlerContext = async <TParams = Record<string, unknown>>({
  manager,
  toolExecutionParams,
}: {
  toolExecutionParams: ScopedRunnerRunToolsParams<TParams>;
  manager: RunnerManager;
}): Promise<ToolHandlerContext> => {
  const { onEvent } = toolExecutionParams;
  const { request, elasticsearch, spaces, modelProvider, toolsService, resultStore, logger } =
    manager.deps;
  const spaceId = getCurrentSpaceId({ request, spaces });
  return {
    request,
    spaceId,
    logger,
    esClient: elasticsearch.client.asScoped(request),
    modelProvider,
    runner: manager.getRunner(),
    toolProvider: createToolProvider({
      registry: await toolsService.getRegistry({ request }),
      runner: manager.getRunner(),
      request,
    }),
    resultStore: resultStore.asReadonly(),
    events: createToolEventEmitter({ eventHandler: onEvent, context: manager.context }),
  };
};
