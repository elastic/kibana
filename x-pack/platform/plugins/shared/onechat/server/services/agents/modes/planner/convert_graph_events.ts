/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { AIMessageChunk } from '@langchain/core/messages';
import { EMPTY, mergeMap, of, OperatorFunction, merge, shareReplay, filter } from 'rxjs';
import {
  MessageChunkEvent,
  MessageCompleteEvent,
  ReasoningEvent,
  ToolCallEvent,
  ToolResultEvent,
  isToolCallEvent,
  isToolResultEvent,
} from '@kbn/onechat-common';
import {
  matchGraphName,
  matchEvent,
  matchName,
  hasTag,
  extractTextContent,
  createTextChunkEvent,
  createMessageEvent,
  createReasoningEvent,
  ToolIdMapping,
} from '@kbn/onechat-genai-utils/langchain';
import { convertGraphEvents as convertExecutorEvents } from '../chat/convert_graph_events';
import type { StateType } from './graph';
import { lastPlanningResult, PlanningResult } from './backlog';

export type ResearcherAgentEvents =
  | MessageChunkEvent
  | MessageCompleteEvent
  | ReasoningEvent
  | ToolCallEvent
  | ToolResultEvent;

const formatPlanningResult = (planning: PlanningResult): string => {
  let formatted = `${planning.reasoning}\n`;
  if (planning.steps.length > 0) {
    formatted += `Plan:\n${planning.steps.map((step) => ` - ${step}`).join('\n')}`;
  } else {
    formatted += `Plan: No remaining steps.`;
  }
  return formatted;
};

export const convertGraphEvents = ({
  graphName,
  toolIdMapping,
}: {
  graphName: string;
  toolIdMapping: ToolIdMapping;
}): OperatorFunction<LangchainStreamEvent, ResearcherAgentEvents> => {
  return (streamEvents$) => {
    const messageId = uuidv4();
    const replay$ = streamEvents$.pipe(shareReplay());

    return merge(
      // tool events from the sub agent
      replay$.pipe(
        convertExecutorEvents({
          graphName: 'executor_agent',
          toolIdMapping,
        }),
        filter((event) => {
          return isToolCallEvent(event) || isToolResultEvent(event);
        })
      ),
      // events from the planner
      replay$.pipe(
        mergeMap((event) => {
          if (!matchGraphName(event, graphName)) {
            return EMPTY;
          }

          // create plan reasoning event
          if (matchEvent(event, 'on_chain_end') && matchName(event, 'create_plan')) {
            const { backlog } = event.data.output as StateType;
            const planningResult = lastPlanningResult(backlog);

            const reasoningEvent = createReasoningEvent(formatPlanningResult(planningResult));
            return of(reasoningEvent);
          }

          // revise plan reasoning event
          if (matchEvent(event, 'on_chain_end') && matchName(event, 'revise_plan')) {
            const { backlog } = event.data.output as StateType;
            const planningResult = lastPlanningResult(backlog);

            const reasoningEvent = createReasoningEvent(formatPlanningResult(planningResult));
            return of(reasoningEvent);
          }

          // answer step text chunks
          if (matchEvent(event, 'on_chat_model_stream') && hasTag(event, 'planner:answer')) {
            const chunk: AIMessageChunk = event.data.chunk;
            const textContent = extractTextContent(chunk);
            if (textContent) {
              return of(createTextChunkEvent(textContent, { messageId }));
            }
          }

          // answer step response message
          if (matchEvent(event, 'on_chain_end') && matchName(event, 'answer')) {
            const { generatedAnswer } = event.data.output as StateType;

            const messageEvent = createMessageEvent(generatedAnswer, { messageId });
            return of(messageEvent);
          }

          return EMPTY;
        })
      )
    );
  };
};
