/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, merge, OperatorFunction, share, toArray } from 'rxjs';
import {
  ChatAgentEvent,
  ChatEventType,
  ConversationRoundStepType,
  isMessageCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
  isReasoningEvent,
  RoundCompleteEvent,
  RoundInput,
  ConversationRound,
  ConversationRoundStep,
  ReasoningEvent,
  ToolCallEvent,
} from '@kbn/onechat-common';

type SourceEvents = Exclude<ChatAgentEvent, RoundCompleteEvent>;

type StepEvents = ReasoningEvent | ToolCallEvent;

const isStepEvent = (event: SourceEvents): event is StepEvents => {
  return isReasoningEvent(event) || isToolCallEvent(event);
};

export const addRoundCompleteEvent = ({
  userInput,
}: {
  userInput: RoundInput;
}): OperatorFunction<SourceEvents, SourceEvents | RoundCompleteEvent> => {
  return (events$) => {
    const shared$ = events$.pipe(share());
    return merge(
      shared$,
      shared$.pipe(
        toArray(),
        map<SourceEvents[], RoundCompleteEvent>((events) => {
          const round = createRoundFromEvents({ events, input: userInput });

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
}: {
  events: SourceEvents[];
  input: RoundInput;
}): ConversationRound => {
  const toolResults = events.filter(isToolResultEvent).map((event) => event.data);
  const messages = events.filter(isMessageCompleteEvent).map((event) => event.data);
  const stepEvents = events.filter(isStepEvent);

  const eventToStep = (event: StepEvents): ConversationRoundStep => {
    if (isToolCallEvent(event)) {
      const toolCall = event.data;
      const toolResult = toolResults.find(
        (result) => result.tool_call_id === toolCall.tool_call_id
      );
      return {
        type: ConversationRoundStepType.toolCall,
        tool_call_id: toolCall.tool_call_id,
        tool_id: toolCall.tool_id,
        params: toolCall.params,
        result: toolResult?.result ?? 'unknown',
      };
    }
    if (isReasoningEvent(event)) {
      return {
        type: ConversationRoundStepType.reasoning,
        reasoning: event.data.reasoning,
      };
    }
    throw new Error(`Unknown event type: ${(event as any).type}`);
  };

  const round: ConversationRound = {
    input,
    steps: stepEvents.map(eventToStep),
    response: { message: messages[messages.length - 1].message_content },
  };

  return round;
};
