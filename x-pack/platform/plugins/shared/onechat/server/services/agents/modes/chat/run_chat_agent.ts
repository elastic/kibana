/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { from, filter, shareReplay } from 'rxjs';
import { isStreamEvent, toolsToLangchain } from '@kbn/onechat-genai-utils/langchain';
import { allToolsSelection } from '@kbn/onechat-common';
import type { AgentHandlerContext } from '@kbn/onechat-server';
import {
  addRoundCompleteEvent,
  extractRound,
  selectProviderTools,
  conversationToLangchainMessages,
} from '../utils';
import { createAgentGraph } from './graph';
import { convertGraphEvents } from './convert_graph_events';
import type { RunAgentParams, RunAgentResponse } from '../run_agent';

const chatAgentGraphName = 'default-onechat-agent';

export type RunChatAgentParams = Omit<RunAgentParams, 'mode'>;

export type RunChatAgentFn = (
  params: RunChatAgentParams,
  context: AgentHandlerContext
) => Promise<RunAgentResponse>;

/**
 * Create the handler function for the default onechat agent.
 */
export const runChatAgent: RunChatAgentFn = async (
  {
    nextInput,
    conversation = [],
    toolSelection = allToolsSelection,
    customInstructions,
    runId = uuidv4(),
    agentId,
    abortSignal,
  },
  { logger, request, modelProvider, toolProvider, events }
) => {
  const model = await modelProvider.getDefaultModel();
  logger.debug(`Running chat agent with connector: ${model.connector.name}, runId: ${runId}`);

  const selectedTools = await selectProviderTools({
    provider: toolProvider,
    selection: toolSelection,
    request,
  });

  const { tools: langchainTools, idMappings: toolIdMapping } = await toolsToLangchain({
    tools: selectedTools,
    logger,
    request,
  });

  const initialMessages = conversationToLangchainMessages({
    nextInput,
    previousRounds: conversation,
  });

  // keep recursionLimit in a single variable to pass to both graph (as toolCallLimit) and engine
  const recursionLimit = 25;

  const agentGraph = createAgentGraph({
    logger,
    chatModel: model.chatModel,
    tools: langchainTools,
    customInstructions,
    // pass recursionLimit as toolCallLimit for prompting and state context
    toolCallLimit: recursionLimit,
  });

  logger.debug(`Running chat agent with graph: ${chatAgentGraphName}, runId: ${runId}`);

  const eventStream = agentGraph.streamEvents(
    { initialMessages },
    {
      version: 'v2',
      signal: abortSignal,
      runName: chatAgentGraphName,
      metadata: {
        graphName: chatAgentGraphName,
        agentId,
        runId,
      },
      recursionLimit,
      callbacks: [],
    }
  );

  const events$ = from(eventStream).pipe(
    filter(isStreamEvent),
    convertGraphEvents({
      graphName: chatAgentGraphName,
      toolIdMapping,
      logger,
    }),
    addRoundCompleteEvent({ userInput: nextInput }),
    shareReplay()
  );

  events$.subscribe({
    next: (event) => events.emit(event),
    error: () => {
      // error will be handled by function return, we just need to trap here
    },
  });

  const round = await extractRound(events$);

  return {
    round,
  };
};
