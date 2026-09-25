/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END as _END_, START as _START_, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { BaseMessage } from '@langchain/core/messages';
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
} from '@kbn/agent-builder-genai-utils/langchain';
import type { TodoStateManager, ToolManager } from '@kbn/agent-builder-server/runner';
import {
  ConversationRoundStepType,
  isSubagentRosterUpdatedStep,
  isToolCallStep,
  TimelineEventType,
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
import { countNonTodosSteps, stepUpdates, type RunStepUpdate } from './step_state';
import type { ToolExecutionBuffer } from './run_tracker';
import type { SubagentTracker } from './subagent_tracker';
import type { ProcessedConversation } from './utils/prepare_conversation';

// number of successive recoverable errors we try to recover from before throwing
const MAX_ERROR_COUNT = 2;

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
  todoStateManager,
  roundId,
  sessionId,
  cacheControl,
  contextManagement,
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
  /** Buffer of out-of-band tool events (progress, todos writes) observed by the runner. */
  toolExecutionBuffer?: ToolExecutionBuffer;
  /** Authoritative view of the todos written by the `todo_write` tool during this run. */
  todoStateManager?: TodoStateManager;
  roundId: string;
  /** Optional session ID forwarded to EIS for prompt-cache scoping. Non-EIS endpoints ignore it. */
  sessionId?: string;
  cacheControl?: ChatCompleteCacheControl;
  contextManagement: Omit<
    ContextManagementDeps,
    'conversation' | 'chatModel' | 'cacheControl' | 'events'
  >;
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

  const checkBackgroundWork = async (state: StateType): Promise<StateUpdate> => {
    // Only check at the beginning (cycle 0) and every BACKGROUND_CHECK_CYCLE_INTERVAL cycles
    if (
      !backgroundExecutionService ||
      !backgroundExecutionService.hasPending() ||
      (state.currentCycle > 0 && state.currentCycle % BACKGROUND_CHECK_CYCLE_INTERVAL !== 0)
    ) {
      return {};
    }

    // Find the last tool call group ID for positioning the completion notice
    const lastToolCallGroupId = [...state.steps].reverse().find(isToolCallStep)?.tool_call_group_id;

    const completions = await backgroundExecutionService.checkForCompletions({
      roundId,
      toolCallGroupId: lastToolCallGroupId,
    });

    return {
      steps: completions.map((execution) =>
        stepUpdates.append({
          type: ConversationRoundStepType.backgroundAgentComplete,
          ...execution,
        })
      ),
    };
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
      retryNotices: [
        { phase: 'research', afterNonTodosStepCount: countNonTodosSteps(state.steps), error },
      ],
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
        return steps.researchAgent;
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
        throw createAgentExecutionError(
          `Agent exceeded its cycle budget of ${state.cycleLimit} without producing a final answer.`,
          ErrCodes.cycleLimitExceeded,
          {}
        );
      } else {
        return steps.executeTool;
      }
    }
    // handover
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

    const writtenTodos = toolExecutionBuffer?.consumeTodosWrite();
    if (writtenTodos !== undefined) {
      // Prefer the manager's view (authoritative), fall back to the event payload.
      const todos = todoStateManager?.get() ?? writtenTodos;
      updates.push(stepUpdates.setTodos({ type: ConversationRoundStepType.updateTodos, todos }));
    }

    const completed = new Set(processed.completedToolCallIds);
    return {
      steps: updates,
      toolRenderState: processed.renderState,
      pendingToolCallIds: state.pendingToolCallIds.filter((id) => !completed.has(id)),
      toolOutcome:
        processed.prompts.length > 0
          ? { type: 'interrupted', prompts: processed.prompts }
          : { type: 'completed' },
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
    state.compactionRequest ? steps.compactContext : steps.researchAgent;

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graphBuilder = new StateGraph(StateAnnotation)
    .addNode(steps.init, init)
    .addNode(steps.checkBackgroundWork, checkBackgroundWork)
    .addNode(steps.contextManagement, contextManagementNodes.contextManagement)
    .addNode(steps.compactContext, contextManagementNodes.compactContext)
    .addNode(steps.researchAgent, researchAgent)
    .addNode(steps.executeTool, executeTool)
    .addNode(steps.handleToolInterrupt, handleToolInterrupt)
    .addNode(steps.finalize, finalize)
    .addEdge(_START_, steps.init)
    .addEdge(steps.init, steps.checkBackgroundWork)
    .addEdge(steps.checkBackgroundWork, steps.contextManagement)
    .addConditionalEdges(steps.contextManagement, contextManagementEdge, {
      [steps.compactContext]: steps.compactContext,
      [steps.researchAgent]: steps.researchAgent,
    })
    .addEdge(steps.compactContext, steps.researchAgent)
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
        [steps.researchAgent]: steps.researchAgent,
        [steps.contextManagement]: steps.contextManagement,
        [steps.executeTool]: steps.executeTool,
        [steps.prepareToAnswer]: steps.prepareToAnswer,
      })
      .addEdge(steps.prepareToAnswer, steps.answerAgent)
      .addConditionalEdges(steps.answerAgent, answerAgentEdge, {
        [steps.answerAgent]: steps.answerAgent,
        [steps.finalize]: steps.finalize,
      });
  } else {
    graphBuilder.addConditionalEdges(steps.researchAgent, researchAgentEdge, {
      [steps.researchAgent]: steps.researchAgent,
      [steps.contextManagement]: steps.contextManagement,
      [steps.executeTool]: steps.executeTool,
      [steps.finalize]: steps.finalize,
    });
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
    .flatMap((event) => (event.type === TimelineEventType.executionStep ? [event.data.step] : []))
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
