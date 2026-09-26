/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { filter, finalize, from, merge, ReplaySubject, shareReplay, tap } from 'rxjs';
import { Command, Overwrite } from '@langchain/langgraph';
import { isStreamEvent, reverseMap } from '@kbn/agent-builder-genai-utils/langchain';
import type {
  BrowserApiToolMetadata,
  ChatAgentEvent,
  ConversationRoundStep,
  MetadataFieldValue,
  PreExecutionWorkflowStepData,
  RoundInput,
  SubagentEntry,
  TodosStep,
} from '@kbn/agent-builder-common';
import { ToolOrigin } from '@kbn/agent-builder-common';
import {
  ChatEventType,
  AgentExecutionMode,
  ConversationRoundStepType,
  carriedOverTodos,
} from '@kbn/agent-builder-common';
import type { AgentEventEmitterFn, AgentHandlerContext } from '@kbn/agent-builder-server';
import { HookLifecycle } from '@kbn/agent-builder-server';
import type { ConversationInternalState, CompactionSummary } from '@kbn/agent-builder-common/chat';
import type { TodoItem } from '@kbn/agent-builder-common/chat/conversation';
import type { ToolManager, TodoStateManager } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType, type PromptManager } from '@kbn/agent-builder-server/runner';
import { createResultTransformer } from './utils/create_result_transformer';
import {
  addRoundCompleteEvent,
  extractRound,
  prepareConversation,
  selectSkills,
  selectTools,
  getPendingTurn,
  createPreExecutionSteps,
  estimatePerRoundTokens,
  type PendingTurn,
} from './utils';
import { registerInternalTools } from './tools/register_internal_tools';
import {
  selectRelevantSkills,
  buildRecentContext,
  type RelevantSkillSelection,
} from './utils/relevant_skills/select_relevant_skills';
import { resolveConfiguration } from './utils/configuration';
import { ensureValidInput } from './utils/preflight_checks';
import { buildResumeInitialization } from './utils/resume_initialization';
import type { CompactedConversation } from './utils/conversation_compactor';
import { computeContextBudget } from './utils/context_budget';
import { DEFAULT_MAX_TOOL_RESULT_TOKENS } from './utils/tool_result_guardrail';
import { compactConversation } from './utils/conversation_compactor';
import { legacyEligibleRoundIds } from './utils/compaction_coverage';
import { createSummarizationTransformer } from './utils/tool_summarization';
import { sourceEvents } from '../../conversation/client/source_events';
import { createAgentGraph } from './graph';
import { convertGraphEvents } from './convert_graph_events';
import { RunTracker } from './run_tracker';
import { applyStepUpdates, stepUpdates } from './step_state';
import { buildRoundInterruptedEvent } from './utils/build_round_interrupted_event';
import { emitRoundInterruptedOnError } from './utils/emit_round_interrupted_on_error';
import type { RunAgentParams, RunAgentResponse } from './run_agent';
import { steps } from './constants';
import { createPromptFactory } from './prompts';
import { createImageResolver } from './utils/image_resolver';
import { BackgroundExecutionService } from './background_execution_service';
import { SubagentTracker } from './subagent_tracker';
import type { StateUpdate } from './state';
import {
  eventsForContext,
  groupTimelineEntries,
  isTimelineRound,
  roundResponse,
} from './utils/context_timeline';

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
const CYCLE_LIMIT = 30;

/**
 * Create the handler function for the default agentBuilder agent.
 */
export const runDefaultAgentMode: RunChatAgentFn = async (
  {
    nextInput,
    conversation,
    origin,
    author,
    agentConfiguration,
    runId = uuidv4(),
    agentId,
    abortSignal,
    browserApiTools,
    structuredOutput = false,
    outputSchema,
    startTime = new Date(),
    configurationOverrides,
    executionId,
    roundId: providedRoundId,
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
    skills,
    skillsStore,
    toolManager,
    experimentalFeatures,
    todoStateManager,
    renderers,
    conversationClient,
  } = context;

  // The context is built from the normalized event timeline (legacy conversations serialized
  // through roundsToEvents) so preflight and message building read one source.
  const timeline = conversation ? eventsForContext(conversation) : [];

  ensureValidInput({ input: nextInput, timeline });

  const pendingTurn = conversation ? getPendingTurn(conversation) : undefined;
  // Capture todos before the round runs so they can be carried over if the agent doesn't write new todos
  const initialTodos = todoStateManager.get();
  const conversationTimestamp = pendingTurn?.compatRound.started_at ?? startTime.toISOString();

  // Only clear access tracking for a brand new round; keep it when resuming (HITL).
  if (!pendingTurn) {
    context.attachmentStateManager.clearAccessTracking();
  }

  const roundId = providedRoundId ?? uuidv4();

  // Create background execution service from conversation state
  const backgroundExecutionService = new BackgroundExecutionService({
    subAgentExecutor: context.subAgentExecutor,
    initialState: conversation?.state?.background_executions,
  });

  const subagentTracker = new SubagentTracker(conversation?.state?.subagents);

  const model = await modelProvider.getDefaultModel();
  const resolvedConfiguration = await resolveConfiguration(agentConfiguration, {
    aiIndicesEnabled: experimentalFeatures.aiIndices,
    request,
    resolver: context.aiIndexResolver,
    logger,
  });

  // Context-aware skill filtering is active only when its flag is on AND a dedicated fast model is
  // configured. Without a fast model, `selectModel({ effortLevel: 'low' })` falls back to the default
  // (expensive) model, which defeats the feature — so we treat it as off (original full-list behavior).
  const relevantSkillsEnabled =
    experimentalFeatures.relevantSkills && (await modelProvider.hasFastModel());

  const pluginSkillIds = await context.plugins.resolveSkillIds(agentConfiguration.plugin_ids ?? []);
  const skillIdsOverride = configurationOverrides?.skill_ids;
  const filteredPluginSkillIds =
    skillIdsOverride !== undefined
      ? pluginSkillIds.filter((id) => skillIdsOverride.includes(id))
      : pluginSkillIds;
  const filteredSkills = await selectSkills({
    skills,
    skillsStore,
    agentConfiguration,
    additionalSkillIds: filteredPluginSkillIds,
  });

  logger.debug(`Running chat agent with connector: ${model.connector.name}, runId: ${runId}`);

  // Holds what LangGraph does not: the seed, the latest streamed state (for persistence when the
  // stream throws) and the out-of-band tool events (progress, todos writes) LangGraph never sees.
  const tracker = new RunTracker({ graphName: chatAgentGraphName });

  // ReplaySubject so events emitted before subscription (e.g. compaction) are
  // replayed to late subscribers when the merged stream is subscribed to.
  const manualEvents$ = new ReplaySubject<ChatAgentEvent>();
  const eventEmitter: AgentEventEmitterFn = (event) => {
    tracker.recordEvent(event);
    manualEvents$.next(event);
  };
  toolManager.setEventEmitter(eventEmitter);
  toolManager.setMaxToolResultTokens(DEFAULT_MAX_TOOL_RESULT_TOKENS);

  let processedConversation = await prepareConversation({
    nextInput,
    timeline,
    nextInputAuthor: pendingTurn?.compatRound.author ?? author,
    context,
    metadata: conversation?.metadata,
    templateId: conversation?.template_id,
  });
  // Everything in the log at this point came from the incoming message's attachments; anything
  // recorded from here on is made by tools during the round.
  const chatInputChanges = context.attachmentStateManager.drainChanges();

  let preExecutionWorkflow: PreExecutionWorkflowStepData | undefined;
  if (!pendingTurn) {
    const beforeHookResult = await context.hooks.run(HookLifecycle.beforeAgent, {
      request,
      abortSignal,
      nextInput: processedConversation.nextInput,
      agentId,
      conversationId: conversation?.id,
    });
    processedConversation.nextInput = beforeHookResult.nextInput ?? processedConversation.nextInput;
    preExecutionWorkflow = beforeHookResult.preExecutionWorkflow;
  }

  const relevantSkillsSelectionPromise: Promise<RelevantSkillSelection> | undefined =
    relevantSkillsEnabled && !pendingTurn
      ? selectRelevantSkills({
          skills: filteredSkills,
          context: {
            userMessage: processedConversation.nextInput.message,
            recentContext: buildRecentContext(
              groupTimelineEntries(processedConversation.timeline).map((entry) =>
                isTimelineRound(entry)
                  ? { input: entry.userMessage.data, response: roundResponse(entry) }
                  : { input: entry.userMessage.data }
              )
            ),
          },
          modelProvider,
          logger,
          abortSignal,
        })
      : undefined;

  const { staticTools, dynamicTools } = await selectTools({
    conversation: processedConversation,
    previousDynamicToolIds: conversation?.state?.dynamic_tool_ids ?? [],
    filteredSkills,
    skills,
    toolProvider,
    agentConfiguration,
    aiIndicesEnabled: experimentalFeatures.aiIndices,
    attachmentsService: attachments,
    request,
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
      tools: (browserApiTools ?? []).map((tool) => ({ ...tool, origin: ToolOrigin.internal })),
    }),
  ]);

  const conversationId = conversation?.id;
  const updateConversationMetadata =
    conversationId && conversation?.template_id
      ? (updates: Record<string, MetadataFieldValue>) =>
          conversationClient.patchMetadata(conversationId, updates)
      : undefined;

  const conversationTemplate = conversation?.template_id
    ? await context.conversationTemplates.get(conversation.template_id)
    : undefined;

  await registerInternalTools({
    context,
    agentId,
    executionId,
    abortSignal,
    backgroundExecutionService,
    updateConversationMetadata,
    conversationTemplate,
    filteredSkills,
    relevantSkillsEnabled,
    parentConversationId: conversation?.id,
    subagentTracker,
    conversationExists: (id: string) => conversationClient.exists(id),
    agentConfiguration,
  });

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

  // One transformer instance for the estimate and for the summariser's rendering, so the
  // compactor's chunk sizing matches what it sends.
  const summarizationTransformer = createSummarizationTransformer({ toolManager, toolRegistry });
  const perRoundTokenCounts = await estimatePerRoundTokens(
    processedConversation.timeline,
    summarizationTransformer
  );
  const conversationTokenEstimate = perRoundTokenCounts.reduce((sum, count) => sum + count, 0);

  // Create unified result transformer for tool result optimization
  const resultTransformer = createResultTransformer({
    toolRegistry,
    toolManager,
    resultStore: context.resultStore,
    conversationTokenEstimate,
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
    perRoundTokenCounts,
    resultTransformer: summarizationTransformer,
    legacyEligibleRoundIds: conversation
      ? legacyEligibleRoundIds(sourceEvents(conversation))
      : new Set<string>(),
    existingSummary: conversation?.state?.compaction_summary,
    logger,
    abortSignal,
    eventEmitter: events.emit,
  });

  // Reassign to the (possibly compacted) conversation for prompt construction.
  // Re-propagate conversation-level fields that compaction does not touch.
  processedConversation = {
    ...compactionResult.processedConversation,
    metadata: conversation?.metadata,
    template_id: conversation?.template_id,
  };
  processedConversation.subagentRosterFallback = subagentTracker.snapshot();

  // On a resume the selection is already persisted as a `relevant_skills` step of the paused turn.
  const relevantSkillsSelection = await relevantSkillsSelectionPromise;

  const imageResolver = createImageResolver({
    attachmentStateManager: context.attachmentStateManager,
    attachments,
    request,
    spaceId: context.spaceId,
    logger,
  });

  const promptFactory = createPromptFactory({
    configuration: resolvedConfiguration,
    spaceId: context.spaceId,
    skills: filteredSkills,
    processedConversation,
    toolManager,
    resultTransformer,
    outputSchema,
    conversationTimestamp,
    experimentalFeatures,
    relevantSkillsEnabled,
    renderers: renderers?.getRegisteredRenderers() ?? [],
    imageResolver,
    conversationTemplates: context.conversationTemplates,
  });

  const agentGraph = createAgentGraph({
    logger,
    events: { emit: eventEmitter },
    chatModel: model.chatModel,
    toolManager,
    configuration: resolvedConfiguration,
    structuredOutput,
    outputSchema,
    processedConversation,
    promptFactory,
    backgroundExecutionService,
    subagentTracker,
    toolExecutionBuffer: tracker,
    todoStateManager,
    roundId,
    sessionId: conversation?.id ?? executionId,
    cacheControl: { type: 'ephemeral', ttl: '5m' },
  });

  logger.debug(`Running chat agent with graph: ${chatAgentGraphName}, runId: ${runId}`);

  const eventStream = agentGraph.streamEvents(
    createInitializerCommand({
      pendingTurn,
      cycleLimit: CYCLE_LIMIT,
      toolManager,
      promptManager,
      eventEmitter,
      tracker,
      compactionResult,
      preExecutionWorkflow,
      relevantSkillsSelection,
      initialTodos,
    }),
    {
      version: 'v2',
      // root `on_chain_stream` chunks carry the full state after each super-step (see `RunTracker`)
      streamMode: 'values',
      signal: abortSignal,
      runName: chatAgentGraphName,
      metadata: {
        graphName: chatAgentGraphName,
        agentId,
      },
      recursionLimit: graphRecursionLimit,
      callbacks: [],
      configurable: {
        checkpoint_ns: '',
        // prevent LangGraph from inheriting the parent graph's
        // abort signals via the __pregel_abort_signals configurable key. Without this,
        // the parent graph's cleanup abort cascades to the standalone execution.
        ...(context.executionMode === AgentExecutionMode.standalone
          ? { __pregel_abort_signals: undefined }
          : {}),
      },
    }
  );

  const graphEvents$ = from(eventStream).pipe(
    filter(isStreamEvent),
    tap((event) => tracker.observeGraphEvent(event)),
    convertGraphEvents({
      graphName: chatAgentGraphName,
      logger,
      startTime,
      structuredOutput,
    }),
    finalize(() => manualEvents$.complete())
  );

  const processedInput: RoundInput = {
    message: processedConversation.nextInput.message,
    attachments: [], // legacy attachments are always stripped in `prepare_conversation` and replaced with refs
    attachment_refs: processedConversation.nextInput.attachment_refs,
  };

  manualEvents$.next({
    type: ChatEventType.roundStarted,
    data: {
      round_id: roundId,
      input: processedInput,
      started_at: startTime.toISOString(),
      ...(author ? { author } : {}),
      ...(origin ? { origin: { type: origin.type } } : {}),
      ...(pendingTurn ? { resumed: true } : {}),
    },
  });

  const effectiveOverrides =
    configurationOverrides ?? pendingTurn?.compatRound.configuration_overrides;
  const agentIdForEvents = agentId ?? conversation?.agent_id ?? 'unknown';

  const toRoundInterrupted = () =>
    buildRoundInterruptedEvent({
      tracker,
      roundId,
      pendingTurn,
      startTime,
      processedInput,
      author,
      origin,
      agentId: agentIdForEvents,
      conversation,
      modelProvider,
      mainConnectorId: model.connector.connectorId,
      configurationOverrides: effectiveOverrides,
      attachmentStateManager: context.attachmentStateManager,
      chatInputChanges,
      getWorkspaceId: () => context.bashService?.getWorkspaceId(),
    });

  const events$ = merge(graphEvents$, manualEvents$).pipe(
    addRoundCompleteEvent({
      pendingTurn,
      tracker,
      userInput: processedInput,
      origin,
      author,
      getConversationState: () =>
        getConversationState({
          promptManager,
          toolManager,
          compactionSummary: compactionResult.summary,
          backgroundExecutionService,
          todoStateManager,
          subagents: subagentTracker.snapshot(),
        }),
      startTime,
      modelProvider,
      mainConnectorId: model.connector.connectorId,
      stateManager,
      attachmentStateManager: context.attachmentStateManager,
      configurationOverrides: effectiveOverrides,
      roundId,
      getWorkspaceId: () => context.bashService?.getWorkspaceId(),
      chatInputChanges,
      agentId: agentIdForEvents,
      conversation,
    }),
    emitRoundInterruptedOnError({ buildEvent: toRoundInterrupted, logger }),
    shareReplay()
  );

  events$.subscribe({
    next: (event) => events.emit(event),
    error: () => {
      // error will be handled by function return, we just need to trap here
    },
  });

  const round = await extractRound(events$);

  // Persist filesystem state for this round (today: the workspace volume).
  try {
    await context.filesystemService.flush();
  } catch (err) {
    logger.error(`Failed to flush filesystem state after round: ${err.message ?? err}`);
  }

  // Fire post-round hooks (nonBlocking — round is already streamed, hooks run fire-and-forget).
  // The try/catch is defensive; nonBlocking hooks should never throw to the runner.
  try {
    await context.hooks.run(HookLifecycle.afterExecution, {
      request,
      abortSignal,
      agentId,
      round,
      conversationId: conversation?.id,
      connectorId: model.connector.connectorId,
      agentConfiguration,
    });
  } catch (err) {
    logger.error(`After-round hooks failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    round,
  };
};

const getConversationState = ({
  promptManager,
  toolManager,
  backgroundExecutionService,
  compactionSummary,
  todoStateManager,
  subagents,
}: {
  promptManager: PromptManager;
  toolManager: ToolManager;
  backgroundExecutionService: BackgroundExecutionService;
  compactionSummary?: CompactionSummary;
  todoStateManager: TodoStateManager;
  subagents?: Record<string, SubagentEntry>;
}): ConversationInternalState => {
  const bgState = backgroundExecutionService.getPendingState();
  const todos = todoStateManager.get();
  return {
    prompt: promptManager.dump(),
    dynamic_tool_ids: toolManager.getDynamicToolIds(),
    ...(compactionSummary ? { compaction_summary: compactionSummary } : {}),
    ...(Object.keys(bgState).length > 0 ? { background_executions: bgState } : {}),
    ...(todos !== undefined ? { todos } : {}),
    ...(subagents && Object.keys(subagents).length > 0 ? { subagents } : {}),
  };
};

/**
 * The steps a fresh run starts with: compaction / workflow / relevant-skills bookkeeping, then
 * the todos carried over from the previous round (the trailing singleton `todo_write` replaces).
 */
const buildPreExecutionSteps = ({
  compactionResult,
  preExecutionWorkflow,
  relevantSkillsSelection,
  initialTodos,
}: {
  compactionResult?: CompactedConversation;
  preExecutionWorkflow?: PreExecutionWorkflowStepData;
  relevantSkillsSelection?: RelevantSkillSelection;
  initialTodos?: TodoItem[];
}): ConversationRoundStep[] => {
  const carried = carriedOverTodos(initialTodos);
  const carriedStep: TodosStep[] =
    carried !== undefined
      ? [{ type: ConversationRoundStepType.updateTodos, todos: carried, carried_over: true }]
      : [];
  return [
    ...createPreExecutionSteps({
      compactionResult,
      preExecutionWorkflow,
      relevantSkillsSelection,
    }),
    ...carriedStep,
  ];
};

const createInitializerCommand = ({
  pendingTurn,
  cycleLimit,
  toolManager,
  promptManager,
  eventEmitter,
  tracker,
  compactionResult,
  preExecutionWorkflow,
  relevantSkillsSelection,
  initialTodos,
}: {
  pendingTurn?: PendingTurn;
  cycleLimit: number;
  toolManager: ToolManager;
  promptManager: PromptManager;
  eventEmitter: AgentEventEmitterFn;
  tracker: RunTracker;
  compactionResult?: CompactedConversation;
  preExecutionWorkflow?: PreExecutionWorkflowStepData;
  relevantSkillsSelection?: RelevantSkillSelection;
  initialTodos?: TodoItem[];
}): Command => {
  if (!pendingTurn) {
    const preExecutionSteps = buildPreExecutionSteps({
      compactionResult,
      preExecutionWorkflow,
      relevantSkillsSelection,
      initialTodos,
    });
    tracker.seed({ steps: preExecutionSteps });
    const update: StateUpdate = { cycleLimit, steps: new Overwrite(preExecutionSteps) };
    return new Command({ update, goto: steps.init });
  }

  const init = buildResumeInitialization({
    turn: pendingTurn,
    promptState: promptManager.dump(),
    agentBuilderToLangchainIdMap: reverseMap(toolManager.getToolIdMapping()),
    eventEmitter,
  });
  // on-resume cleanup: ask_user_question responses are consumed once per round.
  for (const id of init.consumedPromptIds) {
    promptManager.delete(id);
  }
  // The graph starts from the inherited steps plus this execution's own bookkeeping (a compaction
  // step, if compaction ran); only the inherited ones are excluded from the resume execution's
  // persisted steps. The paused turn already carries its relevant-skills and todos steps.
  const ownUpdates = createPreExecutionSteps({ compactionResult }).map((step) =>
    stepUpdates.append(step)
  );
  const initialSteps = applyStepUpdates(init.steps, ownUpdates);
  tracker.seed({
    steps: initialSteps,
    toolRenderState: init.toolRenderState,
    inherited: { steps: init.steps, pendingToolCallIds: init.pendingToolCallIds },
  });
  const update: StateUpdate = {
    cycleLimit,
    steps: new Overwrite(initialSteps),
    pendingToolCallIds: init.pendingToolCallIds,
    researchOutcome: init.researchOutcome,
    toolRenderState: init.toolRenderState,
    currentCycle: init.currentCycle,
    errorCount: init.errorCount,
  };
  // A pending tool call must be (re-)executed; an ask-only pause goes straight back to the agent loop.
  const goto = init.pendingToolCallIds.length > 0 ? steps.executeTool : steps.researchAgent;
  return new Command({ update, goto });
};

const getRecursionLimit = (cycleLimit: number): number => {
  // langchain's recursionLimit is basically the number of nodes we can traverse before hitting a recursion limit error
  // in practice we have three steps per cycle (agent node + tool call node + background work), and then a few other steps (prepare + answering), and some extra buffer
  return Math.ceil(cycleLimit * 3.5 + 20);
};
