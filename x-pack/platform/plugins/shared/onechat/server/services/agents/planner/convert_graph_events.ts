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
  ToolIdMapping,
} from '@kbn/onechat-genai-utils/langchain';
import type { StateType } from './graph';
import { lastPlanningResult } from './backlog';

export type ResearcherAgentEvents = MessageChunkEvent | MessageCompleteEvent | ReasoningEvent;

export const convertGraphEvents = ({
  graphName,
  toolIdMapping,
}: {
  graphName: string;
  toolIdMapping: ToolIdMapping;
}): OperatorFunction<LangchainStreamEvent, ResearcherAgentEvents> => {
  return (streamEvents$) => {
    const messageId = uuidv4();
    return streamEvents$.pipe(
      mergeMap((event) => {
        if (!matchGraphName(event, graphName)) {
          return EMPTY;
        }

        // create plan reasoning event
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'create_plan')) {
          const { backlog } = event.data.output as StateType;
          const planningResult = lastPlanningResult(backlog);

          const reasoningEvent = createReasoningEvent(planningResult.reasoning);
          return of(reasoningEvent);
        }

        // revise plan reasoning event
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'revise_plan')) {
          const { backlog } = event.data.output as StateType;
          const planningResult = lastPlanningResult(backlog);

          const reasoningEvent = createReasoningEvent(planningResult.reasoning);
          return of(reasoningEvent);
        }

        // answer step text chunks
        if (matchEvent(event, 'on_chat_model_stream') && hasTag(event, 'planner:answer')) {
          const chunk: AIMessageChunk = event.data.chunk;

          const messageChunkEvent = createTextChunkEvent(chunk, { defaultMessageId: messageId });
          return of(messageChunkEvent);
        }

        // answer step response message
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'answer')) {
          const { generatedAnswer } = event.data.output as StateType;

          const messageEvent = createMessageEvent(generatedAnswer);
          return of(messageEvent);
        }

        return EMPTY;
      })
    );
  };
};
