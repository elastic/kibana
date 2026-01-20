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
} from '@kbn/agent-builder-server';
import { getCurrentSpaceId } from '../../utils/spaces';
import { withAgentSpan } from '../../tracing';
import { createAgentHandler } from '../agents/modes/create_handler';
import {
  createAgentEventEmitter,
  forkContextForAgentRun,
  createAttachmentsService,
  createToolProvider,
} from './utils';
import type { RunnerManager } from './runner';
import { HookEvent } from '../hooks';

export const createAgentHandlerContext = async <TParams = Record<string, unknown>>({
  agentExecutionParams,
  manager,
}: {
  agentExecutionParams: ScopedRunnerRunAgentParams;
  manager: RunnerManager;
}): Promise<AgentHandlerContext> => {
  const { onEvent } = agentExecutionParams;
  const {
    request,
    spaces,
    elasticsearch,
    modelProvider,
    toolsService,
    attachmentsService,
    resultStore,
    attachmentStateManager,
    logger,
    promptManager,
    stateManager,
  } = manager.deps;

  const spaceId = getCurrentSpaceId({ request, spaces });

  return {
    request,
    spaceId,
    logger,
    modelProvider,
    esClient: elasticsearch.client.asScoped(request),
    runner: manager.getRunner(),
    toolProvider: createToolProvider({
      registry: await toolsService.getRegistry({ request }),
      runner: manager.getRunner(),
      request,
    }),
    resultStore,
    attachmentStateManager,
    stateManager,
    promptManager,
    attachments: createAttachmentsService({
      attachmentsStart: attachmentsService,
      toolsStart: toolsService,
      request,
      spaceId,
      runner: manager.getRunner(),
    }),
    events: createAgentEventEmitter({ eventHandler: onEvent, context: manager.context }),
  };
};

export const runAgent = async ({
  agentExecutionParams,
  parentManager,
}: {
  agentExecutionParams: ScopedRunnerRunAgentParams;
  parentManager: RunnerManager;
}): Promise<RunAgentReturn> => {
  const { agentId, agentParams, abortSignal } = agentExecutionParams;

  const context = forkContextForAgentRun({ parentContext: parentManager.context, agentId });
  const manager = parentManager.createChild(context);

  const { agentsService, request } = manager.deps;
  const agentRegistry = await agentsService.getRegistry({ request });
  const agent = await agentRegistry.get(agentId);

  const hookAbortController = new AbortController();
  const combinedAbortController = new AbortController();
  const abortWith = (reason?: unknown) => {
    if (!combinedAbortController.signal.aborted) {
      combinedAbortController.abort(reason);
    }
  };
  if (abortSignal) {
    if (abortSignal.aborted) {
      abortWith((abortSignal as any).reason);
    } else {
      abortSignal.addEventListener('abort', () => abortWith((abortSignal as any).reason), {
        once: true,
      });
    }
  }
  hookAbortController.signal.addEventListener(
    'abort',
    () => abortWith((hookAbortController.signal as any).reason),
    { once: true }
  );
  const effectiveAbortSignal = combinedAbortController.signal;

  const hooks = manager.deps.hooks;
  if (hooks) {
    const startContext = {
      event: HookEvent.onAgentRunStart as const,
      agentId,
      request,
      abortSignal: effectiveAbortSignal,
      abortController: hookAbortController,
      runId: manager.context.runId,
      agentParams,
    };
    const updated = await hooks.runBlocking(HookEvent.onAgentRunStart, startContext);
    hooks.runParallel(HookEvent.onAgentRunStart, updated);
  }

  const agentResult = await withAgentSpan({ agent }, async () => {
    const agentHandler = createAgentHandler({ agent });
    const agentHandlerContext = await createAgentHandlerContext({ agentExecutionParams, manager });
    return await agentHandler(
      {
        runId: manager.context.runId,
        agentParams,
        abortSignal: effectiveAbortSignal,
      },
      agentHandlerContext
    );
  });

  if (hooks) {
    const endContext = {
      event: HookEvent.onAgentRunEnd as const,
      agentId,
      request,
      abortSignal: effectiveAbortSignal,
      abortController: hookAbortController,
      runId: manager.context.runId,
      agentParams,
      result: agentResult.result,
    };
    const updated = await hooks.runBlocking(HookEvent.onAgentRunEnd, endContext);
    hooks.runParallel(HookEvent.onAgentRunEnd, updated);
  }

  return {
    result: agentResult.result,
  };
};
