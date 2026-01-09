/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { from, filter, shareReplay, merge, Subject, finalize } from 'rxjs';
import { isStreamEvent, toolsToLangchain } from '@kbn/onechat-genai-utils/langchain';
import type { ChatAgentEvent, RoundInput } from '@kbn/onechat-common';
import type { BrowserApiToolMetadata } from '@kbn/onechat-common';
import type { AgentHandlerContext, AgentEventEmitterFn } from '@kbn/onechat-server';
import {
  addRoundCompleteEvent,
  extractRound,
  selectTools,
  conversationToLangchainMessages,
  prepareConversation
} from '../utils';
import { resolveCapabilities } from '../utils/capabilities';
import { resolveConfiguration } from '../utils/configuration';
import { createAgentGraph } from './graph';
import { convertGraphEvents } from './convert_graph_events';
import type { RunAgentParams, RunAgentResponse } from '../run_agent';
import { getSkillFilePath } from '@kbn/onechat-common/skills';
import { DynamicStructuredTool } from 'langchain';
import { browserToolsToLangchain } from '../../../tools/browser_tool_adapter';
import type { ToolHandlerContext } from '@kbn/onechat-server/tools';

const chatAgentGraphName = 'deep-onechat-agent';

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
export const runDeepAgentMode: RunChatAgentFn = async (
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
  const { logger, request, modelProvider, toolProvider, attachments, skillProvider, events } = context;
  const model = await modelProvider.getDefaultModel();
  const resolvedCapabilities = resolveCapabilities(capabilities);
  const resolvedConfiguration = resolveConfiguration(agentConfiguration);
  logger.debug(`Running chat agent with connector: ${model.connector.name}, runId: ${runId}`);

  const skills = await skillProvider.list({ request });

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
  });

  const { tools: langchainTools, idMappings: toolIdMapping } = await toolsToLangchain({
    tools: selectedTools,
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

  const cycleLimit = 100; // Deep agents are allowed to run for a longer time.

  // langchain's recursionLimit is basically the number of nodes we can traverse before hitting a recursion limit error
  // we have two steps per cycle (agent node + tool call node), and then a few other steps (prepare + answering), and some extra buffer
  const graphRecursionLimit = cycleLimit * 2 + 8;

  const initialMessages = conversationToLangchainMessages({
    conversation: processedConversation,
  });

  // Convert skills to FileData format for the agent's filesystem
  const now = new Date().toISOString();
  const skillsFiles: Record<string, { content: string[]; created_at: string; modified_at: string; description?: string }> = {};
  const skillTools: DynamicStructuredTool[] = [];
  for (const skill of skills) {
    const filePath = getSkillFilePath(skill);
    skillsFiles[filePath] = {
      content: [skill.content],
      created_at: now,
      modified_at: now,
      description: skill.description,
    };
    skillTools.push(...skill.tools);
  }

  // Build skill tool context from agent handler context (same shape as ToolHandlerContext)
  const skillToolContext: Omit<ToolHandlerContext, 'resultStore'> = {
    request: context.request,
    spaceId: context.spaceId,
    logger: context.logger,
    esClient: context.esClient,
    modelProvider: context.modelProvider,
    toolProvider: context.toolProvider,
    runner: context.runner,
    events: context.events,
  };

  const agentGraph = createAgentGraph({
    logger,
    events: { emit: eventEmitter },
    chatModel: model.chatModel,
    tools: allTools,
    skillFiles: skillsFiles,
    skillTools: skillTools,
    configuration: resolvedConfiguration,
    capabilities: resolvedCapabilities,
    skillToolContext,
  });

  logger.debug(`Running chat agent with graph: ${chatAgentGraphName}, runId: ${runId}`);

  const eventStream = agentGraph.streamEvents(
    { messages: initialMessages },
    {
      version: 'v2',
      signal: abortSignal,
      runName: chatAgentGraphName,
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
      toolIdMapping: allToolIdMappings,
      logger,
      startTime,
    }),
    finalize(() => manualEvents$.complete())
  );

  const processedInput: RoundInput = {
    message: processedConversation.nextInput.message,
    attachments: processedConversation.nextInput.attachments.map((a) => a.attachment),
  };

  const events$ = merge(graphEvents$, manualEvents$).pipe(
    addRoundCompleteEvent({ userInput: processedInput, startTime, modelProvider }),
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
