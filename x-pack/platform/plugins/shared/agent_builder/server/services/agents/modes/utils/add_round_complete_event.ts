/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { OperatorFunction } from 'rxjs';
import { map, merge, share, toArray } from 'rxjs';
import type {
  RoundCompleteEvent,
  RoundInput,
  ConversationRound,
  ConversationRoundStep,
  ReasoningEvent,
  ToolCallEvent,
  ReasoningStep,
  ToolCallStep,
  ToolProgressEvent,
  ToolResultEvent,
} from '@kbn/agent-builder-common';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import {
  ChatEventType,
  ConversationRoundStepType,
  ConversationRoundStatus,
  isMessageCompleteEvent,
  isThinkingCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
  isToolProgressEvent,
  isPromptRequestEvent,
  isReasoningEvent,
  isToolCallStep,
} from '@kbn/agent-builder-common';
import type {
  ConversationInternalState,
  RoundModelUsageStats,
} from '@kbn/agent-builder-common/chat';
import type {
  ConversationStateManager,
  ModelProvider,
  ModelProviderStats,
} from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getCurrentTraceId } from '../../../../tracing';
import type { ConvertedEvents } from '../default/convert_graph_events';
import { isFinalStateEvent } from '../default/events';

type SourceEvents = ConvertedEvents;

type StepEvents = ReasoningEvent | ToolCallEvent;

const isStepEvent = (event: SourceEvents): event is StepEvents => {
  return isReasoningEvent(event) || isToolCallEvent(event);
};

export const addRoundCompleteEvent = ({
  pendingRound,
  userInput,
  startTime,
  endTime,
  getConversationState,
  modelProvider,
  stateManager,
  attachmentStateManager,
}: {
  pendingRound: ConversationRound | undefined;
  userInput: RoundInput;
  startTime: Date;
  modelProvider: ModelProvider;
  stateManager: ConversationStateManager;
  getConversationState: () => ConversationInternalState;
  attachmentStateManager: AttachmentStateManager;
  endTime?: Date;
}): OperatorFunction<SourceEvents, SourceEvents | RoundCompleteEvent> => {
  return (events$) => {
    const shared$ = events$.pipe(share());
    return merge(
      shared$,
      shared$.pipe(
        toArray(),
        map<SourceEvents[], RoundCompleteEvent>((events) => {
          const round = pendingRound
            ? resumeRound({
                pendingRound,
                events,
                input: userInput,
                startTime,
                endTime,
                modelProvider,
              })
            : createRound({
                events,
                input: userInput,
                startTime,
                endTime,
                modelProvider,
              });

          round.state = buildRoundState({ round, events, stateManager });

          const event: RoundCompleteEvent = {
            type: ChatEventType.roundComplete,
            data: {
              round,
              resumed: pendingRound !== undefined,
              conversation_state: getConversationState(),
              attachments: attachmentStateManager.getAll(),
            },
          };

          return event;
        })
      )
    );
  };
};

const resumeRound = ({
  pendingRound,
  events,
  input,
  startTime,
  endTime = new Date(),
  modelProvider,
}: {
  pendingRound: ConversationRound;
  events: SourceEvents[];
  input: RoundInput;
  startTime: Date;
  endTime?: Date;
  modelProvider: ModelProvider;
}): ConversationRound => {
  // resuming / replaying tool events for the pending step
  const lastStep = pendingRound.steps[pendingRound.steps.length - 1];
  if (isToolCallStep(lastStep) && lastStep.results.length === 0) {
    const toolCallId = lastStep.tool_call_id;
    const toolResults = events
      .filter(isToolResultEvent)
      .filter(({ data }) => data.tool_call_id === toolCallId);
    const toolProgressions = events
      .filter(isToolProgressEvent)
      .filter(({ data }) => data.tool_call_id === toolCallId);

    lastStep.results = toolResults.flatMap(({ data }) => data.results);
    lastStep.progression = [
      ...(lastStep.progression ?? []),
      ...toolProgressions.map(({ data }) => data),
    ];
  }

  const followUp = createRound({
    events,
    input,
    startTime,
    endTime,
    modelProvider,
  });

  return mergeRounds(pendingRound, followUp);
};

const mergeRounds = (previous: ConversationRound, next: ConversationRound): ConversationRound => {
  let traceId: string[] | undefined;
  if (previous.trace_id || next.trace_id) {
    traceId = [
      ...(previous.trace_id
        ? Array.isArray(previous.trace_id)
          ? previous.trace_id
          : [previous.trace_id]
        : []),
      ...(next.trace_id ? (Array.isArray(next.trace_id) ? next.trace_id : [next.trace_id]) : []),
    ];
  }

  const mergedRound: ConversationRound = {
    id: previous.id,
    status: next.status,
    pending_prompt: next.pending_prompt,
    state: undefined, // state is recomputed after the merge
    input: previous.input,
    steps: [...previous.steps, ...next.steps],
    trace_id: traceId,
    started_at: previous.started_at,
    time_to_first_token: previous.time_to_first_token + next.time_to_first_token,
    time_to_last_token: previous.time_to_last_token + next.time_to_last_token,
    model_usage: mergeModelUsage(previous.model_usage, next.model_usage),
    response: next.response,
  };

  return mergedRound;
};

const createRound = ({
  events,
  input,
  startTime,
  endTime = new Date(),
  modelProvider,
}: {
  events: SourceEvents[];
  input: RoundInput;
  startTime: Date;
  endTime?: Date;
  modelProvider: ModelProvider;
}): ConversationRound => {
  const toolResults = events.filter(isToolResultEvent);
  const toolProgressions = events.filter(isToolProgressEvent);
  const messages = events.filter(isMessageCompleteEvent).map((event) => event.data);
  const stepEvents = events.filter(isStepEvent);
  const thinkingCompleteEvent = events.find(isThinkingCompleteEvent);
  const promptRequestEvents = events.filter(isPromptRequestEvent);

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
    throw new Error(`Unknown event type: ${(event as any).type}`);
  };

  const lastMessage = messages.length ? messages[messages.length - 1] : undefined;
  const promptRequest = promptRequestEvents.length ? promptRequestEvents[0] : undefined;

  if (!lastMessage && !promptRequest) {
    throw new Error('No response event found in round events');
  }

  const timeToLastToken = endTime.getTime() - startTime.getTime();
  const timeToFirstToken = thinkingCompleteEvent
    ? thinkingCompleteEvent.data.time_to_first_token
    : timeToLastToken;

  const round: ConversationRound = {
    id: uuidv4(),
    status: promptRequest
      ? ConversationRoundStatus.awaitingPrompt
      : ConversationRoundStatus.completed,
    pending_prompt: promptRequest ? promptRequest.data.prompt : undefined,
    state: undefined,
    input,
    steps: stepEvents.flatMap(eventToStep),
    trace_id: getCurrentTraceId(),
    started_at: startTime.toISOString(),
    time_to_first_token: timeToFirstToken,
    time_to_last_token: timeToLastToken,
    model_usage: getModelUsage(modelProvider.getUsageStats()),
    response: lastMessage
      ? {
          message: lastMessage.message_content,
          structured_output: lastMessage.structured_output,
        }
      : { message: '' },
  };

  return round;
};

const createReasoningStep = (event: ReasoningEvent): ReasoningStep => {
  return {
    type: ConversationRoundStepType.reasoning,
    reasoning: event.data.reasoning,
  };
};

const createToolCallStep = ({
  toolCall,
  toolResult,
  toolProgress,
}: {
  toolCall: ToolCallEvent;
  toolProgress: ToolProgressEvent[];
  toolResult?: ToolResultEvent;
}): ToolCallStep => {
  return {
    type: ConversationRoundStepType.toolCall,
    tool_id: toolCall.data.tool_id,
    params: toolCall.data.params,
    tool_call_id: toolCall.data.tool_call_id,
    progression: toolProgress.map(({ data: { message } }) => ({ message })),
    results: toolResult?.data.results ?? [],
  };
};

const getModelUsage = (stats: ModelProviderStats): RoundModelUsageStats => {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const call of stats.calls) {
    inputTokens += call.tokens?.prompt ?? 0;
    outputTokens += call.tokens?.completion ?? 0;
  }
  const modelFromResponse = stats.calls.find((call) => call.model)?.model;

  return {
    // we don't support multi-models yet, so we can just pick from the first call
    connector_id: stats.calls.length ? stats.calls[0].connectorId : 'unknown',
    llm_calls: stats.calls.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    ...(modelFromResponse ? { model: modelFromResponse } : {}),
  };
};

const buildRoundState = ({
  round,
  events,
  stateManager,
}: {
  round: ConversationRound;
  events: SourceEvents[];
  stateManager: ConversationStateManager;
}): RoundState | undefined => {
  const finalGraphState = events.find(isFinalStateEvent)!.data.state;
  const promptRequestEvents = events.filter(isPromptRequestEvent).map((event) => event.data);

  if (promptRequestEvents.length === 0) {
    return undefined;
  }

  const promptRequest = promptRequestEvents[0];
  const toolCallId = promptRequest.source.tool_call_id;
  const toolCall = round.steps
    .filter(isToolCallStep)
    .find((step) => step.tool_call_id === toolCallId);

  if (!toolCall) {
    throw new Error(`Could not find tool call with id ${toolCallId} in round steps`);
  }

  const toolState = stateManager
    .getToolStateManager({ toolId: toolCall.tool_id, toolCallId })
    .getState();

  const state: RoundState = {
    version: 1,
    agent: {
      current_cycle: finalGraphState.currentCycle ?? 0,
      error_count: finalGraphState.errorCount ?? 0,
      node: {
        step: 'execute_tool',
        tool_call_id: toolCallId,
        tool_id: toolCall.tool_id,
        tool_params: toolCall.params,
        tool_state: toolState,
      },
    },
  };

  return state;
};

const mergeModelUsage = (
  a: RoundModelUsageStats,
  b: RoundModelUsageStats
): RoundModelUsageStats => {
  return {
    connector_id: a.connector_id,
    llm_calls: a.llm_calls + b.llm_calls,
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    model: a.model ?? b.model,
  };
};
