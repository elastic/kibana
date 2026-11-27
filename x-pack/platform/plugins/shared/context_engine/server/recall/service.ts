/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RECALL_AI_INDEX_PREFIX } from '../../common/constants';
import type {
  AiIndexRecallResult,
  RecallJsonResponse,
  RecallRequest,
} from '../../common/http_api/recall';
import type {
  AiIndexDataReadServiceApi,
  AiIndexSearchResult,
  SearchAiIndicesRequest,
} from '../ai_indices/data_read_service';
import { parseRecallInclude, type RecallAiIndexSelector } from './include';

export interface RecallContext {
  readonly aiIndexDataReadService: Pick<AiIndexDataReadServiceApi, 'search'>;
}

export interface CreateRecallServiceParams {
  readonly getNow?: () => number;
}

export interface RecallService {
  recall(context: RecallContext, request: RecallRequest): Promise<RecallJsonResponse>;
}

const DEFAULT_RECALL_CANDIDATE_LIMIT = 100;

const searchSelectedAiIndices = async (
  { aiIndexDataReadService }: RecallContext,
  selector: RecallAiIndexSelector,
  { query, userId }: Pick<SearchAiIndicesRequest, 'query' | 'userId'>
): Promise<AiIndexSearchResult[]> => {
  switch (selector.kind) {
    case 'none':
      return [];
    case 'all':
      return aiIndexDataReadService.search({
        query,
        userId,
        size: DEFAULT_RECALL_CANDIDATE_LIMIT,
      });
    case 'ids':
      return aiIndexDataReadService.search({
        query,
        userId,
        aiIndexIds: selector.ids,
        size: DEFAULT_RECALL_CANDIDATE_LIMIT,
      });
    default: {
      const exhaustive: never = selector;
      throw new Error(`Unknown AI index selector: ${JSON.stringify(exhaustive)}`);
    }
  }
};

const toRecallResult = ({
  id,
  aiIndexId,
  date,
  content,
  attributes,
}: AiIndexSearchResult): AiIndexRecallResult => ({
  id,
  source: `${RECALL_AI_INDEX_PREFIX}${aiIndexId}`,
  ...(date !== undefined ? { date } : {}),
  content,
  ...(attributes !== undefined ? { attributes } : {}),
});

export const createRecallService = ({
  getNow = Date.now,
}: CreateRecallServiceParams = {}): RecallService => ({
  recall: async (context, request) => {
    const startedAt = getNow();
    const { user_id: userId, query } = request;
    if (userId.trim() === '') {
      throw new Error('Recall requires a non-empty user_id');
    }
    if (query.trim() === '') {
      throw new Error('Recall requires a non-empty query');
    }
    const parsed = parseRecallInclude(request.include);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    const aiIndexResults = await searchSelectedAiIndices(context, parsed.include.aiIndices, {
      query,
      userId,
    });
    return {
      results: aiIndexResults.map(toRecallResult),
      took_ms: Math.max(0, getNow() - startedAt),
    };
  },
});
