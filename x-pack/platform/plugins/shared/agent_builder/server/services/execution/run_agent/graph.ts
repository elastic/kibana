/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END as _END_, START as _START_, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import type { Logger } from '@kbn/core/server';
import type { ChatCompleteCacheControl } from '@kbn/inference-common';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { AgentExecutionErrorCode as ErrCodes } from '@kbn/agent-builder-common/agents';
import {
  createAgentExecutionError,
  type AgentBuilderAgentExecutionError,
} from '@kbn/agent-builder-common/base/errors';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import {
  createReasoningEvent,
  createToolCallMessage,
  extractTextContent,
} from '@kbn/agent-builder-genai-utils/langchain';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import {
  ConversationRoundStepType,
  createDeliveredMessageStep,
  createInterimAnswerStep,
  isDeliveredMessageStep,
  isSubagentRosterUpdatedStep,
  isToolCallStep,
  TimelineEventType,
  type ExecutionStepEvent,
  type SubagentRosterEntry,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import type { ResolvedConfiguration } from './types';
import { convertError, isContextLengthError, isRecoverableError } from './utils/errors';
import {
  createContextManagementNodes,
  type ContextManagementDeps,
} from './utils/context_management';
import type { PromptFactory } from './prompts';
import { getRandomThinkingMessage } from './i18n';
import {
  steps,
  tags,
  BACKGROUND_CHECK_CYCLE_INTERVAL,
  BROWSER_TOOL_PREFIX,
  MAX_CONTEXT_RETRY_COUNT,
} from './constants';
import type { BackgroundExecutionService } from './background_execution_service';
import type { StateType, StateUpdate } from './state';
import { StateAnnotation, toCurrentRun } from './state';
import { processResearchResponse, processToolNodeResponse } from './response_processing';
import { createAnswerAgentStructured } from './answer_agent_structured';
import { stepUpdates, type RunStepUpdate } from './step_state';
import type { CycleHookRuntime } from './cycle_hooks/cycle_hook_runtime';
import type { ToolExecutionBuffer } from './run_tracker';
import type { SubagentTracker } from './subagent_tracker';
import type { RunAttachmentEvents } from './run_attachment_events';
import type { ProcessedConversation } from './utils/prepare_conversation';
import type { IncomingMessages } from './incoming_messages';

// number of successive recoverable errors we try to recover from before throwing
const MAX_ERROR_COUNT = 2;

const FORCED_ANSWER_NOTICE =
  'The tool budget for this turn is spent. Answer the user now from what you have, ' +
  'taking into account every message they sent while you worked. Do not call tools.';

export const createAgentGraph = ({
  chatModel,
  toolManager,
  configuration,
  logger,
  events,
  structuredOutput = false,
  outputSchema,
  processedConversation,
  promptFactory,
  backgroundExecutionService,
  subagentTracker,
  toolExecutionBuffer,
  runAttachmentEvents,
  roundId,
  sessionId,
  cacheControl,
  contextManagement,
  cycleHooks,
  incomingMessages,
}: {
  chatModel: InferenceChatModel;
  toolManager: ToolManager;
  configuration: ResolvedConfiguration;
  logger: Logger;
  events: AgentEventEmitter;
  structuredOutput?: boolean;
  outputSchema?: Record<string, unknown>;
  processedConversation: ProcessedConversation;
  promptFactory: PromptFactory;
  backgroundExecutionService?: BackgroundExecutionService;
  subagentTracker?: SubagentTracker;
  /** Buffer of out-of-band tool progress events observed by the runner. */
  toolExecutionBuffer?: ToolExecutionBuffer;
  runAttachmentEvents?: RunAttachmentEvents;
  roundId: string;
  /** Optional session ID forwarded to EIS for prompt-cache scoping. Non-EIS endpoints ignore it. */
  sessionId?: string;
  cacheControl?: ChatCompleteCacheControl;
  contextManagement: Omit<
    ContextManagementDeps,
    'conversation' | 'chatModel' | 'cacheControl' | 'events'
  >;
  /** The execution's cycle hooks, dispatched in their own node before each research model call. */
  cycleHooks?: CycleHookRuntime;
  /** Messages sent to the conversation while this run holds it; drained at every check. */
  incomingMessages?: IncomingMessages;
}) => {
  const contextManagementNodes = createContextManagementNodes({
    ...contextManagement,
    conversation: processedConversation,
    chatModel,
    cacheControl,
    events,
  });

  const init = async (): Promise<StateUpdate> => {
    return {};
  };

  // The first pass of a run checks whatever its cycle, then every BACKGROUND_CHECK_CYCLE_INTERVAL
  // cycles: a resume starts at the paused cycle, and a sub-agent that finished while the round
  // waited on a prompt is reported by the run that answers it.
  let firstPass = true;
  const checkBackgroundWork = async (state: StateType): Promise<StateUpdate> => {
    const due = firstPass || state.currentCycle % BACKGROUND_CHECK_CYCLE_INTERVAL === 0;
    firstPass = false;

    // Find the last tool call group ID for positioning the notices
    const lastToolCallGroupId = [...state.steps].reverse().find(isToolCallStep)?.tool_call_group_id;
    const updates: RunStepUpdate[] = [];

    // Steers are drained on every traversal: a message sent mid-run is read at the next check.
    if (incomingMessages) {
      const delivered = await incomingMessages.drain({
        cycle: state.currentCycle,
        lastToolCallGroupId,
      });
      updates.push(
        ...delivered.map((data) => stepUpdates.append(createDeliveredMessageStep(data)))
      );
    }

    if (backgroundExecutionService?.hasPending() && due) {
      const completions = await backgroundExecutionService.checkForCompletions({
        roundId,
        toolCallGroupId: lastToolCallGroupId,
      });
      updates.push(
        ...completions.map((execution) =>
          stepUpdates.append({
            type: ConversationRoundStepType.backgroundAgentComplete,
            ...execution,
          })
        )
      );
    }

    return updates.length > 0 ? { steps: updates } : {};
  };

  /**
   * Lands what the cycle hooks append in the state as its own super-step, before the model request:
   * the notes are then part of every streamed state, so a fatal research error still keeps them.
   */
  const dispatchCycleHooks = async (state: StateType): Promise<StateUpdate> => {
    if (!cycleHooks) {
      return {};
    }
    const injected = await cycleHooks.dispatch({
      cycle: state.currentCycle,
      attempt: state.errorCount + state.contextRetryCount,
      steps: state.steps,
      summary: state.compactionSummary,
    });
    return injected.length > 0 ? { steps: injected } : {};
  };

  const researchAgent = async (state: StateType): Promise<StateUpdate> => {
    const researcherModel = chatModel.bindTools(toolManager.list()).withConfig({
      tags: [tags.agent, tags.researchAgent],
      sessionId,
      cacheControl,
    });

    if (state.currentCycle === 0 && state.errorCount === 0) {
      events.emit(createReasoningEvent(getRandomThinkingMessage(), { transient: true }));
    }

    const retryUpdate = (error: AgentBuilderAgentExecutionError): StateUpdate => ({
      researchOutcome: { type: 'retry_error', error },
      errorCount: state.errorCount + 1,
      retryNotices: [{ phase: 'research', afterStepCount: state.steps.length, error }],
    });

    try {
      const response = await researcherModel.invoke(
        await promptFactory.getMainPrompt({ run: toCurrentRun(state) })
      );

      const currentCycle = state.currentCycle + 1;
      const turn = processResearchResponse(response, { cycle: currentCycle, toolManager });

      const inputTokens = response.usage_metadata?.input_tokens;
      const usageUpdate: StateUpdate = {
        contextRetryCount: 0,
        lastCallUsage: inputTokens !== undefined ? { inputTokens } : undefined,
      };

      if (turn.outcome.type === 'retry_error') {
        // Successful inference calls can still produce recoverable errors,
        // which must count toward the retry limit.
        return { ...retryUpdate(turn.outcome.error), ...usageUpdate, currentCycle };
      }

      return {
        steps: turn.stepUpdates,
        researchOutcome: turn.outcome,
        toolRenderState: turn.renderState,
        pendingToolCallIds: turn.pendingToolCallIds,
        currentCycle,
        errorCount: 0,
        ...usageUpdate,
      };
    } catch (error) {
      const executionError = convertError(error);
      if (isContextLengthError(executionError)) {
        if (state.contextRetryCount >= MAX_CONTEXT_RETRY_COUNT) {
          throw executionError;
        }
        return {
          researchOutcome: { type: 'context_length_error', error: executionError },
          contextRetryCount: state.contextRetryCount + 1,
        };
      }
      if (isRecoverableError(executionError)) {
        return retryUpdate(executionError);
      } else {
        throw executionError;
      }
    }
  };

  const researchAgentEdge = async (state: StateType) => {
    const outcome = state.researchOutcome;
    if (!outcome) {
      throw invalidState('[researchAgentEdge] missing research outcome');
    }

    if (outcome.type === 'retry_error') {
      if (state.errorCount <= MAX_ERROR_COUNT) {
        return steps.cycleHooks;
      } else {
        // max error count reached, stop execution by throwing
        throw outcome.error;
      }
    } else if (outcome.type === 'context_length_error') {
      return steps.contextManagement;
    } else if (outcome.type === 'tool_calls') {
      const maxCycleReached = state.currentCycle > state.cycleLimit;
      if (maxCycleReached) {
        if (structuredOutput) {
          return steps.prepareToAnswer;
        }
        // A steer never fails the round that picked it up: answer from what the run has.
        if (state.steps.some(isDeliveredMessageStep)) {
          return steps.forcedAnswer;
        }
        throw createAgentExecutionError(
          `Agent exceeded its cycle budget of ${state.cycleLimit} without producing a final answer.`,
          ErrCodes.cycleLimitExceeded,
          {}
        );
      } else {
        return steps.executeTool;
      }
    }
    // handover: the answer is written; a message that arrived meanwhile is read before it ends
    return steps.checkIncomingAfterAnswer;
  };

  /**
   * The last check of a run, after the model answered. A message that arrived while the answer
   * was written is read now and the run continues from that answer, so nothing sent mid-run waits
   * for the next run except what lands after this check. The answer stays as an interim step: the
   * user has read it and the model must see it. Past the cycle budget the run ends as it is.
   */
  const checkIncomingAfterAnswer = async (state: StateType): Promise<StateUpdate> => {
    const outcome = state.researchOutcome;
    if (
      !incomingMessages ||
      outcome?.type !== 'handover' ||
      state.currentCycle > state.cycleLimit
    ) {
      return { continueAfterAnswer: false };
    }
    const lastToolCallGroupId = [...state.steps].reverse().find(isToolCallStep)?.tool_call_group_id;
    const delivered = await incomingMessages.drain({
      cycle: state.currentCycle,
      lastToolCallGroupId,
      afterAnswer: true,
    });
    if (delivered.length === 0) {
      return { continueAfterAnswer: false };
    }
    return {
      continueAfterAnswer: true,
      steps: [
        stepUpdates.append(createInterimAnswerStep({ message: outcome.message })),
        ...delivered.map((data) => stepUpdates.append(createDeliveredMessageStep(data))),
      ],
    };
  };

  const checkIncomingAfterAnswerEdge = async (state: StateType) => {
    if (state.continueAfterAnswer) {
      return steps.contextManagement;
    }
    return structuredOutput ? steps.prepareToAnswer : steps.finalize;
  };

  const executeTool = async (state: StateType): Promise<StateUpdate> => {
    const outcome = state.researchOutcome;
    if (outcome?.type !== 'tool_calls') {
      throw invalidState(
        `[executeTool] expected a "tool_calls" research outcome, got "${outcome?.type}"`
      );
    }

    outcome.toolCalls.forEach((toolCall) => toolManager.recordToolUse(toolCall.toolName));

    // Snapshot the tracker's creation counter before executing the batch.
    const creationsBefore = subagentTracker?.creationCount() ?? 0;

    const toolNode = new ToolNode<BaseMessage[]>(toolManager.list());
    const toolNodeResult = await toolNode.invoke([createToolCallMessage(outcome.toolCalls)], {});

    // The internal tool id of a call: the step stores the stripped id for browser tools, but
    // `tool_result` events use the prefixed one — reconstruct it from the render state.
    const toolIdFor = (toolCallId: string): string => {
      const step = state.steps.find(
        (candidate): candidate is ToolCallStep =>
          isToolCallStep(candidate) && candidate.tool_call_id === toolCallId
      );
      if (!step) {
        throw invalidState(`[executeTool] tool_call_id "${toolCallId}" has no step in the run`);
      }
      return state.toolRenderState[toolCallId]?.kind === 'browser'
        ? `${BROWSER_TOOL_PREFIX}${step.tool_id}`
        : step.tool_id;
    };

    const processed = processToolNodeResponse(toolNodeResult, {
      cycle: state.currentCycle,
      drainProgress: (toolCallId) => toolExecutionBuffer?.drainProgress(toolCallId) ?? [],
      toolIdFor,
    });

    const updates: RunStepUpdate[] = [...processed.stepUpdates];

    if (subagentTracker && subagentTracker.creationCount() > creationsBefore) {
      const roster = subagentTracker.activeRoster(getPriorPurposes(processedConversation));
      updates.push(
        stepUpdates.append({ type: ConversationRoundStepType.subagentRosterUpdated, roster })
      );
    }

    const completed = new Set(processed.completedToolCallIds);
    const attachmentEvents =
      runAttachmentEvents?.drainToolCalls(outcome.toolCalls.map(({ toolCallId }) => toolCallId)) ??
      [];
    return {
      steps: updates,
      toolRenderState: processed.renderState,
      pendingToolCallIds: state.pendingToolCallIds.filter((id) => !completed.has(id)),
      toolOutcome:
        processed.prompts.length > 0
          ? { type: 'interrupted', prompts: processed.prompts }
          : { type: 'completed' },
      attachmentEvents,
    };
  };

  const executeToolEdge = async (state: StateType) => {
    if (state.toolOutcome?.type === 'interrupted') {
      return steps.handleToolInterrupt;
    }
    return steps.checkBackgroundWork;
  };

  const handleToolInterrupt = async (state: StateType): Promise<StateUpdate> => {
    const outcome = state.toolOutcome;
    if (outcome?.type !== 'interrupted') {
      throw invalidState(
        `[handleToolInterrupt] expected an "interrupted" tool outcome, got "${outcome?.type}"`
      );
    }
    return {
      interrupted: true,
      prompts: outcome.prompts.map(({ prompt }) => prompt),
    };
  };

  /**
   * One model call with no tools, in place of the `cycleLimitExceeded` throw when the run picked up
   * a steer. Streams under the research tags so the text reaches the client as the answer.
   */
  const forcedAnswer = async (state: StateType): Promise<StateUpdate> => {
    const answerModel = chatModel.withConfig({
      tags: [tags.agent, tags.researchAgent],
      sessionId,
      cacheControl,
    });
    const prompt = await promptFactory.getMainPrompt({ run: toCurrentRun(state) });
    const response = await answerModel.invoke([...prompt, new HumanMessage(FORCED_ANSWER_NOTICE)]);
    return {
      researchOutcome: { type: 'handover', message: extractTextContent(response), forceful: true },
      currentCycle: state.currentCycle + 1,
    };
  };

  const prepareToAnswer = async (state: StateType): Promise<StateUpdate> => {
    const maxCycleReached = state.currentCycle > state.cycleLimit;

    if (maxCycleReached && state.researchOutcome?.type !== 'handover') {
      return {
        researchOutcome: { type: 'handover', message: '', forceful: true },
      };
    } else {
      return {};
    }
  };

  const answerAgentStructured = createAnswerAgentStructured({
    chatModel,
    promptFactory,
    events,
    outputSchema,
    logger,
  });

  const answerAgentEdge = async (state: StateType) => {
    const outcome = state.answerOutcome;
    if (!outcome) {
      throw invalidState('[answerAgentEdge] missing answer outcome');
    }

    if (outcome.type === 'retry_error') {
      if (state.errorCount <= MAX_ERROR_COUNT) {
        return steps.answerAgent;
      } else {
        // max error count reached, stop execution by throwing
        throw outcome.error;
      }
    }
    return steps.finalize;
  };

  const finalize = async (state: StateType): Promise<StateUpdate> => {
    if (structuredOutput) {
      const outcome = state.answerOutcome;
      if (outcome?.type === 'structured_answer') {
        return { finalAnswer: outcome.data };
      }
      throw invalidState(
        `[finalize] expected structured answer outcome, got ${outcome?.type} instead.`
      );
    }

    // Non-structured: the research agent's terminal handover carries the user-facing answer.
    const outcome = state.researchOutcome;
    if (outcome?.type === 'handover') {
      return { finalAnswer: outcome.message };
    }
    throw invalidState(`[finalize] expected handover outcome, got ${outcome?.type} instead.`);
  };

  const contextManagementEdge = async (state: StateType) =>
    state.compactionRequest ? steps.compactContext : steps.cycleHooks;

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graphBuilder = new StateGraph(StateAnnotation)
    .addNode(steps.init, init)
    .addNode(steps.checkBackgroundWork, checkBackgroundWork)
    .addNode(steps.contextManagement, contextManagementNodes.contextManagement)
    .addNode(steps.compactContext, contextManagementNodes.compactContext)
    .addNode(steps.cycleHooks, dispatchCycleHooks)
    .addNode(steps.researchAgent, researchAgent)
    .addNode(steps.executeTool, executeTool)
    .addNode(steps.handleToolInterrupt, handleToolInterrupt)
    .addNode(steps.checkIncomingAfterAnswer, checkIncomingAfterAnswer)
    .addNode(steps.finalize, finalize)
    .addEdge(_START_, steps.init)
    .addEdge(steps.init, steps.checkBackgroundWork)
    .addEdge(steps.checkBackgroundWork, steps.contextManagement)
    .addConditionalEdges(steps.contextManagement, contextManagementEdge, {
      [steps.compactContext]: steps.compactContext,
      [steps.cycleHooks]: steps.cycleHooks,
    })
    .addEdge(steps.compactContext, steps.cycleHooks)
    .addEdge(steps.cycleHooks, steps.researchAgent)
    .addConditionalEdges(steps.executeTool, executeToolEdge, {
      [steps.checkBackgroundWork]: steps.checkBackgroundWork,
      [steps.handleToolInterrupt]: steps.handleToolInterrupt,
    })
    .addEdge(steps.handleToolInterrupt, _END_)
    .addEdge(steps.finalize, _END_);

  if (structuredOutput) {
    graphBuilder
      .addNode(steps.prepareToAnswer, prepareToAnswer)
      .addNode(steps.answerAgent, answerAgentStructured)
      .addConditionalEdges(steps.researchAgent, researchAgentEdge, {
        [steps.cycleHooks]: steps.cycleHooks,
        [steps.contextManagement]: steps.contextManagement,
        [steps.executeTool]: steps.executeTool,
        [steps.prepareToAnswer]: steps.prepareToAnswer,
        [steps.checkIncomingAfterAnswer]: steps.checkIncomingAfterAnswer,
      })
      .addConditionalEdges(steps.checkIncomingAfterAnswer, checkIncomingAfterAnswerEdge, {
        [steps.contextManagement]: steps.contextManagement,
        [steps.prepareToAnswer]: steps.prepareToAnswer,
      })
      .addEdge(steps.prepareToAnswer, steps.answerAgent)
      .addConditionalEdges(steps.answerAgent, answerAgentEdge, {
        [steps.answerAgent]: steps.answerAgent,
        [steps.finalize]: steps.finalize,
      });
  } else {
    graphBuilder
      .addNode(steps.forcedAnswer, forcedAnswer)
      .addConditionalEdges(steps.researchAgent, researchAgentEdge, {
        [steps.cycleHooks]: steps.cycleHooks,
        [steps.contextManagement]: steps.contextManagement,
        [steps.executeTool]: steps.executeTool,
        [steps.forcedAnswer]: steps.forcedAnswer,
        [steps.checkIncomingAfterAnswer]: steps.checkIncomingAfterAnswer,
      })
      .addConditionalEdges(steps.checkIncomingAfterAnswer, checkIncomingAfterAnswerEdge, {
        [steps.contextManagement]: steps.contextManagement,
        [steps.finalize]: steps.finalize,
      })
      .addEdge(steps.forcedAnswer, steps.finalize);
  }

  return graphBuilder.compile();
};

/**
 * Purpose lookup for entries created in prior rounds (persistent sub-agents
 * whose purpose isn't in this round's tracker). Sourced from the most recent
 * SubagentRosterUpdatedStep across previous rounds.
 */
const getPriorPurposes = (processedConversation: ProcessedConversation): Record<string, string> => {
  const step = processedConversation.timeline
    .filter((event): event is ExecutionStepEvent => event.type === TimelineEventType.executionStep)
    .map((event) => event.data.step)
    .findLast(isSubagentRosterUpdatedStep);

  if (!step) return {};

  return Object.fromEntries(
    step.roster
      .filter((e: SubagentRosterEntry) => e.purpose !== undefined)
      .map((e: SubagentRosterEntry) => [e.name, e.purpose as string])
  );
};

const invalidState = (message: string) => {
  return createAgentExecutionError(message, ErrCodes.invalidState, {});
};
