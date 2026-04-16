/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { filter, finalize, from, merge, Observable, ReplaySubject, shareReplay } from 'rxjs';
import type { Subscriber } from 'rxjs';
import { Command } from '@langchain/langgraph';
import {
  isStreamEvent,
  reverseMap,
  type ToolIdMapping,
} from '@kbn/agent-builder-genai-utils/langchain';
import type { BrowserApiToolMetadata, ChatAgentEvent, Conversation, ConversationRound, ConversationRoundStep, RoundInput } from '@kbn/agent-builder-common';
import {
  isToolCallEvent,
  isToolResultEvent,
  isToolProgressEvent,
  isReasoningEvent,
  isToolCallStep,
  isReasoningStep,
  memoryTools,
} from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { AgentEventEmitterFn, AgentHandlerContext } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { HookLifecycle } from '@kbn/agent-builder-server';
import type { ConversationInternalState, CompactionSummary } from '@kbn/agent-builder-common/chat';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType, type PromptManager } from '@kbn/agent-builder-server/runner';
import type { ProcessedConversation } from './utils/prepare_conversation';
import { createResultTransformer } from './utils/create_result_transformer';
import {
  addRoundCompleteEvent,
  extractRound,
  prepareConversation,
  selectSkills,
  selectTools,
  getPendingRound,
  evictInternalEvents,
} from './utils';
import { resolveCapabilities } from './utils/capabilities';
import { resolveConfiguration } from './utils/configuration';
import { ensureValidInput } from './utils/preflight_checks';
import { roundToActions } from './utils/round_to_actions';
import { computeContextBudget } from './utils/context_budget';
import { compactConversation } from './utils/conversation_compactor';
import { createAgentGraph } from './graph';
import { convertGraphEvents } from './convert_graph_events';
import type { RunAgentParams, RunAgentResponse } from './run_agent';
import { steps } from './constants';
import { createPromptFactory } from './prompts';
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

/*
 * Max number of agent cycles allowed before forcing an answer.
 */
const CYCLE_LIMIT = 15;

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
    skillsStore,
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

  const pluginSkillIds = await context.plugins.resolveSkillIds(agentConfiguration.plugin_ids ?? []);
  const filteredSkills = await selectSkills({
    skills,
    skillsStore,
    agentConfiguration,
    additionalSkillIds: pluginSkillIds,
  });

  logger.debug(`Running chat agent with connector: ${model.connector.name}, runId: ${runId}`);

  // ReplaySubject so events emitted before subscription (e.g. compaction) are
  // replayed to late subscribers when the merged stream is subscribed to.
  const manualEvents$ = new ReplaySubject<ChatAgentEvent>();
  const eventEmitter: AgentEventEmitterFn = (event) => {
    manualEvents$.next(event);
  };
  toolManager.setEventEmitter(eventEmitter);

  // Pass action so regenerate uses the last round's original input instead of request input
  let processedConversation = await prepareConversation({
    nextInput,
    previousRounds: conversation?.rounds ?? [],
    context,
    action,
  });

  const beforeHookResult = await context.hooks.run(HookLifecycle.beforeAgent, {
    request,
    abortSignal,
    nextInput: processedConversation.nextInput,
    agentId,
  });
  processedConversation.nextInput = beforeHookResult.nextInput ?? processedConversation.nextInput;

  const { staticTools, dynamicTools } = await selectTools({
    conversation: processedConversation,
    previousDynamicToolIds: conversation?.state?.dynamic_tool_ids ?? [],
    filteredSkills,
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

  const graphRecursionLimit = getRecursionLimit(CYCLE_LIMIT);

  // Create unified result transformer for tool result optimization
  const resultTransformer = createResultTransformer({
    processedConversation,
    toolRegistry,
    toolManager,
    filestore,
    filestoreEnabled: experimentalFeatures.filestore,
  });

  // Context-aware compaction: check if conversation history exceeds the
  // model's context window budget and apply hybrid compaction if needed.
  // We pass events.emit directly (not the manualEvents$-based eventEmitter)
  // so compaction events reach the SSE stream immediately during the await,
  // rather than being buffered in the ReplaySubject and replayed after.
  const contextBudget = computeContextBudget(model.connector);
  const compactionResult = await compactConversation({
    processedConversation,
    chatModel: model.chatModel,
    contextBudget,
    existingSummary: conversation?.state?.compaction_summary,
    logger,
    abortSignal,
    eventEmitter: events.emit,
  });

  // Reassign to the (possibly compacted) conversation for prompt construction
  processedConversation = compactionResult.processedConversation;

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
      agentBuilderToLangchainIdMap: reverseMap(toolManager.getToolIdMapping()),
      cycleLimit: CYCLE_LIMIT,
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
      getConversationState: () =>
        getConversationState({
          promptManager,
          toolManager,
          compactionSummary: compactionResult.summary,
        }),
      pendingRound,
      startTime,
      modelProvider,
      stateManager,
      attachmentStateManager: context.attachmentStateManager,
      configurationOverrides: effectiveOverrides,
      compactionResult,
    }),
    evictInternalEvents(),
    evictMemoryToolEvents(),
    shareReplay()
  );

  events$.subscribe({
    next: (event) => events.emit(event),
    error: () => {
      // error will be handled by function return, we just need to trap here
    },
  });

  const round = await extractRound(events$);

  // Fire-and-forget: trigger post-round memory extraction for every completed round.
  // Runs async — never blocks the response to the user.
  if (round.status === ConversationRoundStatus.completed) {
    triggerPostRoundMemoryExtraction({
      request,
      round,
      conversationId: conversation?.id ?? runId,
      conversation,
      runId,
      logger,
    }).catch(() => {
      // errors already logged inside
    });
  }

  // When showMemoryToolCalls is false, strip memory tool steps and their
  // associated reasoning steps from the round so the UI doesn't show them.
  if (!_showMemoryToolCalls) {
    const memoryToolIds = new Set(Object.values(memoryTools));
    const memoryToolCallIds = new Set<string>();

    // Collect tool_call_ids of memory tool steps
    for (const step of round.steps) {
      if (isToolCallStep(step) && memoryToolIds.has(step.tool_id)) {
        memoryToolCallIds.add(step.tool_call_id);
      }
    }

    if (memoryToolCallIds.size > 0) {
      round.steps = round.steps.filter((step: ConversationRoundStep) => {
        if (isToolCallStep(step) && memoryToolIds.has(step.tool_id)) {
          return false;
        }
        if (isReasoningStep(step) && step.tool_call_id && memoryToolCallIds.has(step.tool_call_id)) {
          return false;
        }
        return true;
      });
    }
  }

  return {
    round,
  };
};

const getConversationState = ({
  promptManager,
  toolManager,
  compactionSummary,
}: {
  promptManager: PromptManager;
  toolManager: ToolManager;
  compactionSummary?: CompactionSummary;
}): ConversationInternalState => {
  return {
    prompt: promptManager.dump(),
    dynamic_tool_ids: toolManager.getDynamicToolIds(),
    ...(compactionSummary ? { compaction_summary: compactionSummary } : {}),
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

let _showMemoryToolCalls = true;

export const setShowMemoryToolCalls = (show: boolean): void => {
  _showMemoryToolCalls = show;
};

/**
 * RxJS operator that filters out memory tool events from the stream
 * when _showMemoryToolCalls is false. This prevents checkpoint, remember,
 * and reinforce tool calls from appearing in the UI during streaming.
 */
const evictMemoryToolEvents = () => {
  const memoryToolIds = new Set(Object.values(memoryTools));
  const hiddenToolCallIds = new Set<string>();

  return (source: Observable<ChatAgentEvent>) =>
    new Observable<ChatAgentEvent>((subscriber: Subscriber<ChatAgentEvent>) => {
      return source.subscribe({
        next: (event: ChatAgentEvent) => {
          if (_showMemoryToolCalls) {
            subscriber.next(event);
            return;
          }

          if (isToolCallEvent(event) && memoryToolIds.has(event.data.tool_id)) {
            hiddenToolCallIds.add(event.data.tool_call_id);
            return;
          }

          if (isToolResultEvent(event) && hiddenToolCallIds.has(event.data.tool_call_id)) {
            return;
          }

          if (isToolProgressEvent(event) && hiddenToolCallIds.has(event.data.tool_call_id)) {
            return;
          }

          if (isReasoningEvent(event) && event.data.tool_call_id && hiddenToolCallIds.has(event.data.tool_call_id)) {
            return;
          }

          subscriber.next(event);
        },
        error: (err: Error) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
    });
};

/**
 * Fire-and-forget post-round memory extraction.
 *
 * This is a no-op stub that gets replaced at runtime by the memory system's
 * registration in plugin.ts. The indirection avoids a direct import from
 * the memory module (which would create a circular dependency between the
 * execution layer and the memory service layer).
 */
let _memoryExtractionCallback:
  | ((params: {
      request: KibanaRequest;
      round: ConversationRound;
      conversationId: string;
      conversation?: Conversation;
      runId: string;
    }) => Promise<void>)
  | undefined;

export const setMemoryExtractionCallback = (
  cb: NonNullable<typeof _memoryExtractionCallback>
): void => {
  _memoryExtractionCallback = cb;
};

const triggerPostRoundMemoryExtraction = async (params: {
  request: KibanaRequest;
  round: ConversationRound;
  conversationId: string;
  conversation?: Conversation;
  runId: string;
  logger: Logger;
}): Promise<void> => {
  if (!_memoryExtractionCallback) {
    params.logger.info('memory: extraction callback not registered — skipping post-round extraction');
    return;
  }
  params.logger.info(
    `memory: triggering post-round extraction for conversation=${params.conversationId}, round=${params.round.id}`
  );
  try {
    await _memoryExtractionCallback({
      request: params.request,
      round: params.round,
      conversationId: params.conversationId,
      conversation: params.conversation,
      runId: params.runId,
    });
  } catch (err) {
    params.logger.warn(`memory: post-round extraction failed: ${(err as Error).message}`);
  }
};
