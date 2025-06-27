/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, filter, shareReplay } from 'rxjs';
import { BuiltinToolIds, builtinToolProviderId } from '@kbn/onechat-common';
import { AgentHandlerContext } from '@kbn/onechat-server';
import { isStreamEvent, toolsToLangchain } from '@kbn/onechat-genai-utils/langchain';
import { filterProviderTools } from '@kbn/onechat-genai-utils/framework';
import { addRoundCompleteEvent, extractRound, conversationToLangchainMessages } from '../utils';
import { createResearcherAgentGraph } from './graph';
import { convertGraphEvents } from './convert_graph_events';
import { RunAgentParams, RunAgentResponse } from '../run_agent';

export type RunResearcherAgentParams = Omit<RunAgentParams, 'mode'> & {
  /**
   * Budget, in search cycles, to allocate to the researcher.
   * Defaults to 5.
   */
  cycleBudget?: number;
};

export type RunResearcherAgentFn = (
  params: RunResearcherAgentParams,
  context: AgentHandlerContext
) => Promise<RunAgentResponse>;

const agentGraphName = 'researcher-agent';
const defaultCycleBudget = 5;

/**
 * Create the handler function for the default onechat agent.
 */
export const runResearcherAgent: RunResearcherAgentFn = async (
  { nextInput, conversation = [], cycleBudget = defaultCycleBudget, tools },
  { logger, request, modelProvider, toolProvider, events }
) => {
  const model = await modelProvider.getDefaultModel();

  // TODO: use tools param instead of tool provider
  const researcherTools = await filterProviderTools({
    request,
    provider: toolProvider,
    rules: [
      {
        type: 'by_tool_id',
        providerId: builtinToolProviderId,
        toolIds: [
          BuiltinToolIds.relevanceSearch,
          BuiltinToolIds.naturalLanguageSearch,
          BuiltinToolIds.indexExplorer,
          BuiltinToolIds.getDocumentById,
        ],
      },
    ],
  });

  const { tools: langchainTools, idMappings: toolIdMapping } = await toolsToLangchain({
    tools: researcherTools,
    logger,
    request,
  });

  const initialMessages = conversationToLangchainMessages({
    nextInput,
    previousRounds: conversation,
    ignoreSteps: true,
  });

  const agentGraph = await createResearcherAgentGraph({
    logger,
    chatModel: model.chatModel,
    tools: langchainTools,
  });

  const eventStream = agentGraph.streamEvents(
    {
      initialMessages,
      cycleBudget,
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
