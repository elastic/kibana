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
import type {
  RunToolReturn,
  ScopedRunnerRunToolsParams,
  ToolHandlerContext,
  ToolHandlerReturn,
} from '@kbn/onechat-server';
import { createErrorResult } from '@kbn/onechat-server';
import { getToolResultId } from '@kbn/onechat-server/tools';
import { ToolCallSource } from '../../telemetry';
import { registryToProvider } from '../tools/utils';
import { forkContextForToolRun } from './utils/run_context';
import { createToolEventEmitter } from './utils/events';
import type { RunnerManager } from './runner';
import type { InternalToolDefinition } from '../tools/tool_provider';

export const runTool = async <TParams = Record<string, unknown>>({
  toolExecutionParams,
  parentManager,
}: {
  toolExecutionParams: ScopedRunnerRunToolsParams<TParams>;
  parentManager: RunnerManager;
}): Promise<RunToolReturn> => {
  const { toolId, toolParams } = toolExecutionParams;

  const context = forkContextForToolRun({ parentContext: parentManager.context, toolId });
  const manager = parentManager.createChild(context);
  const { toolsService, request, resultStore, trackingService } = manager.deps;

  if (trackingService) {
    try {
      trackingService.trackToolCall(toolId, ToolCallSource.API);
    } catch (error) {
      /* empty */
    }
  }

  const toolRegistry = await toolsService.getRegistry({ request });
  const tool = (await toolRegistry.get(toolId)) as InternalToolDefinition<
    ToolType,
    any,
    ZodObject<any>
  >;

  const { results } = await withExecuteToolSpan(
    tool.id,
    { tool: { input: toolParams } },
    async (): Promise<ToolHandlerReturn> => {
      const schema = await tool.getSchema();
      const validation = schema.safeParse(toolParams);
      if (validation.error) {
        throw createBadRequestError(
          `Tool ${toolId} was called with invalid parameters: ${validation.error.message}`
        );
      }

      const toolHandlerContext = await createToolHandlerContext<TParams>({
        toolExecutionParams,
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
  const { request, elasticsearch, modelProvider, toolsService, resultStore, logger } = manager.deps;
  return {
    request,
    logger,
    esClient: elasticsearch.client.asScoped(request),
    modelProvider,
    runner: manager.getRunner(),
    toolProvider: registryToProvider({
      registry: await toolsService.getRegistry({ request }),
      getRunner: manager.getRunner,
      request,
    }),
    resultStore: resultStore.asReadonly(),
    events: createToolEventEmitter({ eventHandler: onEvent, context: manager.context }),
  };
};
