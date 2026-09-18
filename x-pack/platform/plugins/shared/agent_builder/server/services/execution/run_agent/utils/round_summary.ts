/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BackgroundAgentCompleteEvent,
  ConversationRound,
  ConversationRoundStep,
  ExecutionPartialRunSummary,
  ReasoningEvent,
  RuntimeAgentConfigurationOverrides,
  SubagentRosterUpdatedEvent,
  TodosStep,
  ToolCallEvent,
  ToolCallStep,
  UserQuestionAskedEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStepType,
  TODOS_UPDATED_UI_EVENT,
  carriedOverTodos,
  createAskUserQuestionStep,
  createSubagentRosterUpdatedStep,
  isBackgroundAgentCompleteEvent,
  isReasoningEvent,
  isSubagentRosterUpdatedEvent,
  isToolCallEvent,
  isToolCallStep,
  isToolProgressEvent,
  isToolResultEvent,
  isToolUiEvent,
  isUserQuestionAskedEvent,
  type TodosUpdatedUiEventData,
} from '@kbn/agent-builder-common';
import type { RoundModelUsageStats } from '@kbn/agent-builder-common/chat';
import type { TodoItem } from '@kbn/agent-builder-common/chat/conversation';
import type { ModelProvider, ModelProviderStats } from '@kbn/agent-builder-server/runner';
import { getCurrentTraceId } from '../../../../tracing';
import type { ConvertedEvents } from '../convert_graph_events';
import type { CompactedConversation } from './conversation_compactor';
import type { RelevantSkillSelection } from './relevant_skills/select_relevant_skills';
import {
  createBackgroundAgentStep,
  createPreExecutionSteps,
  createReasoningStep,
  createToolCallStep,
} from './round_steps';

type SourceEvents = ConvertedEvents;

export type StepEvents =
  | ReasoningEvent
  | ToolCallEvent
  | BackgroundAgentCompleteEvent
  | SubagentRosterUpdatedEvent
  | UserQuestionAskedEvent;

export const isStepEvent = (event: SourceEvents): event is StepEvents => {
  return (
    isReasoningEvent(event) ||
    isToolCallEvent(event) ||
    isBackgroundAgentCompleteEvent(event) ||
    isSubagentRosterUpdatedEvent(event) ||
    isUserQuestionAskedEvent(event)
  );
};

/**
 * Builds a round's steps from the events of a run: pre-execution steps (compaction, relevant
 * skills), one step per step event (a tool call without a result yields a step with empty
 * results), then the todos step. Shared by the success path (`round_complete`) and the
 * interruption path (`round_interrupted`), so both persist steps the same way.
 */
export const eventsToSteps = ({
  events,
  compactionResult,
  relevantSkillsSelection,
  initialTodos,
}: {
  events: SourceEvents[];
  compactionResult?: CompactedConversation;
  relevantSkillsSelection?: RelevantSkillSelection;
  initialTodos?: TodoItem[];
}): ConversationRoundStep[] => {
  const toolResults = events.filter(isToolResultEvent);
  const toolProgressions = events.filter(isToolProgressEvent);
  const stepEvents = events.filter(isStepEvent);

  // Collect todos_updated UI events; only the last snapshot is stored as a round step
  const lastTodosData = events.reduce<TodoItem[] | undefined>((last, e) => {
    if (
      isToolUiEvent<typeof TODOS_UPDATED_UI_EVENT, TodosUpdatedUiEventData>(
        e,
        TODOS_UPDATED_UI_EVENT
      )
    ) {
      return e.data.data.todos;
    }
    return last;
  }, undefined);

  const eventToStep = (event: StepEvents): ConversationRoundStep[] => {
    if (isToolCallEvent(event)) {
      const toolCall = event.data;
      const toolResult = toolResults.find(
        (result) => result.data.tool_call_id === toolCall.tool_call_id
      );
      const toolProgress = toolProgressions.filter(
        (progressEvent) => progressEvent.data.tool_call_id === toolCall.tool_call_id
      );

      return [createToolCallStep({ toolCall: event, toolResult, toolProgress })];
    }
    if (isReasoningEvent(event)) {
      if (event.data.transient !== true) {
        return [createReasoningStep(event)];
      } else {
        return [];
      }
    }
    if (isBackgroundAgentCompleteEvent(event)) {
      return [createBackgroundAgentStep(event)];
    }
    if (isSubagentRosterUpdatedEvent(event)) {
      return [createSubagentRosterUpdatedStep({ roster: event.data.roster })];
    }
    if (isUserQuestionAskedEvent(event)) {
      return [
        createAskUserQuestionStep({
          prompt_id: event.data.prompt_id,
          questions: event.data.questions,
          // answers remain undefined; back-filled at resume by userQuestionAnsweredEvent
        }),
      ];
    }
    throw new Error(`Unknown event type: ${(event as any).type}`);
  };

  const steps: ConversationRoundStep[] = createPreExecutionSteps({
    compactionResult,
    relevantSkillsSelection,
  });

  steps.push(...stepEvents.flatMap(eventToStep));

  const todosForStep = lastTodosData ?? carriedOverTodos(initialTodos);
  if (todosForStep !== undefined) {
    const todosStep: TodosStep = {
      type: ConversationRoundStepType.updateTodos,
      todos: todosForStep,
      ...(lastTodosData === undefined ? { carried_over: true } : {}),
    };
    steps.push(todosStep);
  }

  return steps;
};

/**
 * A resume re-runs the paused tool calls; synthesizes their resolved steps (result + progression)
 * from the replayed graph events so they can be persisted as the resume execution's own steps. The
 * paused tool-call step position/params come from `pendingRound`; the resolved result from here.
 */
export const resolvePausedToolCallSteps = (
  pendingRound: ConversationRound,
  events: SourceEvents[]
): ToolCallStep[] =>
  pendingRound.steps
    .filter(isToolCallStep)
    .filter((step) => step.results.length === 0)
    .map((step) => {
      const toolResults = events
        .filter(isToolResultEvent)
        .filter(({ data }) => data.tool_call_id === step.tool_call_id);
      const toolProgressions = events
        .filter(isToolProgressEvent)
        .filter(({ data }) => data.tool_call_id === step.tool_call_id);
      return {
        ...step,
        results: toolResults.flatMap(({ data }) => data.results),
        progression: toolProgressions.map(({ data }) => data),
      };
    });

export const getModelUsage = (
  stats: ModelProviderStats,
  mainConnectorId: string
): RoundModelUsageStats => {
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;
  let hasCachedInputTokens = false;
  for (const call of stats.calls) {
    inputTokens += call.tokens?.prompt ?? 0;
    outputTokens += call.tokens?.completion ?? 0;
    if (call.tokens?.cached !== undefined) {
      cachedInputTokens += call.tokens.cached;
      hasCachedInputTokens = true;
    }
  }
  const modelFromResponse = stats.calls.find(
    (call) => call.connectorId === mainConnectorId && call.model
  )?.model;

  return {
    connector_id: mainConnectorId,
    llm_calls: stats.calls.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    ...(hasCachedInputTokens ? { cached_input_tokens: cachedInputTokens } : {}),
    ...(modelFromResponse ? { model: modelFromResponse } : {}),
  };
};

/**
 * Steps and partial run summary of an execution that did not complete. Mirrors the success path:
 * on a fresh round the steps include compaction / relevant-skills / todos bookkeeping; on a resume
 * they lead with the resolved paused tool calls and skip relevant skills and todos, exactly as
 * `resumeRound` → `createRound` does.
 */
export const buildInterruptedRound = ({
  events,
  pendingRound,
  startTime,
  endTime,
  modelProvider,
  mainConnectorId,
  configurationOverrides,
  compactionResult,
  relevantSkillsSelection,
  initialTodos,
}: {
  events: SourceEvents[];
  pendingRound: ConversationRound | undefined;
  startTime: Date;
  endTime: Date;
  modelProvider: ModelProvider;
  mainConnectorId: string;
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
  compactionResult?: CompactedConversation;
  relevantSkillsSelection?: RelevantSkillSelection;
  initialTodos?: TodoItem[];
}): { steps: ConversationRoundStep[]; summary: ExecutionPartialRunSummary } => {
  const ownSteps = eventsToSteps({
    events,
    compactionResult,
    relevantSkillsSelection: pendingRound ? undefined : relevantSkillsSelection,
    initialTodos: pendingRound ? undefined : initialTodos,
  });
  const steps = pendingRound
    ? [...resolvePausedToolCallSteps(pendingRound, events), ...ownSteps]
    : ownSteps;
  const traceId = getCurrentTraceId();
  return {
    steps,
    summary: {
      model_usage: getModelUsage(modelProvider.getUsageStats(), mainConnectorId),
      time_to_last_token: endTime.getTime() - startTime.getTime(),
      ...(traceId ? { trace_id: traceId } : {}),
      ...(configurationOverrides ? { configuration_overrides: configurationOverrides } : {}),
    },
  };
};
