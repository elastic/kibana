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
import type { ChatAgentEvent, RoundInput } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { AgentEventEmitterFn, AgentHandlerContext } from '@kbn/agent-builder-server';
import type { ConversationInternalState } from '@kbn/agent-builder-common/chat';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType, type PromptManager } from '@kbn/agent-builder-server/runner';
import type { ProcessedConversation } from '../utils/prepare_conversation';
import {
  addRoundCompleteEvent,
  extractRound,
  prepareConversation,
  getPendingRound,
  evictInternalEvents,
} from '../utils';
import { resolveCapabilities } from '../utils/capabilities';
import { resolveConfiguration } from '../utils/configuration';
import { ensureValidInput } from '../utils/preflight_checks';
import { roundToActions } from '../utils/round_to_actions';
import { createAgentGraph } from '../default/graph';
import { convertGraphEvents } from '../default/convert_graph_events';
import { steps } from '../default/constants';
import type { StateType } from '../default/state';
import type { RunAgentParams, RunAgentResponse } from '../run_agent';
import { getPlanningTools, type PlanState } from './tools';
import { createPlanningPromptFactory } from './prompts';
import { getStoreTools } from '../../../runner/store';
import { builtinToolToExecutable } from '../utils';

const planningGraphName = 'planning-agent-builder-agent';

/**
 * Planning mode handler.
 * Reuses the default mode's graph infrastructure but with planning-specific tools and prompts.
 * The agent can only create/update plans and discover capabilities — no execution tools.
 */
export const runPlanningAgentMode = async (
  {
    nextInput,
    conversation,
    agentConfiguration,
    capabilities,
    runId = uuidv4(),
    agentId,
    abortSignal,
    structuredOutput = false,
    outputSchema,
    configurationOverrides,
    action,
  }: RunAgentParams,
  context: AgentHandlerContext
): Promise<RunAgentResponse> => {
  const {
    logger,
    modelProvider,
    toolProvider,
    request,
    stateManager,
    events,
    promptManager,
    filestore,
    toolManager,
    experimentalFeatures,
    runner,
  } = context;

  ensureValidInput({ input: nextInput, conversation, action });

  const pendingRound = getPendingRound(conversation);
  const startTime = new Date();

  if (!pendingRound) {
    context.attachmentStateManager.clearAccessTracking();
  }

  const model = await modelProvider.getDefaultModel();
  const resolvedCapabilities = resolveCapabilities(capabilities);
  const resolvedConfiguration = resolveConfiguration(agentConfiguration);

  logger.debug(`Running planning agent with connector: ${model.connector.name}, runId: ${runId}`);

  const manualEvents$ = new Subject<ChatAgentEvent>();
  const eventEmitter: AgentEventEmitterFn = (event) => {
    manualEvents$.next(event);
  };
  toolManager.setEventEmitter(eventEmitter);

  const processedConversation = await prepareConversation({
    nextInput,
    previousRounds: conversation?.rounds ?? [],
    context,
    action,
  });

  // Initialize plan state from conversation
  const planState: PlanState = {
    current: conversation?.state?.plan,
  };

  // Build planning tools using the factory pattern
  const planningTools = getPlanningTools({
    eventEmitter,
    planState,
    agentMode: 'planning',
    toolProvider,
    runner,
    request,
  });

  // Add filestore tools if enabled (read-only access for context discovery)
  const filestoreTools = experimentalFeatures.filestore
    ? getStoreTools({ filestore }).map((tool) => builtinToolToExecutable({ tool, runner }))
    : [];

  // Add static tools (planning tools + filestore)
  await toolManager.addTools({
    type: ToolManagerToolType.executable,
    tools: [...planningTools, ...filestoreTools],
    logger,
  });

  const cycleLimit = 10;
  const graphRecursionLimit = getRecursionLimit(cycleLimit);

  const promptFactory = createPlanningPromptFactory({
    existingPlan: planState.current,
    processedConversation,
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

  logger.debug(`Running planning agent with graph: ${planningGraphName}, runId: ${runId}`);

  const eventStream = agentGraph.streamEvents(
    createInitializerCommand({
      conversation: processedConversation,
      agentBuilderToLangchainIdMap: toolManager.getToolIdMapping(),
      cycleLimit,
    }),
    {
      version: 'v2',
      signal: abortSignal,
      runName: planningGraphName,
      metadata: {
        graphName: planningGraphName,
        agentId,
      },
      recursionLimit: graphRecursionLimit,
      callbacks: [],
    }
  );

  const graphEvents$ = from(eventStream).pipe(
    filter(isStreamEvent),
    convertGraphEvents({
      graphName: planningGraphName,
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

  const effectiveOverrides = configurationOverrides ?? pendingRound?.configuration_overrides;

  const events$ = merge(graphEvents$, manualEvents$).pipe(
    addRoundCompleteEvent({
      userInput: processedInput,
      getConversationState: () => getConversationState({ promptManager, toolManager, planState }),
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
      // error will be handled by function return
    },
  });

  const round = await extractRound(events$);
  return { round };
};

const getConversationState = ({
  promptManager,
  toolManager,
  planState,
}: {
  promptManager: PromptManager;
  toolManager: ToolManager;
  planState: PlanState;
}): ConversationInternalState => {
  return {
    prompt: promptManager.dump(),
    dynamic_tool_ids: toolManager.getDynamicToolIds(),
    plan: planState.current,
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
  return cycleLimit * 2 + 8;
};
