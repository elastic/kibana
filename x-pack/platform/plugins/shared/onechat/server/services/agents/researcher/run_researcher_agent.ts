/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, filter, shareReplay, lastValueFrom } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  ChatAgentEvent,
  BuiltinToolIds,
  builtinToolProviderId,
  isMessageCompleteEvent,
} from '@kbn/onechat-common';
import type { ModelProvider, ScopedRunner, ToolProvider } from '@kbn/onechat-server';
import { filterProviderTools } from '@kbn/onechat-genai-utils/framework';
import { toLangchainTool } from '../chat/utils';
import { createResearcherAgentGraph } from './graph';
import { convertGraphEvents } from './convert_graph_events';

export interface RunResearcherAgentContext {
  logger: Logger;
  request: KibanaRequest;
  modelProvider: ModelProvider;
  runner: ScopedRunner;
}

export interface RunResearcherAgentParams {
  /**
   * The search instructions
   */
  instructions: string;
  /**
   * Budget, in search cycles, to allocate to the researcher.
   * Defaults to 5.
   */
  cycleBudget?: number;

  /**
   * Top level tool provider to use to retrieve internal tools
   */
  toolProvider: ToolProvider;
  /**
   * Handler to react to the agent's events.
   */
  onEvent?: (event: ChatAgentEvent) => void;
}

export interface RunResearcherAgentResponse {
  answer: string;
}

export type RunResearcherAgentFn = (
  params: RunResearcherAgentParams,
  context: RunResearcherAgentContext
) => Promise<RunResearcherAgentResponse>;

const agentGraphName = 'researcher-agent';
const defaultCycleBudget = 5;

const noopOnEvent = () => {};

/**
 * Create the handler function for the default onechat agent.
 */
export const runResearcherAgent: RunResearcherAgentFn = async (
  { instructions, cycleBudget = defaultCycleBudget, toolProvider, onEvent = noopOnEvent },
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

  const agentGraph = await createResearcherAgentGraph({
    logger,
    chatModel: model.chatModel,
    tools: langchainTools,
  });

  const eventStream = agentGraph.streamEvents(
    {
      initialQuery: instructions,
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
    convertGraphEvents({ graphName: agentGraphName }),
    shareReplay()
  );

  events$.pipe().subscribe((event) => {
    // later we should emit reasoning events from there.
  });

  const lastEvent = await lastValueFrom(events$.pipe(filter(isMessageCompleteEvent)));
  const generatedAnswer = lastEvent.data.messageContent;

  return {
    answer: generatedAnswer,
  };
};

const isStreamEvent = (input: any): input is StreamEvent => {
  return 'event' in input;
};
