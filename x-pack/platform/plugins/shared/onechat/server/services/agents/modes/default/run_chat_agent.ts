/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { from, filter, shareReplay, merge, Subject, finalize } from 'rxjs';
import { isStreamEvent, toolsToLangchain } from '@kbn/onechat-genai-utils/langchain';
import type { ChatAgentEvent, RoundInput, ToolType } from '@kbn/onechat-common';
import type { BrowserApiToolMetadata } from '@kbn/onechat-common';
import type {
  AgentHandlerContext,
  AgentEventEmitterFn,
  ExecutableTool,
} from '@kbn/onechat-server';
import type { BuiltinToolDefinition } from '@kbn/onechat-server/tools';
import { createAttachmentStateManager } from '@kbn/onechat-server/attachments';
import {
  addRoundCompleteEvent,
  extractRound,
  selectTools,
  conversationToLangchainMessages,
  prepareConversation,
  processVisualizationResults,
} from '../utils';
import { resolveCapabilities } from '../utils/capabilities';
import { resolveConfiguration } from '../utils/configuration';
import { createAgentGraph } from './graph';
import { convertGraphEvents } from './convert_graph_events';
import type { RunAgentParams, RunAgentResponse } from '../run_agent';
import { browserToolsToLangchain } from '../../../tools/browser_tool_adapter';
import { createAttachmentTools } from '../../../tools/builtin/attachment_tools';

/**
 * Converts BuiltinToolDefinition to ExecutableTool format.
 * This is needed because attachment tools are dynamically created with the state manager.
 */
const convertBuiltinToExecutable = (tool: BuiltinToolDefinition): ExecutableTool => ({
  id: tool.id,
  type: tool.type as ToolType,
  description: tool.description,
  tags: tool.tags,
  configuration: {},
  readonly: true,
  getSchema: () => tool.schema,
  execute: async (params) => tool.handler(params.toolParams),
});

const chatAgentGraphName = 'default-onechat-agent';

export type RunChatAgentParams = Omit<RunAgentParams, 'mode'> & {
  browserApiTools?: BrowserApiToolMetadata[];
  startTime?: Date;
};

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
    browserApiTools,
    structuredOutput = false,
    outputSchema,
    startTime = new Date(),
  },
  { logger, request, modelProvider, toolProvider, attachments, events }
) => {
  const model = await modelProvider.getDefaultModel();
  const resolvedCapabilities = resolveCapabilities(capabilities);
  const resolvedConfiguration = resolveConfiguration(agentConfiguration);
  logger.debug(`Running chat agent with connector: ${model.connector.name}, runId: ${runId}`);

  const manualEvents$ = new Subject<ChatAgentEvent>();
  const eventEmitter: AgentEventEmitterFn = (event) => {
    manualEvents$.next(event);
  };

  // Create attachment state manager for conversation-level attachments
  // This enables the LLM to read, update, add, and manage attachments
  const attachmentStateManager = createAttachmentStateManager(conversation?.attachments ?? []);

  const processedConversation = await prepareConversation({
    nextInput,
    previousRounds: conversation?.rounds ?? [],
    attachmentsService: attachments,
    conversationAttachments: attachmentStateManager.toArray(),
  });

  const selectedTools = await selectTools({
    conversation: processedConversation,
    toolProvider,
    agentConfiguration,
    attachmentsService: attachments,
    request,
  });

  // Create and add attachment management tools
  // These tools allow the LLM to add, read, update, delete attachments
  const attachmentToolDefinitions = createAttachmentTools(attachmentStateManager);
  const attachmentTools = attachmentToolDefinitions.map(convertBuiltinToExecutable);
  const allSelectedTools = [...selectedTools, ...attachmentTools];

  const { tools: langchainTools, idMappings: toolIdMapping } = await toolsToLangchain({
    tools: allSelectedTools,
    logger,
    request,
    sendEvent: eventEmitter,
  });

  let browserLangchainTools: any[] = [];
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

  const initialMessages = conversationToLangchainMessages({
    conversation: processedConversation,
  });

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
    { initialMessages, cycleLimit },
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
    }),
    // Process create_visualization results to create attachments
    processVisualizationResults(attachmentStateManager),
    finalize(() => manualEvents$.complete())
  );

  const processedInput: RoundInput = {
    message: processedConversation.nextInput.message,
    attachments: processedConversation.nextInput.attachments.map((a) => a.attachment),
  };

  const events$ = merge(graphEvents$, manualEvents$).pipe(
    addRoundCompleteEvent({
      userInput: processedInput,
      startTime,
      modelProvider,
      // Pass a function to get updated attachments after all events are processed
      getUpdatedAttachments: () => attachmentStateManager.toArray(),
    }),
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

const getRecursionLimit = (cycleLimit: number): number => {
  // langchain's recursionLimit is basically the number of nodes we can traverse before hitting a recursion limit error
  // we have two steps per cycle (agent node + tool call node), and then a few other steps (prepare + answering), and some extra buffer
  return cycleLimit * 2 + 8;
};
