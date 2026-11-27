/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/core-security-server';
import { DEFAULT_RECALL_FORMAT, DEFAULT_RECALL_TOKEN_BUDGET } from '../../common/constants';
import type {
  RecallRequest,
  RecallResponse,
  RecallResult,
  RecallSessionStore,
} from '../../common/http_api/recall';
import type { AiIndexService } from '../ai_indices/service';
import { memoryRecallAuditEvent } from '../audit/audit_events';
import { retrieveAiIndices } from './ai_index_retriever';
import { formatRecallYaml, packRecallResults } from './format';
import { parseRecallInclude } from './include';
import { allocateCandidatePool } from './pool';
import type { RecallReranker } from './rerank';
import { retrieveSessionEvents, retrieveSessionMemories } from './session_retrievers';

export interface RecallContext {
  readonly space: string;
  readonly callerEsClient: ElasticsearchClient;
  readonly auditLogger: AuditLogger;
}

export interface CreateRecallServiceParams {
  readonly internalEsClient: ElasticsearchClient;
  readonly aiIndexService: Pick<AiIndexService, 'list'>;
  readonly reranker: RecallReranker;
  readonly logger: Logger;
  readonly getNow?: () => number;
}

export interface RecallService {
  recall(context: RecallContext, request: RecallRequest): Promise<RecallResponse>;
}

const isMemoryResult = ({ source }: RecallResult): boolean =>
  source === 'session_events' || source === 'session_memory';

/** Creates the service that retrieves, reranks, packs and formats recall results across stores. */
export const createRecallService = ({
  internalEsClient,
  aiIndexService,
  reranker,
  logger,
  getNow = Date.now,
}: CreateRecallServiceParams): RecallService => ({
  recall: async ({ space, callerEsClient, auditLogger }, request) => {
    const startedAt = getNow();
    const { user_id: userId, query, session_ids: sessionIds } = request;
    if (space.trim() === '') {
      throw new Error('Recall requires a non-empty space');
    }
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

    const { include } = parsed;
    const tokenBudget = request.token_budget ?? DEFAULT_RECALL_TOKEN_BUDGET;
    const format = request.format ?? DEFAULT_RECALL_FORMAT;
    const memoryStores: RecallSessionStore[] = [
      ...(include.sessionEvents ? (['session_events'] as const) : []),
      ...(include.sessionMemory ? (['session_memory'] as const) : []),
    ];
    const allocation = allocateCandidatePool(include);

    try {
      const [eventCandidates, memoryCandidates, aiIndexCandidates] = await Promise.all([
        allocation.sessionEvents > 0
          ? retrieveSessionEvents({
              esClient: internalEsClient,
              space,
              userId,
              query,
              sessionIds,
              size: allocation.sessionEvents,
            })
          : [],
        allocation.sessionMemory > 0
          ? retrieveSessionMemories({
              esClient: internalEsClient,
              space,
              userId,
              query,
              sessionIds,
              size: allocation.sessionMemory,
            })
          : [],
        allocation.aiIndices > 0
          ? retrieveAiIndices({
              esClient: callerEsClient,
              aiIndexService,
              logger,
              space,
              userId,
              query,
              selector: include.aiIndices,
              size: allocation.aiIndices,
            })
          : [],
      ]);
      const candidates: RecallResult[] = [
        ...eventCandidates,
        ...memoryCandidates,
        ...aiIndexCandidates,
      ];
      const ranked = await reranker.rerank({ query, candidates });
      const { results } = packRecallResults({ results: ranked, tokenBudget, format });
      const tookMs = Math.max(0, getNow() - startedAt);
      const response: RecallResponse =
        format === 'yaml'
          ? { context: formatRecallYaml(results), took_ms: tookMs }
          : { results, took_ms: tookMs };

      if (memoryStores.length > 0) {
        auditLogger.log(
          memoryRecallAuditEvent({
            stores: memoryStores,
            targetUserId: userId,
            results: results.filter(isMemoryResult).length,
          })
        );
      }
      return response;
    } catch (error) {
      if (memoryStores.length > 0) {
        auditLogger.log(
          memoryRecallAuditEvent({
            stores: memoryStores,
            targetUserId: userId,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        );
      }
      throw error;
    }
  },
});
