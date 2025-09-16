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
  isToolCallEvent,
  isToolResultEvent,
  isToolProgressEvent,
  isReasoningEvent,
} from '@kbn/onechat-common';
import { pruneContentReferences } from '@kbn/elastic-assistant-common';
import type { ContentReferencesStore } from '@kbn/elastic-assistant-common';
import { getCurrentTraceId } from '../../../../tracing';

type SourceEvents = ChatAgentEvent;

type StepEvents = ReasoningEvent | ToolCallEvent;

const isStepEvent = (event: SourceEvents): event is StepEvents => {
  return isReasoningEvent(event) || isToolCallEvent(event);
};

export const addRoundCompleteEvent = ({
  userInput,
  contentReferencesStore,
}: {
  userInput: RoundInput;
  contentReferencesStore: ContentReferencesStore;
}): OperatorFunction<SourceEvents, SourceEvents | RoundCompleteEvent> => {
  return (events$) => {
    const shared$ = events$.pipe(share());
    return merge(
      shared$,
      shared$.pipe(
        toArray(),
        map<SourceEvents[], RoundCompleteEvent>((events) => {
          const round = createRoundFromEvents({ events, input: userInput, contentReferencesStore });

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
  contentReferencesStore,
}: {
  events: SourceEvents[];
  input: RoundInput;
  contentReferencesStore: ContentReferencesStore;
}): ConversationRound => {
  const toolResults = events.filter(isToolResultEvent).map((event) => event.data);
  const toolProgressions = events.filter(isToolProgressEvent).map((event) => event.data);
  const messages = events.filter(isMessageCompleteEvent).map((event) => event.data);
  const stepEvents = events.filter(isStepEvent);

  const eventToStep = (event: StepEvents): ConversationRoundStep => {
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

      return {
        type: ConversationRoundStepType.toolCall,
        tool_call_id: toolCall.tool_call_id,
        tool_id: toolCall.tool_id,
        progression: toolProgress,
        params: toolCall.params,
        results: toolResult?.results ?? [],
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

  // Get the final message content and prune content references
  const finalMessageContent = messages[messages.length - 1]?.message_content || '';
  const { prunedContentReferencesStore } = pruneContentReferences(
    finalMessageContent,
    contentReferencesStore
  );

  const round: ConversationRound = {
    id: uuidv4(),
    input,
    steps: stepEvents.map(eventToStep),
    trace_id: getCurrentTraceId(),
    timestamp: new Date().toISOString(),
    response: { message: finalMessageContent },
    metadata: {
      contentReferences: prunedContentReferencesStore as any,
    },
  };

  return round;
};
