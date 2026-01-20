/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { filter, finalize, from, merge, shareReplay, Subject } from 'rxjs';
import { Command } from '@langchain/langgraph';
import {
  isStreamEvent,
  type ToolIdMapping,
  toolsToLangchain,
} from '@kbn/agent-builder-genai-utils/langchain';
import type { BrowserApiToolMetadata, ChatAgentEvent, RoundInput } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { AgentEventEmitterFn, AgentHandlerContext } from '@kbn/agent-builder-server';
import type { StructuredTool } from '@langchain/core/tools';
import type { ConversationInternalState } from '@kbn/agent-builder-common/chat';
import type { PromptManager } from '@kbn/agent-builder-server/runner';
import type { ProcessedConversation } from '../utils/prepare_conversation';
import {
  addRoundCompleteEvent,
  conversationToLangchainMessages,
  extractRound,
  prepareConversation,
  selectTools,
  getPendingRound,
  evictInternalEvents,
} from '../utils';
import { resolveCapabilities } from '../utils/capabilities';
import { resolveConfiguration } from '../utils/configuration';
import { ensureValidInput } from '../utils/preflight_checks';
import { roundToActions } from '../utils/round_to_actions';
import { createAgentGraph } from './graph';
import { convertGraphEvents } from './convert_graph_events';
import type { RunAgentParams, RunAgentResponse } from '../run_agent';
import { browserToolsToLangchain } from '../../../tools/browser_tool_adapter';
import { steps } from './constants';
import type { StateType } from './state';

const chatAgentGraphName = 'default-agent-builder-agent';

export type RunChatAgentParams = Omit<RunAgentParams, 'mode'> & {
  browserApiTools?: BrowserApiToolMetadata[];
  startTime?: Date;
};

export type RunChatAgentFn = (
  params: RunChatAgentParams,
  context: AgentHandlerContext
) => Promise<RunAgentResponse>;

/**
 * Create the handler function for the default agentBuilder agent.
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
    browserApiTools,
    structuredOutput = false,
    outputSchema,
    startTime = new Date(),
  },
  context
) => {
  const {
    logger,
    modelProvider,
    toolProvider,
    attachments,
    request,
    stateManager,
    events,
    promptManager,
  } = context;

  ensureValidInput({ input: nextInput, conversation });

  const pendingRound = getPendingRound(conversation);
  const conversationTimestamp = pendingRound?.started_at ?? startTime.toISOString();

  const model = await modelProvider.getDefaultModel();
  const resolvedCapabilities = resolveCapabilities(capabilities);
  const resolvedConfiguration = resolveConfiguration(agentConfiguration);
  logger.debug(`Running chat agent with connector: ${model.connector.name}, runId: ${runId}`);

  const manualEvents$ = new Subject<ChatAgentEvent>();
  const eventEmitter: AgentEventEmitterFn = (event) => {
    manualEvents$.next(event);
  };

  const processedConversation = await prepareConversation({
    nextInput,
    previousRounds: conversation?.rounds ?? [],
    context,
  });

  const selectedTools = await selectTools({
    conversation: processedConversation,
    toolProvider,
    agentConfiguration,
    attachmentsService: attachments,
    request,
    runner: context.runner,
  });

  const {
    tools: langchainTools,
    idMappings: toolIdMapping,
    agentBuilderToLangchainIdMap,
  } = await toolsToLangchain({
    tools: selectedTools,
    logger,
    request,
    sendEvent: eventEmitter,
  });

  let browserLangchainTools: StructuredTool[] = [];
  let browserIdMappings = new Map<string, string>();
  if (browserApiTools && browserApiTools.length > 0) {
    const browserToolResult = browserToolsToLangchain({
      browserApiTools,
    });
    browserLangchainTools = browserToolResult.tools;
    browserIdMappings = browserToolResult.idMappings;
  }

  const allTools = [...langchainTools, ...browserLangchainTools];
  const allToolIdMappings = new Map([...toolIdMapping, ...browserIdMappings]);

  const cycleLimit = 10;
  const graphRecursionLimit = getRecursionLimit(cycleLimit);

  const agentGraph = createAgentGraph({
    logger,
    events: { emit: eventEmitter },
    chatModel: model.chatModel,
    tools: allTools,
    configuration: resolvedConfiguration,
    capabilities: resolvedCapabilities,
    structuredOutput,
    outputSchema,
    processedConversation,
  });

  logger.debug(`Running chat agent with graph: ${chatAgentGraphName}, runId: ${runId}`);

  const eventStream = agentGraph.streamEvents(
    createInitializerCommand({
      conversation: processedConversation,
      agentBuilderToLangchainIdMap,
      cycleLimit,
      conversationTimestamp,
    }),
    {
      version: 'v2',
      signal: abortSignal,
      runName: chatAgentGraphName,
      metadata: {
        graphName: chatAgentGraphName,
        agentId,
      },
      recursionLimit: graphRecursionLimit,
      callbacks: [],
    }
  );

  const graphEvents$ = from(eventStream).pipe(
    filter(isStreamEvent),
    convertGraphEvents({
      graphName: chatAgentGraphName,
      toolIdMapping: allToolIdMappings,
      logger,
      startTime,
      pendingRound,
    }),
    finalize(() => manualEvents$.complete())
  );

  const processedInput: RoundInput = {
    message: processedConversation.nextInput.message,
    attachments: processedConversation.nextInput.attachments.map((a) => a.attachment),
  };

  const events$ = merge(graphEvents$, manualEvents$).pipe(
    addRoundCompleteEvent({
      userInput: processedInput,
      getConversationState: () => getConversationState({ promptManager }),
      pendingRound,
      startTime,
      modelProvider,
      stateManager,
      attachmentStateManager: context.attachmentStateManager,
    }),
    evictInternalEvents(),
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

const getConversationState = ({
  promptManager,
}: {
  promptManager: PromptManager;
}): ConversationInternalState => {
  return {
    prompt: promptManager.dump(),
  };
};

const createInitializerCommand = ({
  conversation,
  cycleLimit,
  agentBuilderToLangchainIdMap,
  conversationTimestamp,
}: {
  conversation: ProcessedConversation;
  cycleLimit: number;
  agentBuilderToLangchainIdMap: ToolIdMapping;
  conversationTimestamp: string;
}): Command => {
  const initialMessages = conversationToLangchainMessages({
    conversation,
  });

  const initialState: Partial<StateType> = { initialMessages, cycleLimit, conversationTimestamp };
  let startAt = steps.init;

  const lastRound = conversation.previousRounds.length
    ? conversation.previousRounds[conversation.previousRounds.length - 1]
    : undefined;

  if (lastRound?.status === ConversationRoundStatus.awaitingPrompt) {
    initialState.mainActions = roundToActions({
      round: lastRound,
      toolIdMapping: agentBuilderToLangchainIdMap,
    });

    startAt = steps.executeTool;
  }

  if (lastRound?.state) {
    initialState.currentCycle = lastRound.state.agent.current_cycle;
    initialState.errorCount = lastRound.state.agent.error_count;
  }

  return new Command({
    update: initialState,
    goto: startAt,
  });
};

const getRecursionLimit = (cycleLimit: number): number => {
  // langchain's recursionLimit is basically the number of nodes we can traverse before hitting a recursion limit error
  // we have two steps per cycle (agent node + tool call node), and then a few other steps (prepare + answering), and some extra buffer
  return cycleLimit * 2 + 8;
};
