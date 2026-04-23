/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { SmlTypeDefinition } from '@kbn/agent-builder-plugin/server';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import {
  type ConversationDocumentSource,
  extractConversationTurns,
  type OtelSpanSource,
  extractOtelTraceTurns,
  OTEL_ORIGIN_PREFIX,
} from './memory_extraction';

const CONVERSATION_SML_TYPE = 'conversation';

const conversationIndexName = chatSystemIndex('conversations');
const OTEL_INDEX_NAME = 'claude-code-otel-traces';

interface ConversationListSource {
  space?: string;
  updated_at?: string;
}

interface OtelRootSpanSource {
  trace_id?: string;
  conversation_id?: string;
  end_time?: string;
  space?: string;
}

type SmlContext = Parameters<SmlTypeDefinition['getSmlData']>[1];

const getChatConversationSmlData = async (originId: string, context: SmlContext) => {
  try {
    const response = await context.esClient.search<ConversationDocumentSource>({
      index: conversationIndexName,
      query: {
        bool: {
          must: [{ ids: { values: [originId] } }],
        },
      },
      size: 1,
      ignore_unavailable: true,
    });

    const hit = response.hits.hits[0];
    if (!hit?._source) return undefined;

    const chunks = extractConversationTurns({
      source: hit._source,
      logger: context.logger,
    });

    if (chunks.length === 0) return undefined;
    return { chunks };
  } catch (error) {
    context.logger.warn(
      `SML conversation: failed to get data for '${originId}': ${(error as Error).message}`
    );
    return undefined;
  }
};

const getOtelSmlData = async (traceId: string, context: SmlContext) => {
  try {
    const spansResponse = await context.esClient.search<OtelSpanSource>({
      index: OTEL_INDEX_NAME,
      query: {
        term: { trace_id: traceId },
      },
      size: 10000,
      ignore_unavailable: true,
    });

    const spans = spansResponse.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is OtelSpanSource => Boolean(src));

    const chunks = extractOtelTraceTurns({ spans, logger: context.logger });
    if (chunks.length === 0) return undefined;
    return { chunks };
  } catch (error) {
    context.logger.warn(
      `SML conversation: failed to get otel data for trace '${traceId}': ${
        (error as Error).message
      }`
    );
    return undefined;
  }
};

export const conversationSmlType: SmlTypeDefinition = {
  id: CONVERSATION_SML_TYPE,
  fetchFrequency: () => '15m',

  async *list(context) {
    const pageSize = 1000;
    let searchAfter: SortResults | undefined;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await context.esClient.search<ConversationListSource>({
          index: conversationIndexName,
          size: pageSize,
          _source: ['space', 'updated_at'],
          sort: [{ updated_at: { order: 'desc' } }, '_shard_doc'],
          ...(searchAfter ? { search_after: searchAfter } : {}),
          ignore_unavailable: true,
        });

        const hits = response.hits.hits;
        if (hits.length > 0) {
          yield hits
            .filter(
              (hit): hit is typeof hit & { _id: string; _source: ConversationListSource } =>
                Boolean(hit._id) && Boolean(hit._source)
            )
            .map((hit) => ({
              id: hit._id,
              updatedAt: hit._source.updated_at ?? new Date().toISOString(),
              spaces: hit._source.space ? [hit._source.space] : ['default'],
            }));
        }

        hasMore = hits.length >= pageSize;
        if (hasMore && hits.length > 0) {
          const lastHit = hits[hits.length - 1];
          searchAfter = lastHit.sort;
        }
      } catch (error) {
        context.logger.warn(
          `SML conversation: failed to list conversations: ${(error as Error).message}`
        );
        return;
      }
    }

    // Also list OTel trace conversations
    let otelSearchAfter: SortResults | undefined;
    let otelHasMore = true;

    while (otelHasMore) {
      try {
        const response = await context.esClient.search<OtelRootSpanSource>({
          index: OTEL_INDEX_NAME,
          size: pageSize,
          _source: ['trace_id', 'conversation_id', 'end_time', 'space'],
          query: {
            term: { operation_name: 'converse' },
          },
          sort: [{ end_time: { order: 'desc' } }, '_shard_doc'],
          ...(otelSearchAfter ? { search_after: otelSearchAfter } : {}),
          ignore_unavailable: true,
        });

        const hits = response.hits.hits;
        if (hits.length > 0) {
          yield hits
            .filter(
              (hit): hit is typeof hit & { _id: string; _source: OtelRootSpanSource } =>
                Boolean(hit._id) && Boolean(hit._source)
            )
            .map((hit) => ({
              id: `${OTEL_ORIGIN_PREFIX}${hit._source.trace_id ?? hit._id}`,
              updatedAt: hit._source.end_time ?? new Date().toISOString(),
              spaces: hit._source.space ? [hit._source.space] : ['default'],
            }));
        }

        otelHasMore = hits.length >= pageSize;
        if (otelHasMore && hits.length > 0) {
          const lastHit = hits[hits.length - 1];
          otelSearchAfter = lastHit.sort;
        }
      } catch (error) {
        context.logger.warn(
          `SML conversation: failed to list otel conversations: ${(error as Error).message}`
        );
        return;
      }
    }
  },

  getSmlData: async (originId, context) => {
    if (originId.startsWith(OTEL_ORIGIN_PREFIX)) {
      return getOtelSmlData(originId.slice(OTEL_ORIGIN_PREFIX.length), context);
    }
    return getChatConversationSmlData(originId, context);
  },
};
