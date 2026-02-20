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
  ExperimentalFeatures,
} from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { getCurrentSpaceId } from '../../utils/spaces';
import { withAgentSpan } from '../../tracing';
import { createAgentHandler } from '../agents/modes/create_handler';
import {
  createAgentEventEmitter,
  forkContextForAgentRun,
  createAttachmentsService,
  createToolProvider,
  createSkillsService,
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
    savedObjects,
    uiSettings,
    modelProvider,
    toolsService,
    attachmentsService,
    resultStore,
    attachmentStateManager,
    logger,
    promptManager,
    stateManager,
    filestore,
    skillServiceStart,
    toolManager,
  } = manager.deps;

  const spaceId = getCurrentSpaceId({ request, spaces });
  const toolRegistry = await toolsService.getRegistry({ request });

  // fetch experimental features setting to build experimental feature list
  const soClient = savedObjects.getScopedClient(request);
  const uiSettingsClient = uiSettings.asScopedToClient(soClient);
  const experimentalFeaturesEnabled = await uiSettingsClient.get<boolean>(
    AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID
  );
  const experimentalFeatures: ExperimentalFeatures = {
    filestore: experimentalFeaturesEnabled,
    skills: experimentalFeaturesEnabled,
  };

  return {
    request,
    spaceId,
    logger,
    modelProvider,
    esClient: elasticsearch.client.asScoped(request),
    savedObjectsClient: savedObjects.getScopedClient(request),
    runner: manager.getRunner(),
    toolRegistry,
    toolProvider: createToolProvider({
      registry: toolRegistry,
      runner: manager.getRunner(),
      request,
    }),
    resultStore,
    attachmentStateManager,
    filestore,
    stateManager,
    promptManager,
    attachments: createAttachmentsService({
      attachmentsStart: attachmentsService,
      toolsStart: toolsService,
      request,
      spaceId,
      runner: manager.getRunner(),
    }),
    skills: createSkillsService({
      skillServiceStart,
      toolsServiceStart: toolsService,
      request,
      spaceId,
      runner: manager.getRunner(),
    }),
    toolManager,
    events: createAgentEventEmitter({ eventHandler: onEvent, context: manager.context }),
    hooks: manager.deps.hooks,
    experimentalFeatures,
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

  const forkedContext = forkContextForAgentRun({ parentContext: parentManager.context, agentId });
  const manager = parentManager.createChild(forkedContext);

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
        abortSignal: manager.deps.abortSignal,
      },
      agentHandlerContext
    );
  });

  return {
    result: agentResult.result,
  };
};
