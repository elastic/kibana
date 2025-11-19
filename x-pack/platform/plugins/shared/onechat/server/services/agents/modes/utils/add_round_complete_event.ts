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
  ChatAgentEvent,
  RoundCompleteEvent,
  RoundInput,
  ConversationRound,
  ConversationRoundStep,
  ReasoningEvent,
  ToolCallEvent,
} from '@kbn/onechat-common';
import {
  ChatEventType,
  ConversationRoundStepType,
  isMessageCompleteEvent,
  isThinkingCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
  isToolProgressEvent,
  isReasoningEvent,
} from '@kbn/onechat-common';
import type { RoundModelUsageStats } from '@kbn/onechat-common/chat';
import type { ModelProvider, ModelProviderStats } from '@kbn/onechat-server/runner';
import { getCurrentTraceId } from '../../../../tracing';

type SourceEvents = ChatAgentEvent;

type StepEvents = ReasoningEvent | ToolCallEvent;

const isStepEvent = (event: SourceEvents): event is StepEvents => {
  return isReasoningEvent(event) || isToolCallEvent(event);
};

export const addRoundCompleteEvent = ({
  userInput,
  startTime,
  endTime,
  modelProvider,
}: {
  userInput: RoundInput;
  startTime: Date;
  modelProvider: ModelProvider;
  endTime?: Date;
}): OperatorFunction<SourceEvents, SourceEvents | RoundCompleteEvent> => {
  return (events$) => {
    const shared$ = events$.pipe(share());
    return merge(
      shared$,
      shared$.pipe(
        toArray(),
        map<SourceEvents[], RoundCompleteEvent>((events) => {
          const round = createRoundFromEvents({
            events,
            input: userInput,
            startTime,
            endTime,
            modelProvider,
          });

          const event: RoundCompleteEvent = {
            type: ChatEventType.roundComplete,
            data: {
              round,
            },
          };

          return event;
        })
      )
    );
  };
};

const createRoundFromEvents = ({
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
  const toolResults = events.filter(isToolResultEvent).map((event) => event.data);
  const toolProgressions = events.filter(isToolProgressEvent).map((event) => event.data);
  const messages = events.filter(isMessageCompleteEvent).map((event) => event.data);
  const stepEvents = events.filter(isStepEvent);
  const thinkingCompleteEvent = events.find(isThinkingCompleteEvent);

  const timeToLastToken = endTime.getTime() - startTime.getTime();
  const timeToFirstToken = thinkingCompleteEvent
    ? thinkingCompleteEvent.data.time_to_first_token
    : 0;

  const eventToStep = (event: StepEvents): ConversationRoundStep[] => {
    if (isToolCallEvent(event)) {
      const toolCall = event.data;

      const toolResult = toolResults.find(
        (result) => result.tool_call_id === toolCall.tool_call_id
      );

      const toolProgress = toolProgressions
        .filter((progressEvent) => progressEvent.tool_call_id === toolCall.tool_call_id)
        .map((progress) => ({
          message: progress.message,
        }));

      return [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: toolCall.tool_call_id,
          tool_id: toolCall.tool_id,
          progression: toolProgress,
          params: toolCall.params,
          results: toolResult?.results ?? [],
        },
      ];
    }
    if (isReasoningEvent(event)) {
      if (event.data.transient !== true) {
        return [
          {
            type: ConversationRoundStepType.reasoning,
            reasoning: event.data.reasoning,
          },
        ];
      } else {
        return [];
      }
    }
    throw new Error(`Unknown event type: ${(event as any).type}`);
  };

  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    throw new Error('No message complete event found in round events');
  }

  const responseMessage =
    typeof lastMessage.message_content === 'object' && lastMessage.message_content !== null
      ? { message: '', structured_response: lastMessage.message_content }
      : { message: lastMessage.message_content };

  const round: ConversationRound = {
    id: uuidv4(),
    input,
    steps: stepEvents.flatMap(eventToStep),
    trace_id: getCurrentTraceId(),
    started_at: startTime.toISOString(),
    time_to_first_token: timeToFirstToken,
    time_to_last_token: timeToLastToken,
    model_usage: getModelUsage(modelProvider.getUsageStats()),
    response: responseMessage,
  };

  return round;
};

const getModelUsage = (stats: ModelProviderStats): RoundModelUsageStats => {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const call of stats.calls) {
    inputTokens += call.tokens?.prompt ?? 0;
    outputTokens += call.tokens?.completion ?? 0;
  }

  return {
    // we don't support multi-models yet, so we can just pick from the first call
    connector_id: stats.calls.length ? stats.calls[0].connectorId : 'unknown',
    llm_calls: stats.calls.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  };
};
