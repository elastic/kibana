/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { SpendSource, UsageRecord } from '@kbn/context-engine-plugin/server';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../common/agent_builder_attachments';
import { CONTEXT_ENGINE_SETUP_AGENT_ID } from '../../common/agent_builder_agents';

export const CONVERSATIONS_SPEND_SOURCE_ID = 'context_engine_setup_conversations';

const DEFAULT_SPACE_ID = 'default';
const PAGE_SIZE = 500;
/** Caps a single read at 10k conversations; suggestions are far below that per space and month. */
const MAX_PAGES = 20;
const PIT_KEEP_ALIVE = '1m';

interface ConversationSource {
  attachments?: Array<{ id?: string; type?: string; active?: boolean }>;
  conversation_rounds?: Array<{
    started_at?: string;
    model_usage?: {
      connector_id?: string;
      input_tokens?: number;
      output_tokens?: number;
      cached_input_tokens?: number;
    };
  }>;
}

const spaceFilter = (spaceId: string): estypes.QueryDslQueryContainer =>
  spaceId === DEFAULT_SPACE_ID
    ? {
        bool: {
          should: [
            { term: { space: spaceId } },
            { bool: { must_not: { exists: { field: 'space' } } } },
          ],
          minimum_should_match: 1,
        },
      }
    : { term: { space: spaceId } };

/**
 * Spend of the Context Engine setup agent, read from the per-round model usage Agent Builder
 * records on its conversations. A conversation is attributed to the AI index it was started
 * for, through its `ai_index` attachment; rounds outside the period are left out.
 */
export const createConversationsSpendSource = ({
  getEsClient,
}: {
  getEsClient: () => ElasticsearchClient;
}): SpendSource => ({
  id: CONVERSATIONS_SPEND_SOURCE_ID,
  bucket: 'suggestions',
  getUsage: async ({ spaceId, from, to, aiIndices }) => {
    const knownAiIndices = new Set(aiIndices.map(({ id }) => id));
    if (knownAiIndices.size === 0) {
      return [];
    }

    const esClient = getEsClient();
    let pitId: string;
    try {
      ({ id: pitId } = await esClient.openPointInTime({
        index: chatSystemIndex('conversations'),
        keep_alive: PIT_KEEP_ALIVE,
        ignore_unavailable: true,
      }));
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return [];
      }
      throw error;
    }

    const totals = new Map<string, UsageRecord>();
    const fromMs = from.getTime();
    const toMs = to.getTime();

    try {
      let searchAfter: estypes.SortResults | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const response = await esClient.search<ConversationSource>({
          pit: { id: pitId, keep_alive: PIT_KEEP_ALIVE },
          size: PAGE_SIZE,
          track_total_hits: false,
          _source: [
            'attachments.id',
            'attachments.type',
            'attachments.active',
            'conversation_rounds.started_at',
            'conversation_rounds.model_usage',
          ],
          query: {
            bool: {
              filter: [
                { term: { agent_id: CONTEXT_ENGINE_SETUP_AGENT_ID } },
                { term: { 'attachments.type': AI_INDEX_ATTACHMENT_TYPE } },
                { terms: { 'attachments.id': [...knownAiIndices] } },
                { range: { updated_at: { gte: from.toISOString() } } },
                spaceFilter(spaceId),
              ],
            },
          },
          sort: [{ _shard_doc: 'asc' }],
          ...(searchAfter && { search_after: searchAfter }),
        });

        const { hits } = response.hits;
        for (const hit of hits) {
          const aiIndexId = hit._source?.attachments?.find(
            ({ id, type, active }) =>
              type === AI_INDEX_ATTACHMENT_TYPE &&
              active !== false &&
              id !== undefined &&
              knownAiIndices.has(id)
          )?.id;
          if (!aiIndexId) {
            continue;
          }
          for (const round of hit._source?.conversation_rounds ?? []) {
            const startedAt = round.started_at ? Date.parse(round.started_at) : NaN;
            const usage = round.model_usage;
            if (!usage || !(startedAt >= fromMs && startedAt < toMs)) {
              continue;
            }
            const connectorId = usage.connector_id || undefined;
            const key = `${aiIndexId}\u0000${connectorId ?? ''}`;
            const record = totals.get(key) ?? {
              aiIndexId,
              ...(connectorId && { connectorId }),
              inputTokens: 0,
              outputTokens: 0,
              cachedTokens: 0,
            };
            record.inputTokens += usage.input_tokens ?? 0;
            record.outputTokens += usage.output_tokens ?? 0;
            record.cachedTokens += usage.cached_input_tokens ?? 0;
            totals.set(key, record);
          }
        }

        if (hits.length < PAGE_SIZE) {
          break;
        }
        searchAfter = hits[hits.length - 1].sort;
        pitId = response.pit_id ?? pitId;
      }
    } finally {
      await esClient.closePointInTime({ id: pitId }).catch(() => undefined);
    }

    return [...totals.values()];
  },
});
