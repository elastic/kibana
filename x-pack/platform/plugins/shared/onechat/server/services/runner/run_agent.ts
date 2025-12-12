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
    logger,
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

  const agentResult = await withAgentSpan({ agent }, async () => {
    const agentHandler = createAgentHandler({ agent });
    const agentHandlerContext = await createAgentHandlerContext({ agentExecutionParams, manager });
    return await agentHandler(
      {
        runId: manager.context.runId,
        agentParams,
        abortSignal,
      },
      agentHandlerContext
    );
  });

  return {
    result: agentResult.result,
  };
};
