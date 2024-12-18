/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { AnalyticsServiceStart, IScopedClusterClient, IUiSettingsClient } from '@kbn/core/server';
import { scoreSuggestions } from './score_suggestions';
import type { Message } from '../../../common';
import type { ObservabilityAIAssistantClient } from '../../service/client';
import type { FunctionCallChatFunction } from '../../service/types';
import { RecallRanking, recallRankingEventType } from '../../analytics/recall_ranking';
import { RecalledEntry } from '../../service/knowledge_base_service';
import { rewriteUserPromptForSearchConnectors } from './rewrite_user_prompt';

export type RecalledSuggestion = Pick<RecalledEntry, 'id' | 'text' | 'score'>;

export async function recallAndScore({
  esClient,
  uiSettingsClient,
  recall,
  chat,
  analytics,
  userPrompt,
  screenDescription,
  messages,
  logger,
  signal,
}: {
  esClient: IScopedClusterClient;
  uiSettingsClient: IUiSettingsClient;
  recall: ObservabilityAIAssistantClient['recall'];
  chat: FunctionCallChatFunction;
  analytics: AnalyticsServiceStart;
  userPrompt: string;
  screenDescription: string;
  messages: Message[];
  logger: Logger;
  signal: AbortSignal;
}): Promise<{
  relevantDocuments?: RecalledSuggestion[];
  scores?: Array<{ id: string; score: number }>;
  suggestions: RecalledSuggestion[];
}> {
  // rewrite user prompt to include context and message history
  const userPromptAndFiltersForSearchConnectors = await rewriteUserPromptForSearchConnectors({
    esClient,
    uiSettingsClient,
    logger,
    messages,
    userPrompt,
    screenDescription,
    signal,
    chat,
  });

  const suggestions: RecalledSuggestion[] = (
    await recall({ userPrompt, screenDescription, userPromptAndFiltersForSearchConnectors })
  ).map(({ id, text, score }) => ({ id, text, score }));

  if (!suggestions.length) {
    return {
      relevantDocuments: [],
      scores: [],
      suggestions: [],
    };
  }

  try {
    const { scores, relevantDocuments } = await scoreSuggestions({
      suggestions,
      logger,
      messages,
      userPrompt,
      context: screenDescription,
      signal,
      chat,
    });

    analytics.reportEvent<RecallRanking>(recallRankingEventType, {
      prompt: userPrompt,
      scoredDocuments: suggestions.map((suggestion) => {
        const llmScore = scores.find((score) => score.id === suggestion.id);
        return {
          content: suggestion.text,
          elserScore: suggestion.score ?? -1,
          llmScore: llmScore ? llmScore.score : -1,
        };
      }),
    });

    return { scores, relevantDocuments, suggestions };
  } catch (error) {
    logger.error(`Error scoring documents: ${error.message}`, { error });
    return {
      suggestions: suggestions.slice(0, 5),
    };
  }
}
