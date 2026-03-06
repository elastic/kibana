/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { filter, finalize, from, merge, shareReplay, Subject } from 'rxjs';
import { Command } from '@langchain/langgraph';
import { isStreamEvent, type ToolIdMapping } from '@kbn/agent-builder-genai-utils/langchain';
import type { BrowserApiToolMetadata, ChatAgentEvent, RoundInput } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { AgentEventEmitterFn, AgentHandlerContext } from '@kbn/agent-builder-server';
import { HookLifecycle } from '@kbn/agent-builder-server';
import type { ConversationInternalState } from '@kbn/agent-builder-common/chat';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType, type PromptManager } from '@kbn/agent-builder-server/runner';
import type { ChatMessage, SerializedAttachment } from '@kbn/agent-builder-server';
import {
  MAX_ATTACHMENT_DATA_CHARS,
  MAX_ATTACHMENTS,
  MAX_CONVERSATION_HISTORY_CHARS,
  MAX_CONVERSATION_HISTORY_MESSAGES,
} from '@kbn/workflows-extensions/common';
import type {
  ProcessedConversation,
  ProcessedConversationRound,
} from '../utils/prepare_conversation';
import { createResultTransformer } from '../utils/create_result_transformer';
import {
  addRoundCompleteEvent,
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
import { steps } from './constants';
import { createPromptFactory } from './prompts';
import type { StateType } from './state';

const chatAgentGraphName = 'default-agent-builder-agent';
const TRUNCATE_SUFFIX = '...[truncated]';

function truncateStr(str: string, maxChars: number, suffix: string): string {
  if (str.length <= maxChars) return str;
  return str.slice(0, maxChars - suffix.length) + suffix;
}

function buildConversationHistory(rounds: ProcessedConversationRound[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const round of rounds) {
    const userContent = truncateStr(
      round.input.message ?? '',
      MAX_CONVERSATION_HISTORY_CHARS,
      TRUNCATE_SUFFIX
    );
    messages.push({ role: 'user', content: userContent });
    if (round.response?.message) {
      const assistantContent = truncateStr(
        round.response.message,
        MAX_CONVERSATION_HISTORY_CHARS,
        TRUNCATE_SUFFIX
      );
      messages.push({ role: 'assistant', content: assistantContent });
    }
  }
  const windowed = messages.slice(-MAX_CONVERSATION_HISTORY_MESSAGES * 2);
  let total = 0;
  const result: ChatMessage[] = [];
  for (let i = windowed.length - 1; i >= 0; i--) {
    const msg = windowed[i];
    const len = (msg.content?.length ?? 0) + 50;
    if (total + len > MAX_CONVERSATION_HISTORY_CHARS && result.length > 0) break;
    result.unshift(msg);
    total += len;
  }
  return result;
}

function serializeAttachmentData(data: unknown): Record<string, unknown> {
  const isPlainObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  const obj = isPlainObject ? (data as Record<string, unknown>) : { content: data };
  const str = JSON.stringify(obj);
  if (str.length <= MAX_ATTACHMENT_DATA_CHARS) return obj;
  return {
    _truncated: true,
    _summary: str.slice(0, MAX_ATTACHMENT_DATA_CHARS) + TRUNCATE_SUFFIX,
  };
}

function buildSerializedAttachments(
  processed: Array<{ attachment: { id?: string; type: string; data?: unknown; hidden?: boolean } }>
): SerializedAttachment[] {
  const limited = processed.slice(0, MAX_ATTACHMENTS);
  return limited.map((p) => ({
    id: p.attachment.id,
    type: p.attachment.type,
    data: serializeAttachmentData(p.attachment.data),
    ...(p.attachment.hidden !== undefined && { hidden: p.attachment.hidden }),
  }));
}

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
    configurationOverrides,
    action,
  },
  context
) => {
  const {
    logger,
    modelProvider,
    toolProvider,
    toolRegistry,
    attachments,
    request,
    stateManager,
    events,
    promptManager,
    filestore,
    skills,
    toolManager,
    experimentalFeatures,
  } = context;

  ensureValidInput({ input: nextInput, conversation, action });

  const pendingRound = getPendingRound(conversation);
  const conversationTimestamp = pendingRound?.started_at ?? startTime.toISOString();

  // Only clear access tracking for a brand new round; keep it when resuming (HITL).
  if (!pendingRound) {
    context.attachmentStateManager.clearAccessTracking();
  }

  const model = await modelProvider.getDefaultModel();
  const resolvedCapabilities = resolveCapabilities(capabilities);
  const resolvedConfiguration = resolveConfiguration(agentConfiguration);
  logger.debug(`Running chat agent with connector: ${model.connector.name}, runId: ${runId}`);

  const manualEvents$ = new Subject<ChatAgentEvent>();
  const eventEmitter: AgentEventEmitterFn = (event) => {
    manualEvents$.next(event);
  };
  toolManager.setEventEmitter(eventEmitter);

  // Pass action so regenerate uses the last round's original input instead of request input
  const processedConversation = await prepareConversation({
    nextInput,
    previousRounds: conversation?.rounds ?? [],
    context,
    action,
  });

  const conversationHistory = buildConversationHistory(processedConversation.previousRounds);
  const serializedAttachments = buildSerializedAttachments(
    processedConversation.nextInput.attachments ?? []
  );
  const beforeHookResult = await context.hooks.run(HookLifecycle.beforeAgent, {
    request,
    abortSignal,
    nextInput: processedConversation.nextInput,
    agentId,
    conversationHistory,
    attachments: serializedAttachments,
  });
  processedConversation.nextInput = beforeHookResult.nextInput ?? processedConversation.nextInput;

  const { staticTools, dynamicTools } = await selectTools({
    conversation: processedConversation,
    previousDynamicToolIds: conversation?.state?.dynamic_tool_ids ?? [],
    skills,
    toolProvider,
    agentConfiguration,
    attachmentsService: attachments,
    filestore,
    request,
    experimentalFeatures,
    spaceId: context.spaceId,
    runner: context.runner,
  });

  // First add static tools
  await Promise.all([
    toolManager.addTools({
      type: ToolManagerToolType.executable,
      tools: staticTools,
      logger,
    }),
    toolManager.addTools({
      type: ToolManagerToolType.browser,
      tools: browserApiTools ?? [],
    }),
  ]);

  // Then add dynamic tools
  await toolManager.addTools(
    {
      type: ToolManagerToolType.executable,
      tools: dynamicTools,
      logger,
    },
    {
      dynamic: true,
    }
  );

  const cycleLimit = 10;
  const graphRecursionLimit = getRecursionLimit(cycleLimit);

  // Create unified result transformer for tool result optimization
  const resultTransformer = createResultTransformer({
    toolRegistry,
    toolManager,
    filestore,
    filestoreEnabled: experimentalFeatures.filestore,
  });

  const promptFactory = createPromptFactory({
    configuration: resolvedConfiguration,
    capabilities: resolvedCapabilities,
    filestore,
    processedConversation,
    resultTransformer,
    outputSchema,
    conversationTimestamp,
    experimentalFeatures,
  });

  const agentGraph = createAgentGraph({
    logger,
    events: { emit: eventEmitter },
    chatModel: model.chatModel,
    toolManager,
    configuration: resolvedConfiguration,
    capabilities: resolvedCapabilities,
    structuredOutput,
    outputSchema,
    processedConversation,
    promptFactory,
  });

  logger.debug(`Running chat agent with graph: ${chatAgentGraphName}, runId: ${runId}`);

  const eventStream = agentGraph.streamEvents(
    createInitializerCommand({
      conversation: processedConversation,
      agentBuilderToLangchainIdMap: toolManager.getToolIdMapping(),
      cycleLimit,
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
      toolManager,
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

  // Use provided overrides, or fall back to pending round's overrides (for HITL resume)
  const effectiveOverrides = configurationOverrides ?? pendingRound?.configuration_overrides;

  const events$ = merge(graphEvents$, manualEvents$).pipe(
    addRoundCompleteEvent({
      userInput: processedInput,
      getConversationState: () => getConversationState({ promptManager, toolManager }),
      pendingRound,
      startTime,
      modelProvider,
      stateManager,
      attachmentStateManager: context.attachmentStateManager,
      configurationOverrides: effectiveOverrides,
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
  toolManager,
}: {
  promptManager: PromptManager;
  toolManager: ToolManager;
}): ConversationInternalState => {
  return {
    prompt: promptManager.dump(),
    dynamic_tool_ids: toolManager.getDynamicToolIds(),
  };
};

const createInitializerCommand = ({
  conversation,
  cycleLimit,
  agentBuilderToLangchainIdMap,
}: {
  conversation: ProcessedConversation;
  cycleLimit: number;
  agentBuilderToLangchainIdMap: ToolIdMapping;
}): Command => {
  const initialState: Partial<StateType> = { cycleLimit };
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
