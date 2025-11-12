/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { from, filter, shareReplay, merge, Subject, finalize } from 'rxjs';
import {
  createUserMessage,
  isStreamEvent,
  toolsToLangchain,
} from '@kbn/onechat-genai-utils/langchain';
import type { ChatAgentEvent, RoundInput } from '@kbn/onechat-common';
import type { AgentHandlerContext, AgentEventEmitterFn } from '@kbn/onechat-server';
import { addRoundCompleteEvent, extractRound, prepareConversation, selectProviderTools } from '../utils';
import { resolveCapabilities } from '../utils/capabilities';
import { resolveConfiguration } from '../utils/configuration';
import { createAgentGraph } from './graph';
import { convertGraphEvents } from './convert_graph_events';
import type { RunAgentParams, RunAgentResponse } from '../run_agent';
import { advanceState } from './advance_state';
import { DEFAULT_CYCLE_LIMIT } from './state';

const chatAgentGraphName = 'default-onechat-agent';

export type RunChatAgentParams = Omit<RunAgentParams, 'mode'>;

export type RunChatAgentFn = (
  params: RunChatAgentParams,
  context: AgentHandlerContext
) => Promise<RunAgentResponse>;

/**
 * Create the handler function for the default onechat agent.
 */
export const runDefaultAgentMode: RunChatAgentFn = async (
  {
    nextInput,
    conversation,
    agentConfiguration,
    capabilities,
    runId = uuidv4(),
    agentId,
    abortSignal,
    checkpointerService,
  },
  { logger, request, modelProvider, toolProvider, attachments, events }
) => {
  const model = await modelProvider.getDefaultModel();
  const resolvedCapabilities = resolveCapabilities(capabilities);
  const resolvedConfiguration = resolveConfiguration(agentConfiguration);
  logger.debug(`Running chat agent with connector: ${model.connector.name}, runId: ${runId}`);
  const threadId = conversation?.id ?? uuidv4();

  const selectedTools = await selectProviderTools({
    provider: toolProvider,
    selection: agentConfiguration.tools,
    request,
  });

  const manualEvents$ = new Subject<ChatAgentEvent>();
  const eventEmitter: AgentEventEmitterFn = (event) => {
    manualEvents$.next(event);
  };

  const { tools: langchainTools, idMappings: toolIdMapping } = await toolsToLangchain({
    tools: selectedTools,
    logger,
    request,
    sendEvent: eventEmitter,
  });

  const cycleLimit = DEFAULT_CYCLE_LIMIT;
  // langchain's recursionLimit is basically the number of nodes we can traverse before hitting a recursion limit error
  // we have two steps per cycle (agent node + tool call node), and then a few other steps (prepare + answering), and some extra buffer
  const graphRecursionLimit = cycleLimit * 2 + 8;

  // since the checkpoint is used, we only need to add the new message as initialMessage. The state will already be primed with the chatHistory.
  const initialMessages = [createUserMessage(nextInput.message)];
  const processedConversation = await prepareConversation({
    nextInput,
    previousRounds: conversation?.rounds ?? [],
    attachmentsService: attachments,
  });

  const checkpointer = await checkpointerService.getCheckpointer({ request });

  const agentGraph = createAgentGraph({
    logger,
    events: { emit: eventEmitter },
    chatModel: model.chatModel,
    tools: langchainTools,
    configuration: resolvedConfiguration,
    capabilities: resolvedCapabilities,
    checkpointer,
  });

  const revertToCheckpoint = await advanceState(agentGraph, {
    threadId,
  });

  logger.debug(`Running chat agent with graph: ${chatAgentGraphName}, runId: ${runId}`);

  const eventStream = agentGraph.streamEvents(
    { initialMessages, cycleLimit },
    {
      version: 'v2',
      signal: abortSignal,
      runName: chatAgentGraphName,
      configurable: {
        thread_id: threadId,
      },
      metadata: {
        graphName: chatAgentGraphName,
        agentId,
        runId,
      },
      recursionLimit: graphRecursionLimit,
      callbacks: [],
    }
  );

  const graphEvents$ = from(eventStream).pipe(
    filter(isStreamEvent),
    convertGraphEvents({
      graphName: chatAgentGraphName,
      toolIdMapping,
      logger,
    }),
    finalize(() => manualEvents$.complete())
  );

  const processedInput: RoundInput = {
    message: processedConversation.nextInput.message,
    attachments: processedConversation.nextInput.attachments.map((a) => a.attachment),
  };

  const events$ = merge(graphEvents$, manualEvents$).pipe(
    addRoundCompleteEvent({ userInput: processedInput }),
    shareReplay()
  );

  events$.subscribe({
    next: (event) => events.emit(event),
    complete: async () => {
      await advanceState(agentGraph, {
        threadId,
      });
    },
    error: async () => {
    await revertToCheckpoint() // if there are errors we need to revert to the checkpoint to maintain correct message state
    },
  });

  const round = await extractRound(events$);

  return {
    round,
  };
};
