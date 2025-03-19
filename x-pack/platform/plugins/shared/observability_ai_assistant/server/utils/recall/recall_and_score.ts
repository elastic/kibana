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
import { RecallRanking, recallRankingEventType } from '../../analytics/recall_ranking';
import { rewriteQuery } from '../rewrite_query';
import {
  KnowledgeBaseHit,
  KnowledgeBaseQueryContainer,
} from '../../service/knowledge_base_service/types';

export interface RecallAndScoreResult {
  entries: KnowledgeBaseHit[];
  selected: string[];
  queries: KnowledgeBaseQueryContainer[];
  scores?: Map<string, number>;
}

export async function recallAndScore({
  recall,
  inferenceClient,
  analytics,
  userPrompt,
  context,
  messages,
  logger,
  signal,
}: {
  recall: ObservabilityAIAssistantClient['recall'];
  inferenceClient: BoundInferenceClient;
  analytics: AnalyticsServiceStart;
  userPrompt: string;
  context: string;
  messages: Message[];
  logger: Logger;
  signal: AbortSignal;
}): Promise<RecallAndScoreResult> {
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

  const entries = await recall({ queries, limit: { tokenCount: 8000 } });

  if (!entries.length) {
    return {
      selected: [],
      entries,
      queries,
    };
  }

  try {
    const { scores, selected } = await scoreSuggestions({
      entries,
      logger,
      messages,
      userPrompt,
      context,
      signal,
      inferenceClient,
    });

    analytics.reportEvent<RecallRanking>(recallRankingEventType, {
      scoredDocuments: entries.map((entry) => {
        const llmScore = scores?.get(entry.id);
        return {
          elserScore: entry.score,
          llmScore: llmScore ?? -1,
        };
      }),
    });

    return { scores, selected, queries, entries };
  } catch (error) {
    logger.error(`Error scoring documents: ${error.message}`, { error });
    return {
      entries,
      selected: entries.slice(0, 5).map((entry) => entry.id),
      queries,
    };
  }
}
