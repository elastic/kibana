/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { Observable, from, filter, shareReplay, firstValueFrom, map } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  RoundInput,
  ConversationRound,
  ChatAgentEvent,
  isRoundCompleteEvent,
} from '@kbn/onechat-common';
import type {
  ModelProvider,
  ScopedRunner,
  ExecutableTool,
  ToolProvider,
} from '@kbn/onechat-server';
import { providerToLangchainTools, toLangchainTool, conversationLangchainMessages } from './utils';
import { createAgentGraph } from './graph';
import { convertGraphEvents, addRoundCompleteEvent } from './convert_graph_events';

export interface RunChatAgentContext {
  logger: Logger;
  request: KibanaRequest;
  modelProvider: ModelProvider;
  runner: ScopedRunner;
}

export interface RunChatAgentParams {
  /**
   * The next message in this conversation that the agent should respond to.
   */
  nextInput: RoundInput;
  /**
   * Previous rounds of conversation.
   */
  conversation?: ConversationRound[];
  /**
   * Optional system prompt to override the default one.
   */
  systemPrompt?: string;
  /**
   * List of tools that will be exposed to the agent.
   * Either a list of tools or a tool provider.
   */
  tools?: ToolProvider | ExecutableTool[];
  /**
   * In case of nested calls (e.g calling from a tool), allows to define the runId.
   */
  runId?: string;
  /**
   * Handler to react to the agent's events.
   */
  onEvent?: (event: ChatAgentEvent) => void;
  /**
   * Can be used to override the graph's name. Used for tracing.
   */
  agentGraphName?: string;
}

export type RunChatAgentFn = (
  params: RunChatAgentParams,
  context: RunChatAgentContext
) => Promise<ConversationRound>;

const defaultAgentGraphName = 'default-onechat-agent';

const noopOnEvent = () => {};

/**
 * Create the handler function for the default onechat agent.
 */
export const runChatAgent: RunChatAgentFn = async (
  {
    nextInput,
    conversation = [],
    tools = [],
    onEvent = noopOnEvent,
    runId = uuidv4(),
    systemPrompt,
    agentGraphName = defaultAgentGraphName,
  },
  { logger, request, modelProvider }
) => {
  const model = await modelProvider.getDefaultModel();
  const langchainTools = Array.isArray(tools)
    ? tools.map((tool) => toLangchainTool({ tool, logger }))
    : await providerToLangchainTools({ request, toolProvider: tools, logger });
  const initialMessages = conversationLangchainMessages({
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
      runName: agentGraphName,
      metadata: {
        graphName: agentGraphName,
        runId,
      },
      recursionLimit: 10,
      callbacks: [],
    }
  );

  const events$ = from(eventStream).pipe(
    filter(isStreamEvent),
    convertGraphEvents({ graphName: agentGraphName, runName: agentGraphName }),
    addRoundCompleteEvent({ userInput: nextInput }),
    shareReplay()
  );

  events$.subscribe(onEvent);

  return await extractRound(events$);
};

export const extractRound = async (events$: Observable<ChatAgentEvent>) => {
  return await firstValueFrom(
    events$.pipe(
      filter(isRoundCompleteEvent),
      map((event) => event.data.round)
    )
  );
};

const isStreamEvent = (input: any): input is StreamEvent => {
  return 'event' in input;
};
