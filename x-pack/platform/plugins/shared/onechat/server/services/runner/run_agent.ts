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
import { internalProviderToPublic } from '../tools/utils';
import { createAgentHandler } from '../agents/modes/create_handler';
import { createAgentEventEmitter, forkContextForAgentRun } from './utils';
import type { RunnerManager } from './runner';

export const createAgentHandlerContext = <TParams = Record<string, unknown>>({
  agentExecutionParams,
  manager,
}: {
  agentExecutionParams: ScopedRunnerRunAgentParams;
  manager: RunnerManager;
}): AgentHandlerContext => {
  const { onEvent } = agentExecutionParams;
  const { request, defaultConnectorId, elasticsearch, modelProviderFactory, toolsService, logger } =
    manager.deps;
  return {
    request,
    logger,
    esClient: elasticsearch.client.asScoped(request),
    modelProvider: modelProviderFactory({ request, defaultConnectorId }),
    runner: manager.getRunner(),
    toolProvider: internalProviderToPublic({
      provider: toolsService.registry,
      getRunner: manager.getRunner,
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
  const { agentId, agentParams } = agentExecutionParams;

  const context = forkContextForAgentRun({ parentContext: parentManager.context, agentId });
  const manager = parentManager.createChild(context);

  const { agentsService, request } = manager.deps;
  const agentClient = await agentsService.getScopedClient({ request });
  const agent = await agentClient.get(agentId);
  const agentHandler = createAgentHandler({ agent });

  const agentHandlerContext = createAgentHandlerContext({ agentExecutionParams, manager });
  const agentResult = await agentHandler(
    {
      runId: manager.context.runId,
      agentParams,
    },
    agentHandlerContext
  );

  return {
    runId: manager.context.runId,
    result: agentResult.result,
  };
};
