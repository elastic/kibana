/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { AIMessageChunk } from '@langchain/core/messages';
import { EMPTY, mergeMap, of, OperatorFunction } from 'rxjs';
import {
  MessageChunkEvent,
  MessageCompleteEvent,
  ReasoningEvent,
} from '@kbn/onechat-common/agents';
import {
  matchGraphName,
  matchEvent,
  matchName,
  hasTag,
  createTextChunkEvent,
  createMessageEvent,
  createReasoningEvent,
} from '@kbn/onechat-genai-utils/langchain';
import type { StateType } from './graph';
import { lastReflectionResult } from './backlog';

export type ResearcherAgentEvents = MessageChunkEvent | MessageCompleteEvent | ReasoningEvent;

export const convertGraphEvents = ({
  graphName,
}: {
  graphName: string;
}): OperatorFunction<LangchainStreamEvent, ResearcherAgentEvents> => {
  return (streamEvents$) => {
    const messageId = uuidv4();
    return streamEvents$.pipe(
      mergeMap((event) => {
        if (!matchGraphName(event, graphName)) {
          return EMPTY;
        }

        // response text chunks
        if (matchEvent(event, 'on_chat_model_stream') && hasTag(event, 'researcher-answer')) {
          const chunk: AIMessageChunk = event.data.chunk;

          const messageChunkEvent = createTextChunkEvent(chunk, { defaultMessageId: messageId });
          return of(messageChunkEvent);
        }

        // response message
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'answer')) {
          const { generatedAnswer } = event.data.output as StateType;

          const messageEvent = createMessageEvent(generatedAnswer);
          return of(messageEvent);
        }

        // emit reasoning events for "reflection" step
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'reflection')) {
          const { backlog } = event.data.output as StateType;
          const reflectionResult = lastReflectionResult(backlog);

          const reasoningEvent = createReasoningEvent(reflectionResult.reasoning);
          return of(reasoningEvent);
        }

        return EMPTY;
      })
    );
  };
};
