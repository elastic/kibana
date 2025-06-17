/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { Observable, from, filter, shareReplay, firstValueFrom, map, lastValueFrom } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  ChatAgentEvent,
  isRoundCompleteEvent,
  BuiltinToolIds,
  builtinToolProviderId,
} from '@kbn/onechat-common';
import type { ModelProvider, ScopedRunner, ToolProvider } from '@kbn/onechat-server';
import { filterProviderTools } from '@kbn/onechat-genai-utils/framework';
import {
  providerToLangchainTools,
  toLangchainTool,
  conversationToLangchainMessages,
} from '../chat/utils';
import { createAgentGraph } from './graph';
import { convertGraphEvents, addRoundCompleteEvent } from '../chat/convert_graph_events';

export interface RunSearchAgentContext {
  logger: Logger;
  request: KibanaRequest;
  modelProvider: ModelProvider;
  runner: ScopedRunner;
}

export interface RunSearchAgentParams {
  /**
   * The search instructions
   */
  instructions: string;
  /**
   * Top level tool provider to use to retrieve internal tools
   */
  toolProvider: ToolProvider;
  /**
   * Handler to react to the agent's events.
   */
  onEvent?: (event: ChatAgentEvent) => void;
}

export interface RunSearchAgentResponse {
  answer: string;
}

export type RunChatAgentFn = (
  params: RunSearchAgentParams,
  context: RunSearchAgentContext
) => Promise<RunSearchAgentResponse>;

const agentGraphName = 'researcher-agent';

const noopOnEvent = () => {};

/**
 * Create the handler function for the default onechat agent.
 */
export const runSearchAgent: RunChatAgentFn = async (
  { instructions, toolProvider, onEvent = noopOnEvent },
  { logger, request, modelProvider }
) => {
  const model = await modelProvider.getDefaultModel();

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

  const langchainTools = researcherTools.map((tool) => toLangchainTool({ tool, logger }));

  const agentGraph = await createAgentGraph({
    logger,
    chatModel: model.chatModel,
    tools: langchainTools,
    systemPrompt: '',
  });

  const eventStream = agentGraph.streamEvents(
    {
      initialQuery: instructions,
      cycleBudget: 10,
    },
    {
      version: 'v2',
      runName: agentGraphName,
      metadata: {
        graphName: agentGraphName,
      },
      recursionLimit: 30,
      callbacks: [],
    }
  );

  const events$ = from(eventStream).pipe(
    filter(isStreamEvent),
    // convertGraphEvents({ graphName: agentGraphName, runName: agentGraphName }),
    // addRoundCompleteEvent({ userInput: instructions }),
    shareReplay()
  );

  events$.subscribe((event) => {
    // later we should emit reasoning events from there.
  });

  //  event: 'on_chain_end', name: 'researcher-agent'
  const lastEvent = await lastValueFrom(events$);
  const generatedAnswer = lastEvent.data.output.generatedAnswer;

  return {
    answer: generatedAnswer,
  };
};

const isStreamEvent = (input: any): input is StreamEvent => {
  return 'event' in input;
};
