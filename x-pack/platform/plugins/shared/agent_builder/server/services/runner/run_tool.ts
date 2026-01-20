/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import type { ToolResult, ToolType } from '@kbn/agent-builder-common';
import {
  createBadRequestError,
  isAgentBuilderError,
  createRequestAbortedError,
} from '@kbn/agent-builder-common';
import { withExecuteToolSpan } from '@kbn/inference-tracing';
import type {
  RunToolReturn,
  ToolHandlerContext,
  ToolHandlerReturn,
} from '@kbn/agent-builder-server';
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
import { HookEvent } from '../hooks';

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

  const hookAbortController = new AbortController();
  const effectiveAbortSignal = hookAbortController.signal;

  // allow hooks to mutate tool params or abort the call before validation/handler invocation
  let toolParams = initialToolParams as unknown as Record<string, unknown>;
  const hooks = manager.deps.hooks;
  if (hooks) {
    const hookContext = {
      event: HookEvent.preToolCall as const,
      toolId: tool.id,
      toolCallId,
      toolParams,
      source,
      request: manager.deps.request,
      abortSignal: effectiveAbortSignal,
      abortController: hookAbortController,
    };
    const updated = await hooks.runBlocking(HookEvent.preToolCall, hookContext);
    hooks.runParallel(HookEvent.preToolCall, updated);
    toolParams = updated.toolParams;
  }

  const abortPromise = new Promise<never>((_resolve, reject) => {
    if (effectiveAbortSignal.aborted) {
      reject(
        (effectiveAbortSignal as any).reason ??
          createRequestAbortedError('Tool execution was aborted')
      );
      return;
    }
    effectiveAbortSignal.addEventListener(
      'abort',
      () =>
        reject(
          (effectiveAbortSignal as any).reason ??
            createRequestAbortedError('Tool execution was aborted')
        ),
      { once: true }
    );
  });

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
      if (effectiveAbortSignal.aborted) {
        throw (
          (effectiveAbortSignal as any).reason ??
          createRequestAbortedError('Tool execution was aborted')
        );
      }
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
          toolParams: toolParams as any,
        },
        manager,
      });

      try {
        const toolHandler = await tool.getHandler();
        return await Promise.race([
          Promise.resolve(toolHandler(validation.data as Record<string, any>, toolHandlerContext)),
          abortPromise,
        ]);
      } catch (err) {
        // If cancellation/guardrails triggered, abort the tool call by throwing.
        if (effectiveAbortSignal.aborted) {
          throw (
            (effectiveAbortSignal as any).reason ??
            createRequestAbortedError('Tool execution was aborted')
          );
        }
        if (isAgentBuilderError(err)) {
          throw err;
        }
        return {
          results: [createErrorResult(err.message)],
        };
      }
    }
  );

  // Normalize tool handler return into the public RunToolReturn shape.
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

  // post tool call hook can block or mutate the final tool return
  if (hooks) {
    const postContext = {
      event: HookEvent.postToolCall as const,
      toolId: tool.id,
      toolCallId,
      toolParams,
      source,
      request: manager.deps.request,
      abortSignal: effectiveAbortSignal,
      abortController: hookAbortController,
      toolReturn: runToolReturn,
    };
    const updated = await hooks.runBlocking(HookEvent.postToolCall, postContext);
    hooks.runParallel(HookEvent.postToolCall, updated);
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
