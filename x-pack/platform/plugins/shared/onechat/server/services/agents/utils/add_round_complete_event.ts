/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, merge, OperatorFunction, share, toArray } from 'rxjs';
import {
  ChatAgentEvent,
  ChatAgentEventType,
  ConversationRoundStepType,
  isMessageCompleteEvent,
  isToolCallEvent,
  isToolResultEvent,
  RoundCompleteEvent,
  RoundInput,
} from '@kbn/onechat-common';

type SourceEvents = Exclude<ChatAgentEvent, RoundCompleteEvent>;

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
          const toolCalls = events.filter(isToolCallEvent).map((event) => event.data);
          const toolResults = events.filter(isToolResultEvent).map((event) => event.data);
          const messages = events.filter(isMessageCompleteEvent).map((event) => event.data);
          const event: RoundCompleteEvent = {
            type: ChatAgentEventType.roundComplete,
            data: {
              round: {
                userInput,
                steps: toolCalls.map((toolCall) => {
                  const toolResult = toolResults.find(
                    (result) => result.toolCallId === toolCall.toolCallId
                  );
                  return {
                    type: ConversationRoundStepType.toolCall,
                    toolCallId: toolCall.toolCallId,
                    toolId: toolCall.toolId,
                    args: toolCall.args,
                    result: toolResult?.result ?? 'unknown',
                  };
                }),
                assistantResponse: { message: messages[messages.length - 1].messageContent },
              },
            },
          };

          return event;
        })
      )
    );
  };
};
