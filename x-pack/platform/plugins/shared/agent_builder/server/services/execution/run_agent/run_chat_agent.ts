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
  AttachmentTimelineEvent,
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
  EventActorType,
  carriedOverTodos,
  timelineExecutionId,
} from '@kbn/agent-builder-common';
import type { AgentEventEmitterFn, AgentHandlerContext } from '@kbn/agent-builder-server';
import { HookLifecycle } from '@kbn/agent-builder-server';
import type { ConversationInternalState, CompactionSummary } from '@kbn/agent-builder-common/chat';
import type { TodoItem } from '@kbn/agent-builder-common/chat/conversation';
import type { ToolManager, TodoStateManager } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType, type PromptManager } from '@kbn/agent-builder-server/runner';
import {
  addRoundCompleteEvent,
  extractRound,
  prepareConversation,
  selectSkills,
  selectTools,
  getPendingTurn,
  createPreExecutionSteps,
  type PendingTurn,
} from './utils';
import { registerInternalTools } from './tools/register_internal_tools';
import { resolveConfiguration } from './utils/configuration';
import { ensureValidInput } from './utils/preflight_checks';
import { buildResumeInitialization } from './utils/resume_initialization';
import { DEFAULT_MAX_TOOL_RESULT_TOKENS } from './utils/tool_result_guardrail';
import { legacyEligibleRoundIds } from './utils/compaction_coverage';
import { historyView, translateLegacySummary } from './utils/context_coverage';
import type { PreviousRoundInfo } from './utils/context_management';
import { createSummarizationTransformer } from './utils/tool_summarization';
import { buildResumeAnchors, pausedItems, type PausedItem } from './utils/attachment_placement';
import { sourceEvents } from '../../conversation/client/source_events';
import { nextResumeIndex, userMessageActor } from '../../conversation/client/rounds_to_events';
import { createAgentGraph } from './graph';
import {
  RunAttachmentEvents,
  inheritedAttachmentEvents,
  runTriggerEventId,
} from './run_attachment_events';
import { CycleHookRuntime } from './cycle_hooks/cycle_hook_runtime';
import { buildCycleHookExecutionContext } from './cycle_hooks/execution_context';
import { convertGraphEvents } from './convert_graph_events';
import { RunTracker } from './run_tracker';
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
  lastExecutionTerminal,
  type ProcessedTimelineEvent,
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
    conversationAccess,
  } = context;
  const storesConversation = conversationAccess === 'readWrite';

  // The context is built from the normalized event timeline (legacy conversations serialized
  // through roundsToEvents) so preflight and message building read one source.
  const timeline = conversation ? eventsForContext(conversation) : [];

  ensureValidInput({ input: nextInput, timeline, allowResume: storesConversation });

  const pendingTurn = conversation && storesConversation ? getPendingTurn(conversation) : undefined;
  // Capture todos before the round runs so they can be carried over if the agent doesn't write new todos
  const initialTodos = todoStateManager.get();
  const conversationTimestamp = pendingTurn?.compatRound.started_at ?? startTime.toISOString();

  const roundId = providedRoundId ?? uuidv4();
  const triggerEventId = runTriggerEventId({
    conversation,
    pendingTurnId: pendingTurn?.id,
    roundId,
  });
  const resumeAnchors = conversation
    ? buildResumeAnchors(sourceEvents(conversation))
    : new Map<string, PausedItem[]>();
  if (pendingTurn?.terminated) {
    resumeAnchors.set(triggerEventId, pausedItems(pendingTurn.terminated));
  }
  const agentIdForEvents = agentId ?? conversation?.agent_id ?? 'unknown';
  // Use raw persisted executions: the model-context timeline folds multiple resumes into one.
  // Legacy rounds cannot recover exact history, but a pending turn is at least the first resume.
  const roundExecutionIndex = pendingTurn
    ? Math.max(1, nextResumeIndex({ events: conversation?.events }, pendingTurn.id))
    : 0;
  // The timeline id of this execution, which every event written for it carries. A resume mints
  // its own round id but is persisted to the paused round. `executionId` names the execution
  // record and is never persisted on conversation events.
  const roundExecutionId = timelineExecutionId(pendingTurn?.id ?? roundId, roundExecutionIndex);

  // Create background execution service from conversation state
  const backgroundExecutionService = new BackgroundExecutionService({
    subAgentExecutor: context.subAgentExecutor,
    initialState: storesConversation ? conversation?.state?.background_executions : undefined,
  });

  const subagentTracker = new SubagentTracker(
    storesConversation ? conversation?.state?.subagents : undefined
  );

  // Context-aware skill filtering is active only when its flag is on AND a dedicated fast model is
  // configured. Without a fast model, `selectModel({ effortLevel: 'low' })` falls back to the default
  // (expensive) model, which defeats the feature — so we treat it as off (original full-list behavior).
  const [model, resolvedConfiguration, relevantSkillsEnabled, pluginSkillIds] = await Promise.all([
    modelProvider.getDefaultModel(),
    resolveConfiguration(agentConfiguration, {
      aiIndicesEnabled: experimentalFeatures.aiIndices,
      request,
      resolver: context.aiIndexResolver,
      logger,
    }),
    experimentalFeatures.relevantSkills ? modelProvider.hasFastModel() : false,
    context.plugins.resolveSkillIds(agentConfiguration.plugin_ids ?? []),
  ]);
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

  const processedConversation = await prepareConversation({
    nextInput,
    timeline,
    nextInputAuthor: pendingTurn?.compatRound.author ?? author,
    context,
    metadata: conversation?.metadata,
    templateId: conversation?.template_id,
    resumeAnchors,
  });
  processedConversation.resumedRoundId = pendingTurn?.id;
  const pendingRound = pendingTurn?.compatRound;
  const runAttachmentEvents = new RunAttachmentEvents({
    attachmentStateManager: context.attachmentStateManager,
    roundId: pendingTurn?.id ?? roundId,
    triggerEventId,
    inputActor: userMessageActor(
      conversation,
      pendingRound
        ? { author: pendingRound.author, origin: pendingRound.origin }
        : {
            ...(author ? { author } : {}),
            ...(origin ? { origin: { type: origin.type } } : {}),
          }
    ),
    agentId: agentIdForEvents,
  });
  // Everything recorded so far came from the incoming message's attachments.
  const chatInputEvents = runAttachmentEvents.drainChatInput();

  const beforeHookResult = await context.hooks.run(HookLifecycle.beforeAgent, {
    request,
    abortSignal,
    nextInput: processedConversation.nextInput,
    agentId,
    runAs: context.runAs,
    conversationId: conversation?.id,
    conversationAccess,
    roundExecutionIndex,
  });
  processedConversation.nextInput = beforeHookResult.nextInput ?? processedConversation.nextInput;
  if (!pendingTurn && chatInputEvents.length > 0) {
    processedConversation.nextInput = {
      ...processedConversation.nextInput,
      attachment_events: chatInputEvents,
    };
  }
  // Only the first execution owns the round's workflow context step.
  const preExecutionWorkflow: PreExecutionWorkflowStepData | undefined = pendingTurn
    ? undefined
    : beforeHookResult.preExecutionWorkflow;

  // The stored summary, with a cursor when it predates cycle-based compaction. What it covers is
  // hidden at render time; the graph replaces it when it compacts.
  const storedSummary = conversation?.state?.compaction_summary;
  const compactionSummary =
    conversation && storedSummary
      ? translateLegacySummary({
          summary: storedSummary,
          entries: historyView(processedConversation).entries,
          legacyEligibleIds: legacyEligibleRoundIds(sourceEvents(conversation)),
        })
      : undefined;

  // Started before the tool setup so a 'first' hook overlaps it, as the skill selection below does.
  const cycleHooks = new CycleHookRuntime({
    definitions: context.hooks.listCycleHooks(),
    execution: buildCycleHookExecutionContext({
      context,
      agentId: agentIdForEvents,
      agentConfiguration,
      skills: filteredSkills,
      roundId: pendingTurn?.id ?? roundId,
      executionId: executionId ?? runId,
      resumed: pendingTurn !== undefined,
      conversationId: conversation?.id,
      processedConversation,
      abortSignal,
    }),
    logger: logger.get('cycleHooks'),
  });
  await cycleHooks.start([], compactionSummary);

  // Closed on every exit so a late background append is refused rather than queued for nothing.
  try {
    const { staticTools, dynamicTools } = await selectTools({
      conversation: processedConversation,
      previousDynamicToolIds: conversation?.state?.dynamic_tool_ids ?? [],
      filteredSkills,
      skills,
      toolProvider,
      agentConfiguration,
      aiIndexCatalog: resolvedConfiguration.aiIndexCatalog,
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
      storesConversation && conversationId && conversation?.template_id
        ? (updates: Record<string, MetadataFieldValue>) =>
            conversationClient.patchMetadata(conversationId, updates, {
              source: 'execution',
              // Attribute the change to the agent's run.
              activity: {
                actor: { type: EventActorType.agent, id: agentId ?? conversation.agent_id },
                execution_id: roundExecutionId,
              },
            })
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

    // Tool-specific summarization of history tool results; substitution marks are layered on top
    // when the context is rendered.
    const resultTransformer = createSummarizationTransformer({ toolManager, toolRegistry });

    const previousRound = getPreviousRoundInfo(processedConversation.timeline);

    processedConversation.subagentRosterFallback = subagentTracker.snapshot();

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
      deployment: context.deployment,
      skills: filteredSkills,
      processedConversation,
      toolManager,
      resultTransformer,
      resultStore: context.resultStore,
      logger,
      outputSchema,
      conversationTimestamp,
      experimentalFeatures,
      relevantSkillsEnabled,
      renderers: renderers?.getRegisteredRenderers() ?? [],
      imageResolver,
      conversationTemplates: context.conversationTemplates,
      conversationMetadataWritable: updateConversationMetadata !== undefined,
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
      runAttachmentEvents,
      roundId,
      sessionId: conversation?.id ?? executionId,
      cacheControl: { type: 'ephemeral', ttl: '5m' },
      contextManagement: {
        connector: model.connector,
        abortSignal,
        previousRound,
        resultStore: context.resultStore,
        resultTransformer,
        logger,
        analyticsService: context.analyticsService,
        agentId,
        executionId,
      },
      cycleHooks,
    });

    logger.debug(`Running chat agent with graph: ${chatAgentGraphName}, runId: ${runId}`);

    const eventStream = agentGraph.streamEvents(
      createInitializerCommand({
        pendingTurn,
        roundId,
        cycleLimit: CYCLE_LIMIT,
        toolManager,
        promptManager,
        eventEmitter,
        tracker,
        compactionSummary,
        previousRound,
        preExecutionWorkflow,
        initialTodos,
        initialAttachmentEvents: pendingTurn
          ? [
              ...inheritedAttachmentEvents(processedConversation.timeline, pendingTurn.id),
              ...chatInputEvents,
            ]
          : [],
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

    const processedInput: RoundInput = { message: processedConversation.nextInput.message };

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
    const toRoundInterrupted = () =>
      buildRoundInterruptedEvent({
        tracker,
        roundId,
        pendingTurn,
        startTime,
        processedInput,
        modelProvider,
        mainConnectorId: model.connector.connectorId,
        configurationOverrides: effectiveOverrides,
        attachmentStateManager: context.attachmentStateManager,
        runAttachmentEvents,
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
            compactionSummary: tracker.finalState().compactionSummary,
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
        runAttachmentEvents,
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
    cycleHooks.close();

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
        runAs: context.runAs,
        round,
        conversationId: conversation?.id,
        conversationAccess,
        connectorId: model.connector.connectorId,
        agentConfiguration,
      });
    } catch (err) {
      logger.error(`After-round hooks failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return {
      round,
    };
  } finally {
    cycleHooks.close();
  }
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
 * The steps a fresh run starts with: the workflow bookkeeping, then the todos
 * carried over from the previous round (the trailing singleton the first `todo_write` replaces).
 */
const buildPreExecutionSteps = ({
  preExecutionWorkflow,
  initialTodos,
}: {
  preExecutionWorkflow?: PreExecutionWorkflowStepData;
  initialTodos?: TodoItem[];
}): ConversationRoundStep[] => {
  const carried = carriedOverTodos(initialTodos);
  const carriedStep: TodosStep[] =
    carried !== undefined
      ? [{ type: ConversationRoundStepType.updateTodos, todos: carried, carried_over: true }]
      : [];
  return [...createPreExecutionSteps({ preExecutionWorkflow }), ...carriedStep];
};

const createInitializerCommand = ({
  pendingTurn,
  roundId,
  cycleLimit,
  toolManager,
  promptManager,
  eventEmitter,
  tracker,
  compactionSummary,
  previousRound,
  preExecutionWorkflow,
  initialTodos,
  initialAttachmentEvents,
}: {
  pendingTurn?: PendingTurn;
  roundId: string;
  cycleLimit: number;
  toolManager: ToolManager;
  promptManager: PromptManager;
  eventEmitter: AgentEventEmitterFn;
  tracker: RunTracker;
  compactionSummary?: CompactionSummary;
  previousRound?: PreviousRoundInfo;
  preExecutionWorkflow?: PreExecutionWorkflowStepData;
  initialTodos?: TodoItem[];
  initialAttachmentEvents: AttachmentTimelineEvent[];
}): Command => {
  if (!pendingTurn) {
    const preExecutionSteps = buildPreExecutionSteps({
      preExecutionWorkflow,
      initialTodos,
    });
    tracker.seed({ steps: preExecutionSteps, compactionSummary });
    const update: StateUpdate = {
      cycleLimit,
      roundId,
      steps: new Overwrite(preExecutionSteps),
      compactionSummary,
    };
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
  // The graph starts from the inherited steps; they are excluded from the resume execution's
  // persisted steps. The paused turn already carries its relevant-skills and todos steps.
  tracker.seed({
    steps: init.steps,
    toolRenderState: init.toolRenderState,
    compactionSummary,
    inherited: { steps: init.steps, pendingToolCallIds: init.pendingToolCallIds },
  });
  const lastCallInputTokens = previousRound?.lastCallInputTokens;
  const update: StateUpdate = {
    cycleLimit,
    // a resume execution mints its own round id, but its steps are persisted to the paused round
    roundId: pendingTurn.id,
    steps: new Overwrite(init.steps),
    pendingToolCallIds: init.pendingToolCallIds,
    researchOutcome: init.researchOutcome,
    toolRenderState: init.toolRenderState,
    currentCycle: init.currentCycle,
    errorCount: init.errorCount,
    compactionSummary,
    attachmentEvents: initialAttachmentEvents,
    // the paused execution's last call is what the resumed context starts from
    ...(lastCallInputTokens !== undefined
      ? { lastCallUsage: { inputTokens: lastCallInputTokens } }
      : {}),
  };
  // A pending tool call must be (re-)executed; an ask-only pause goes back to the agent loop,
  // through context management.
  const goto = init.pendingToolCallIds.length > 0 ? steps.executeTool : steps.contextManagement;
  return new Command({ update, goto });
};

/** Cache and usage hints from the last execution of the conversation. */
const getPreviousRoundInfo = (
  timeline: ProcessedTimelineEvent[]
): PreviousRoundInfo | undefined => {
  const terminal = lastExecutionTerminal(timeline);
  if (!terminal) {
    return undefined;
  }
  const modelUsage = terminal.data.model_usage;
  return {
    terminatedAt: terminal.created_at,
    connectorId: modelUsage?.connector_id,
    lastCallInputTokens: modelUsage?.last_call_input_tokens,
  };
};

/**
 * LangGraph's `recursionLimit` is the number of nodes a run may traverse. A cycle that calls tools
 * spans five (background work, context management, cycle hooks, research, tool execution), so a
 * run that spends its whole budget and then answers needs `5 * cycleLimit + 7`: the start node,
 * init and finalize included. The rest is room for retries (two nodes each), compactions and the
 * structured-answer nodes.
 */
export const getRecursionLimit = (cycleLimit: number): number => {
  return Math.ceil(cycleLimit * 5.5 + 20);
};
