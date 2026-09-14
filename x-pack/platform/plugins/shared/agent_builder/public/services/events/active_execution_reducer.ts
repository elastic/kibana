/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatEvent,
  ConversationRoundStep,
  CompactionStep,
  BackgroundAgentCompleteStep,
  TodosStep,
} from '@kbn/agent-builder-common';
import {
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isReasoningEvent,
  isThinkingCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
  isToolProgressEvent,
  isPromptRequestEvent,
  isCompactionStartedEvent,
  isCompactionCompletedEvent,
  isBackgroundAgentCompleteEvent,
  isTodosUpdatedEvent,
  isToolCallStep,
  isCompactionStep,
  findTodosStep,
  ConversationRoundStepType,
} from '@kbn/agent-builder-common';
import {
  createReasoningStep,
  createToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';

export interface ActiveExecutionDraft {
  status: 'running' | 'awaiting_prompt';
  steps: ConversationRoundStep[];
  /** Accumulated assistant message text. */
  message: string;
  /** Reasoning marked `transient` - shown live, never persisted as a step. */
  transientReasoning?: string;
  timeToFirstToken?: number;
  pendingPrompts?: PromptRequest[];
}

const emptyActiveExecution = (): ActiveExecutionDraft => ({
  status: 'running',
  steps: [],
  message: '',
});

export const activeExecutionReducer = (
  state: ActiveExecutionDraft | null,
  event: ChatEvent
): ActiveExecutionDraft | null => {
  const draft = state ?? emptyActiveExecution();

  if (isReasoningEvent(event)) {
    if (event.data.transient) {
      return { ...draft, transientReasoning: event.data.reasoning };
    }
    return {
      ...draft,
      message: '',
      transientReasoning: undefined,
      steps: [
        ...draft.steps,
        createReasoningStep({
          reasoning: event.data.reasoning,
          tool_call_id: event.data.tool_call_id,
          tool_call_group_id: event.data.tool_call_group_id,
        }),
      ],
    };
  }

  if (isMessageChunkEvent(event)) {
    return {
      ...draft,
      transientReasoning: undefined,
      message: draft.message + event.data.text_chunk,
    };
  }

  if (isMessageCompleteEvent(event)) {
    return { ...draft, message: event.data.message_content };
  }

  if (isThinkingCompleteEvent(event)) {
    return { ...draft, timeToFirstToken: event.data.time_to_first_token };
  }

  if (isToolCallEvent(event)) {
    return {
      ...draft,
      steps: [
        ...draft.steps,
        createToolCallStep({
          params: event.data.params,
          results: [],
          tool_call_id: event.data.tool_call_id,
          tool_id: event.data.tool_id,
          tool_call_group_id: event.data.tool_call_group_id,
          tool_origin: event.data.tool_origin,
        }),
      ],
    };
  }

  if (isToolProgressEvent(event)) {
    const { tool_call_id: toolCallId, message, metadata } = event.data;
    return {
      ...draft,
      steps: draft.steps.map((step) =>
        isToolCallStep(step) && step.tool_call_id === toolCallId
          ? {
              ...step,
              progression: [...(step.progression ?? []), { message, metadata: metadata ?? {} }],
            }
          : step
      ),
    };
  }

  if (isToolResultEvent(event)) {
    const { tool_call_id: toolCallId, results } = event.data;
    return {
      ...draft,
      steps: draft.steps.map((step) =>
        isToolCallStep(step) && step.tool_call_id === toolCallId ? { ...step, results } : step
      ),
    };
  }

  if (isPromptRequestEvent(event)) {
    return {
      ...draft,
      status: 'awaiting_prompt',
      pendingPrompts: [...(draft.pendingPrompts ?? []), event.data.prompt],
    };
  }

  if (isCompactionStartedEvent(event)) {
    const step: CompactionStep = {
      type: ConversationRoundStepType.compaction,
      summarized_round_count: 0,
      token_count_before: event.data.token_count_before,
      token_count_after: 0,
    };
    return { ...draft, steps: [...draft.steps, step] };
  }

  if (isCompactionCompletedEvent(event)) {
    const { token_count_after: tokenCountAfter, summarized_round_count: summarizedRoundCount } =
      event.data;
    // Patch the most recent compaction step - the one the matching `compaction_started` just added.
    const steps = [...draft.steps];
    for (let index = steps.length - 1; index >= 0; index--) {
      const step = steps[index];
      if (isCompactionStep(step)) {
        steps[index] = {
          ...step,
          token_count_after: tokenCountAfter,
          summarized_round_count: summarizedRoundCount,
        };
        break;
      }
    }
    return { ...draft, steps };
  }

  if (isBackgroundAgentCompleteEvent(event)) {
    const step: BackgroundAgentCompleteStep = {
      type: ConversationRoundStepType.backgroundAgentComplete,
      ...event.data.execution,
    };
    return { ...draft, steps: [...draft.steps, step] };
  }

  if (isTodosUpdatedEvent(event)) {
    const { todos } = event.data.data;
    const existing = findTodosStep(draft.steps);
    const steps = existing
      ? draft.steps.map((step) =>
          step === existing ? { ...existing, todos, carried_over: false } : step
        )
      : [...draft.steps, { type: ConversationRoundStepType.updateTodos, todos } as TodosStep];
    return { ...draft, steps };
  }

  return state;
};
