/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { AnalyticsServiceStart } from '@kbn/core/server';
import { BoundInferenceClient } from '@kbn/inference-plugin/server';
import { partition } from 'lodash';
import { scoreSuggestions } from './score_suggestions';
import { MessageRole, type Message } from '../../../common';
import type { ObservabilityAIAssistantClient } from '../../service/client';
import type { FunctionCallChatFunction } from '../../service/types';
import { RecallRanking, recallRankingEventType } from '../../analytics/recall_ranking';
import { KnowledgeBaseQueryContainer, RecalledEntry } from '../../service/knowledge_base_service';
import { rewriteQuery } from '../rewrite_query';

export type RecalledSuggestion = Pick<RecalledEntry, 'id' | 'text' | 'score'>;

export async function recallAndScore({
  recall,
  inferenceClient,
  chat,
  analytics,
  userPrompt,
  context,
  messages,
  logger,
  signal,
}: {
  recall: ObservabilityAIAssistantClient['recall'];
  inferenceClient: BoundInferenceClient;
  chat: FunctionCallChatFunction;
  analytics: AnalyticsServiceStart;
  userPrompt: string;
  context: string;
  messages: Message[];
  logger: Logger;
  signal: AbortSignal;
}): Promise<{
  relevantDocuments?: RecalledSuggestion[];
  scores?: Array<{ id: string; score: number }>;
  suggestions: RecalledSuggestion[];
  queries?: KnowledgeBaseQueryContainer[];
}> {
  const [[systemMessage], otherMessages] = partition(
    messages,
    (message) => message.message.role === MessageRole.System
  );

  const { queries } = await rewriteQuery({
    context,
    inferenceClient,
    systemMessage: systemMessage?.message.content,
    messages: otherMessages,
  });

  logger.debug(() => `Query rewrite: ${JSON.stringify(queries)}`);

  const suggestions: RecalledSuggestion[] = (await recall({ queries })).map(
    ({ id, text, score }) => ({ id, text, score })
  );

  if (!suggestions.length) {
    return {
      relevantDocuments: [],
      scores: [],
      suggestions: [],
      queries,
    };
  }

  try {
    const { scores, relevantDocuments } = await scoreSuggestions({
      suggestions,
      logger,
      messages,
      userPrompt,
      context,
      signal,
      chat,
    });

    analytics.reportEvent<RecallRanking>(recallRankingEventType, {
      prompt: JSON.stringify(queries),
      scoredDocuments: suggestions.map((suggestion) => {
        const llmScore = scores.find((score) => score.id === suggestion.id);
        return {
          content: suggestion.text,
          elserScore: suggestion.score ?? -1,
          llmScore: llmScore ? llmScore.score : -1,
        };
      }),
    });

    return { scores, relevantDocuments, suggestions, queries };
  } catch (error) {
    logger.error(`Error scoring documents: ${error.message}`, { error });
    return {
      suggestions: suggestions.slice(0, 5),
    };
  }
}
