/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { from, filter, shareReplay } from 'rxjs';
import { isStreamEvent, toolsToLangchain } from '@kbn/onechat-genai-utils/langchain';
import { AgentHandlerContext } from '@kbn/onechat-server';
import { addRoundCompleteEvent, extractRound } from '../utils';
import {
  providerToLangchainTools,
  toLangchainTool,
  conversationToLangchainMessages,
} from './utils';
import { createAgentGraph } from './graph';
import { convertGraphEvents } from './convert_graph_events';
import { RunAgentParams, RunAgentResponse } from '../run_agent';

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
  { nextInput, conversation = [], tools = [], runId = uuidv4(), systemPrompt },
  { logger, request, modelProvider, events }
) => {
  const model = await modelProvider.getDefaultModel();

  const { tools: langchainTools, idMappings: toolIdMapping } = await toolsToLangchain({
    tools,
    logger,
    request,
  });

  const initialMessages = conversationToLangchainMessages({
    nextInput,
    previousRounds: conversation,
  });
  const agentGraph = await createAgentGraph({
    logger,
    chatModel: model.chatModel,
    tools: langchainTools,
    systemPrompt,
  });

  const eventStream = agentGraph.streamEvents(
    { initialMessages },
    {
      version: 'v2',
      runName: chatAgentGraphName,
      metadata: {
        graphName: chatAgentGraphName,
        runId,
      },
      recursionLimit: 10,
      callbacks: [],
    }
  );

  const events$ = from(eventStream).pipe(
    filter(isStreamEvent),
    convertGraphEvents({
      graphName: chatAgentGraphName,
      runName: chatAgentGraphName,
      toolIdMapping,
    }),
    addRoundCompleteEvent({ userInput: nextInput }),
    shareReplay()
  );

  events$.subscribe((event) => {
    events.emit(event);
  });

  const round = await extractRound(events$);

  return {
    round,
  };
};
