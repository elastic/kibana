/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import type { ToolResult, ToolType } from '@kbn/agent-builder-common';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { withExecuteToolSpan } from '@kbn/inference-tracing';
import type {
  RunContext,
  RunToolReturn,
  ToolHandlerContext,
  ToolHandlerReturn,
} from '@kbn/agent-builder-server';
import { context as otelContext } from '@opentelemetry/api';
import type {
  ScopedRunnerRunToolsParams,
  ScopedRunnerRunInternalToolParams,
} from '@kbn/agent-builder-server/runner';
import { generateFakeToolCallId } from '@kbn/agent-builder-genai-utils/langchain';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { InternalToolDefinition } from '@kbn/agent-builder-server/tools';
import { isToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents';
import { getCurrentSpaceId } from '../../utils/spaces';
import { ToolCallSource } from '../../telemetry';
import { forkContextForToolRun, createToolEventEmitter, createToolProvider } from './utils';
import { toolConfirmationId, createToolConfirmationPrompt } from './utils/prompts';
import type { RunnerManager } from './runner';
import { HookLifecycle } from '../hooks';

function getAgentIdFromRunContext(context: RunContext): string | undefined {
  const agentEntry = [...context.stack].reverse().find((e) => e.type === 'agent');
  return agentEntry?.type === 'agent' ? agentEntry.agentId : undefined;
}

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
  const {
    tool,
    toolParams: initialToolParams,
    toolCallId = generateFakeToolCallId(),
    source = 'unknown',
  } = toolExecutionParams;

  const context = forkContextForToolRun({ parentContext: parentManager.context, toolId: tool.id });
  const manager = parentManager.createChild(context);
  const { resultStore, promptManager } = manager.deps;

  const hookTracingContext = otelContext.active();

  let toolParams = initialToolParams as unknown as Record<string, unknown>;
  const hooks = manager.deps.hooks;
  if (hooks) {
    const hookContext = {
      agentId: getAgentIdFromRunContext(parentManager.context),
      conversationId: manager.context.conversationId,
      toolId: tool.id,
      toolCallId,
      toolParams,
      source,
      request: manager.deps.request,
      tracingContext: hookTracingContext,
    };
    const updated = await hooks.run(HookLifecycle.beforeToolCall, hookContext);
    toolParams = updated.toolParams;
  }

  // only perform pre-call confirmation prompt when the agent is calling the tool
  if (tool.confirmation && source === 'agent') {
    if (tool.confirmation.askUser === 'once' || tool.confirmation.askUser === 'always') {
      const confirmationId = toolConfirmationId({
        toolId: tool.id,
        toolCallId,
        policyMode: tool.confirmation.askUser,
      });
      const { status: confirmStatus } = promptManager.getConfirmationStatus(confirmationId);

      if (confirmStatus === ConfirmationStatus.rejected) {
        return {
          results: [createErrorResult('User denied access to this tool.')],
        };
      }

      if (confirmStatus === ConfirmationStatus.unprompted) {
        return {
          prompt: createToolConfirmationPrompt({ confirmationId, tool }),
        };
      }
    }
  }

  const toolReturn = await withExecuteToolSpan(
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
        toolExecutionParams: {
          ...toolExecutionParams,
          toolId: tool.id,
          toolParams: toolParams as TParams,
        },
        manager,
      });

      try {
        const toolHandler = await tool.getHandler();
        return await toolHandler(validation.data as Record<string, unknown>, toolHandlerContext);
      } catch (err) {
        return {
          results: [createErrorResult(err.message)],
        };
      }
    }
  );

  let runToolReturn: RunToolReturn;
  if (isToolHandlerStandardReturn(toolReturn)) {
    const resultsWithIds = toolReturn.results.map<ToolResult>(
      (result) =>
        ({
          ...result,
          tool_result_id: result.tool_result_id ?? getToolResultId(),
        } as ToolResult)
    );
    runToolReturn = { results: resultsWithIds };
  } else {
    runToolReturn = { prompt: toolReturn.prompt };
  }

  if (hooks) {
    const postContext = {
      agentId: getAgentIdFromRunContext(parentManager.context) ?? '',
      conversationId: manager.context.conversationId,
      toolId: tool.id,
      toolCallId,
      toolParams,
      source,
      request: manager.deps.request,
      toolReturn: runToolReturn,
      tracingContext: hookTracingContext,
    };
    const updated = await hooks.run(HookLifecycle.afterToolCall, postContext);
    runToolReturn = updated.toolReturn;
  }

  if (runToolReturn.results) {
    runToolReturn.results.forEach((result) => {
      resultStore.add(result);
    });
  }

  return runToolReturn;
};

export const createToolHandlerContext = async <TParams = Record<string, unknown>>({
  manager,
  toolExecutionParams,
}: {
  toolExecutionParams: ScopedRunnerRunToolsParams<TParams>;
  manager: RunnerManager;
}): Promise<ToolHandlerContext> => {
  const { onEvent, toolId, toolCallId, toolParams } = toolExecutionParams;
  const {
    request,
    elasticsearch,
    spaces,
    modelProvider,
    toolsService,
    resultStore,
    logger,
    promptManager,
    stateManager,
  } = manager.deps;
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
    stateManager: stateManager.getToolStateManager({ toolId, toolCallId }),
    prompts: promptManager.forTool({
      toolId,
      toolCallId,
      toolParams: toolParams as Record<string, unknown>,
    }),
    resultStore: resultStore.asReadonly(),
    events: createToolEventEmitter({ eventHandler: onEvent, context: manager.context }),
  };
};
