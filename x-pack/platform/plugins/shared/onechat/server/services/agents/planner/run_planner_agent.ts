/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, filter, shareReplay } from 'rxjs';
import { AgentHandlerContext } from '@kbn/onechat-server';
import { isStreamEvent, toolsToLangchain } from '@kbn/onechat-genai-utils/langchain';
import { addRoundCompleteEvent, extractRound, conversationToLangchainMessages } from '../utils';
import { createPlannerAgentGraph } from './graph';
import { convertGraphEvents } from './convert_graph_events';
import { RunAgentParams, RunAgentResponse } from '../run_agent';

export type RunPlannerAgentParams = Omit<RunAgentParams, 'mode'> & {
  /**
   * Budget, in number of steps.
   * Defaults to 5.
   */
  cycleBudget?: number;
};

export type RunPlannerAgentFn = (
  params: RunPlannerAgentParams,
  context: AgentHandlerContext
) => Promise<RunAgentResponse>;

const agentGraphName = 'researcher-agent';
const defaultCycleBudget = 3;

/**
 * Create the handler function for the default onechat agent.
 */
export const runPlannerAgent: RunPlannerAgentFn = async (
  { nextInput, conversation = [], cycleBudget = defaultCycleBudget, tools },
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
    ignoreSteps: true,
  });

  const agentGraph = await createPlannerAgentGraph({
    logger,
    chatModel: model.chatModel,
    tools: langchainTools,
  });

  const eventStream = agentGraph.streamEvents(
    {
      initialMessages,
      remainingCycles: cycleBudget,
    },
    {
      version: 'v2',
      runName: agentGraphName,
      metadata: {
        graphName: agentGraphName,
      },
      recursionLimit: cycleBudget * 10,
      callbacks: [],
    }
  );

  const events$ = from(eventStream).pipe(
    filter(isStreamEvent),
    convertGraphEvents({ graphName: agentGraphName, toolIdMapping }),
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
