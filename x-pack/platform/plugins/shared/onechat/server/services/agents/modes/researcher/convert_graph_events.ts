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
import { MessageChunkEvent, MessageCompleteEvent, ReasoningEvent } from '@kbn/onechat-common';
import {
  matchGraphName,
  matchEvent,
  matchName,
  hasTag,
  createTextChunkEvent,
  createMessageEvent,
  createReasoningEvent,
  extractTextContent,
  ToolIdMapping,
} from '@kbn/onechat-genai-utils/langchain';
import type { StateType } from './graph';
import {
  lastReflectionResult,
  firstResearchGoalResult,
  ResearchGoalResult,
  ReflectionResult,
} from './backlog';

export type ResearcherAgentEvents = MessageChunkEvent | MessageCompleteEvent | ReasoningEvent;

const formatResearchGoalReasoning = (researchGoal: ResearchGoalResult): string => {
  return `${researchGoal.reasoning}\n\nDefining the research goal as: "${researchGoal.researchGoal}"`;
};

const formatReflectionResult = (reflection: ReflectionResult): string => {
  let formatted = `${reflection.reasoning}\n\nThe current information are ${
    reflection.isSufficient ? '*sufficient*' : '*insufficient*'
  }`;

  if (reflection.nextQuestions.length > 0) {
    formatted += `\n\nThe following questions should be followed up on: ${reflection.nextQuestions
      .map((question) => ` - ${question}`)
      .join(', ')}`;
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
    return streamEvents$.pipe(
      mergeMap((event) => {
        if (!matchGraphName(event, graphName)) {
          return EMPTY;
        }

        // clarification response text chunks
        if (
          matchEvent(event, 'on_chat_model_stream') &&
          hasTag(event, 'researcher-ask-for-clarification')
        ) {
          const chunk: AIMessageChunk = event.data.chunk;
          const textContent = extractTextContent(chunk);

          if (textContent) {
            const messageChunkEvent = createTextChunkEvent(textContent, { messageId });
            return of(messageChunkEvent);
          }
        }

        // clarification response message
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'identify_research_goal')) {
          const { generatedAnswer } = event.data.output as StateType;
          if (generatedAnswer) {
            const messageEvent = createMessageEvent(generatedAnswer, { messageId });
            return of(messageEvent);
          }
        }

        // research goal reasoning events
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'identify_research_goal')) {
          const { backlog } = event.data.output as StateType;
          const researchGoalResult = firstResearchGoalResult(backlog);

          const reasoningEvent = createReasoningEvent(
            formatResearchGoalReasoning(researchGoalResult)
          );
          return of(reasoningEvent);
        }

        // answer step text chunks
        if (matchEvent(event, 'on_chat_model_stream') && hasTag(event, 'researcher-answer')) {
          const chunk: AIMessageChunk = event.data.chunk;
          const textContent = extractTextContent(chunk);

          if (textContent) {
            const messageChunkEvent = createTextChunkEvent(textContent, { messageId });
            return of(messageChunkEvent);
          }
        }

        // answer step response message
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'answer')) {
          const { generatedAnswer } = event.data.output as StateType;

          const messageEvent = createMessageEvent(generatedAnswer, { messageId });
          return of(messageEvent);
        }

        // reasoning events for reflection step
        if (matchEvent(event, 'on_chain_end') && matchName(event, 'reflection')) {
          const { backlog } = event.data.output as StateType;
          const reflectionResult = lastReflectionResult(backlog);

          const reasoningEvent = createReasoningEvent(formatReflectionResult(reflectionResult));
          return of(reasoningEvent);
        }

        return EMPTY;
      })
    );
  };
};
