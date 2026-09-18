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
  ExecutionTerminatedEvent,
  PromptResponseEvent,
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
  isExecutionStartedEvent,
  isExecutionTerminatedEvent,
} from '@kbn/agent-builder-common';
import {
  createAskUserQuestionStep,
  createReasoningStep,
  createToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents';

export interface ActiveExecutionDraft {
  status: 'running' | 'awaiting_prompt' | 'completed';
  steps: ConversationRoundStep[];
  /** Accumulated assistant message text. */
  message: string;
  timeToFirstToken?: number;
  pendingPrompts?: PromptRequest[];
  /** Execution id from the SSE execution_started event - matches the persisted execution_id. */
  executionId?: string;
  /** Id of the saved content event that triggered this execution (user message or prompt response). */
  triggerEventId?: string;
  /** ISO timestamp from the SSE execution_started event. */
  startedAt?: string;
  /** Terminal event stored when the draft is sealed (status === 'completed'). */
  terminalEvent?: ExecutionTerminatedEvent;
  promptResponse?: PromptResponseEvent;
}

const emptyActiveExecution = (): ActiveExecutionDraft => ({
  status: 'running',
  steps: [],
  message: '',
});

export const withPromptResponse = (
  state: ActiveExecutionDraft | null,
  promptResponse: PromptResponseEvent
): ActiveExecutionDraft => ({ ...(state ?? emptyActiveExecution()), promptResponse });

export const activeExecutionReducer = (
  state: ActiveExecutionDraft | null,
  event: ChatEvent
): ActiveExecutionDraft | null => {
  const draft =
    state === null || state.status === 'completed'
      ? {
          ...emptyActiveExecution(),
          ...(state?.promptResponse ? { promptResponse: state.promptResponse } : {}),
        }
      : state;

  if (isReasoningEvent(event)) {
    if (event.data.transient) {
      return state;
    }
    return {
      ...draft,
      message: '',
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
    const { prompt } = event.data;
    return {
      ...draft,
      status: 'awaiting_prompt',
      pendingPrompts: [...(draft.pendingPrompts ?? []), prompt],
      steps: isAskUserQuestionPrompt(prompt)
        ? [
            ...draft.steps,
            createAskUserQuestionStep({ prompt_id: prompt.id, questions: prompt.questions }),
          ]
        : draft.steps,
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

  if (isExecutionStartedEvent(event)) {
    return {
      ...draft,
      ...(event.execution_id ? { executionId: event.execution_id } : {}),
      ...(event.trigger_event_id ? { triggerEventId: event.trigger_event_id } : {}),
      startedAt: event.created_at,
    };
  }

  if (isExecutionTerminatedEvent(event)) {
    const pendingPrompts =
      event.data.outcome.type === 'prompt_requested' ? event.data.outcome.prompts : undefined;
    return {
      ...draft,
      status: 'completed',
      terminalEvent: event,
      pendingPrompts,
      ...(draft.executionId ? {} : event.execution_id ? { executionId: event.execution_id } : {}),
      ...(draft.triggerEventId
        ? {}
        : event.trigger_event_id
        ? { triggerEventId: event.trigger_event_id }
        : {}),
      ...(draft.startedAt ? {} : { startedAt: event.created_at }),
    };
  }

  return state;
};
