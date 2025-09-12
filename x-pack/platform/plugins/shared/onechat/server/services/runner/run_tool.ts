/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import type { ToolResult } from '@kbn/onechat-common';
import { createBadRequestError, ToolResultType } from '@kbn/onechat-common';
import { withExecuteToolSpan } from '@kbn/inference-tracing';
import type {
  ToolHandlerContext,
  ScopedRunnerRunToolsParams,
  RunToolReturn,
} from '@kbn/onechat-server';
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
  const { toolsService, request } = manager.deps;

  const toolRegistry = await toolsService.getRegistry({ request });
  const tool = (await toolRegistry.get(toolId)) as InternalToolDefinition<any, ZodObject<any>>;

  const toolReturn = await withExecuteToolSpan(
    tool.id,
    { tool: { input: toolParams } },
    async () => {
      const validation = tool.schema.safeParse(toolParams);
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
        return await tool.handler(validation.data as Record<string, any>, toolHandlerContext);
      } catch (err) {
        return {
          results: [{ type: ToolResultType.error, data: { message: err.message } }] as ToolResult[],
        };
      }
    }
  );

  return {
    ...toolReturn,
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
  const {
    request,
    defaultConnectorId,
    elasticsearch,
    modelProviderFactory,
    toolsService,
    logger,
    contentReferencesStore,
  } = manager.deps;

  return {
    request,
    logger,
    esClient: elasticsearch.client.asScoped(request),
    modelProvider: modelProviderFactory({ request, defaultConnectorId }),
    runner: manager.getRunner(),
    toolProvider: registryToProvider({
      registry: await toolsService.getRegistry({ request }),
      getRunner: manager.getRunner,
      request,
    }),
    events: createToolEventEmitter({ eventHandler: onEvent, context: manager.context }),
    contentReferencesStore,
  };
};
