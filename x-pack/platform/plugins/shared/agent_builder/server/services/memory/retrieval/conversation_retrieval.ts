/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { MemoryNode } from '@kbn/agent-builder-common';
import type { AgentBuilderConfig } from '../../../config';
import { memoryIndexName } from '../client/storage';
import { createSpaceDslFilter } from '../../../utils/spaces';

/**
 * Result of conversation retrieval: the best-matching memory per conversation,
 * plus optionally the conversation IDs for stage 2 loading.
 */
export interface ConversationRetrievalResult {
  memories: MemoryNode[];
  conversationIds: string[];
}

export interface ConversationRetrievalDeps {
  esClient: ElasticsearchClient;
  space: string;
  userName: string;
  config: AgentBuilderConfig;
  logger: Logger;
  inference?: InferenceServerStart;
  request?: KibanaRequest;
  connectorId?: string;
}

/**
 * Stage 1: Find top-K conversations by best-matching memory.
 *
 * Uses an ES terms aggregation on `conversation_id` with `top_hits` to get
 * the single best-scoring memory per conversation, ranked by BM25 or
 * semantic_text score. Returns the top-K conversations.
 */
export const retrieveByConversation = async (
  query: string,
  deps: ConversationRetrievalDeps
): Promise<ConversationRetrievalResult> => {
  const { esClient, space, userName, config, logger } = deps;
  const topK = config.memory.retrieval.conversation.topK;
  const inferenceEndpointId = config.memory.retrieval.inferenceEndpointId;

  const filters: Array<Record<string, unknown>> = [
    createSpaceDslFilter(space),
    { term: { user_name: userName } },
    { exists: { field: 'conversation_id' } },
  ];

  let searchQuery: Record<string, unknown>;

  if (inferenceEndpointId) {
    // Use semantic_text search for embedding similarity
    searchQuery = {
      bool: {
        must: [
          {
            semantic: {
              field: 'full_semantic',
              query,
            },
          },
        ],
        filter: filters,
      },
    };
  } else {
    // Fall back to BM25 text search
    searchQuery = {
      bool: {
        should: [
          {
            multi_match: {
              query,
              fields: ['summary^2', 'full'],
              type: 'best_fields' as const,
            },
          },
        ],
        filter: filters,
      },
    };
  }

  try {
    const response = await esClient.search({
      index: memoryIndexName,
      size: 0,
      query: searchQuery,
      aggs: {
        by_conversation: {
          terms: {
            field: 'conversation_id',
            size: topK,
            order: { best_score: 'desc' },
          },
          aggs: {
            best_score: {
              max: { script: { source: '_score' } },
            },
            best_memory: {
              top_hits: { size: 1 },
            },
          },
        },
      },
    });

    const buckets = (response.aggregations?.by_conversation as any)?.buckets ?? [];

    const memories: MemoryNode[] = [];
    const conversationIds: string[] = [];

    for (const bucket of buckets) {
      const hits = bucket.best_memory?.hits?.hits ?? [];
      if (hits.length > 0) {
        const hit = hits[0];
        conversationIds.push(bucket.key as string);
        memories.push(docToMemoryNode(hit));
      }
    }

    logger.info(
      `conversation retrieval: found ${memories.length} conversations (topK=${topK}, method=${inferenceEndpointId ? 'semantic' : 'bm25'})`
    );

    return { memories, conversationIds };
  } catch (err) {
    logger.warn(`conversation retrieval failed: ${(err as Error).message}`);
    return { memories: [], conversationIds: [] };
  }
};

/**
 * Stage 2: Load full conversations and extract relevant facts via LLM.
 *
 * For each conversation ID from stage 1, loads the conversation and feeds
 * all rounds to an LLM with the query, asking it to extract relevant facts.
 */
export const extractFactsFromConversations = async (
  query: string,
  conversationIds: string[],
  deps: ConversationRetrievalDeps & {
    loadConversation: (id: string) => Promise<{ rounds: Array<{ input: { message: string }; response: { message: string } }> } | undefined>;
  }
): Promise<MemoryNode[]> => {
  const { logger, inference, request, connectorId, loadConversation } = deps;

  if (!inference || !request || !connectorId) {
    logger.warn('conversation retrieval stage 2: inference/request/connector not available, skipping');
    return [];
  }

  const allFacts: MemoryNode[] = [];

  for (const convId of conversationIds) {
    let conversation;
    try {
      conversation = await loadConversation(convId);
    } catch (err) {
      logger.warn(`conversation retrieval stage 2: failed to load conversation ${convId}: ${(err as Error).message}`);
      continue;
    }

    if (!conversation || !conversation.rounds?.length) {
      continue;
    }

    const conversationText = conversation.rounds
      .map((round) => `User: ${round.input.message}\nAssistant: ${round.response.message}`)
      .join('\n\n---\n\n');

    try {
      const inferenceClient = inference.getClient({
        request,
        bindTo: { connectorId },
      }) as BoundInferenceClient;

      const response = await inferenceClient.chatComplete({
        messages: [
          {
            role: MessageRole.User,
            content:
              `Given the following conversation, extract facts that are relevant to this query: "${query}"\n\n` +
              `Conversation:\n${conversationText}\n\n` +
              `Return a JSON array of objects with "summary" and "full" fields. ` +
              `Each fact should be a concise, self-contained statement. ` +
              `If no relevant facts, return [].`,
          },
        ],
        system:
          'You are a fact extraction assistant. Extract concise, relevant facts from conversations. ' +
          'Return ONLY valid JSON: an array of {"summary": "...", "full": "..."}.',
      });

      const raw = response.content?.trim();
      if (raw) {
        const facts = parseFacts(raw, convId, logger);
        allFacts.push(...facts);
      }
    } catch (err) {
      logger.warn(`conversation retrieval stage 2: LLM extraction failed for ${convId}: ${(err as Error).message}`);
    }
  }

  logger.info(`conversation retrieval stage 2: extracted ${allFacts.length} facts from ${conversationIds.length} conversations`);

  return allFacts;
};

const parseFacts = (raw: string, conversationId: string, logger: Logger): MemoryNode[] => {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item: any) => item?.summary && item?.full)
      .map((item: any, idx: number): MemoryNode => ({
        id: `fact-${conversationId}-${idx}`,
        type: 'semantic',
        subtype: 'extracted_fact',
        summary: String(item.summary).slice(0, 200),
        full: String(item.full).slice(0, 1000),
        confidence: 0.7,
        salience: 0.6,
        recency: new Date().toISOString(),
        utility: 0.5,
        stability: 0.3,
        access_count: 0,
        reinforcement_score: 0,
        status: 'candidate',
        source_refs: [{ conversation_id: conversationId, round_id: '' }],
        links: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        space: '',
        user_name: '',
      }));
  } catch (err) {
    logger.warn(`conversation retrieval: failed to parse facts JSON: ${(err as Error).message}`);
    return [];
  }
};

const docToMemoryNode = (hit: any): MemoryNode => {
  const src = hit._source;
  return {
    id: hit._id,
    type: src.type ?? 'semantic',
    subtype: src.subtype,
    summary: src.summary ?? '',
    full: src.full ?? '',
    confidence: src.confidence ?? 0.5,
    salience: src.salience ?? 0.5,
    recency: src.recency ?? src.updated_at ?? '',
    utility: src.utility ?? 0.5,
    stability: src.stability ?? 0.1,
    access_count: src.access_count ?? 0,
    reinforcement_score: src.reinforcement_score ?? 0,
    status: src.status ?? 'candidate',
    source_refs: src.source_refs ?? [],
    links: src.links ?? [],
    created_at: src.created_at ?? '',
    updated_at: src.updated_at ?? '',
    space: src.space ?? '',
    user_id: src.user_id,
    user_name: src.user_name ?? '',
  };
};
