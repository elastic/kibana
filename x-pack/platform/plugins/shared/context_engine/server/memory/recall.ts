/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MsearchRequestItem,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  DEFAULT_RECALL_SIZE,
  LONG_TERM_MEMORY_INDEX,
  MAX_RECALL_SIZE,
  MEMORY_ATTRIBUTES,
  RECALL_MEMORY_TYPES,
} from '../../common/memory';
import type {
  RecallMemoriesRequest,
  RecallMemoriesResponse,
  RecalledLink,
  RecalledMemory,
} from '../../common/http_api/memory';
import { buildActiveLongTermFilter, fuseRankedResults } from './dreaming/candidates';
import { findLinks } from './dreaming/links';
import { readAttribute, readListAttribute } from './dreaming/long_term_types';
import { readRelationshipEnds } from './dreaming/relationship_type';
import type { StoredMemoryDocument } from './memory_document';

/** Relationships returned for the matches. */
export const MAX_RECALL_LINKS = 50;
export const MAX_RECALLED_CONTENT_LENGTH = 2000;

const truncate = (value: string) =>
  value.length > MAX_RECALLED_CONTENT_LENGTH
    ? `${value.slice(0, MAX_RECALLED_CONTENT_LENGTH)}…`
    : value;

const toRecalledMemory = (memory: StoredMemoryDocument, withContent: boolean): RecalledMemory => {
  const kind = readAttribute(memory, MEMORY_ATTRIBUTES.entityKind);
  const aliases = readListAttribute(memory, MEMORY_ATTRIBUTES.entityAliases);
  return {
    id: memory.id,
    type: memory.type,
    title: memory.title,
    ...(memory.description ? { description: memory.description } : {}),
    ...(withContent ? { content: truncate(memory.content) } : {}),
    ...(kind ? { kind } : {}),
    ...(aliases.length > 0 ? { aliases } : {}),
    updated_at: memory.updated_at,
  };
};

const toRecalledLink = (link: StoredMemoryDocument): RecalledLink | undefined => {
  const { fromId, toId } = readRelationshipEnds(link);
  const relation = readAttribute(link, MEMORY_ATTRIBUTES.relationshipRelation);
  if (!fromId || !relation || !toId) {
    return undefined;
  }
  return {
    id: link.id,
    from_id: fromId,
    relation,
    to_id: toId,
    ...(link.description ? { description: link.description } : {}),
  };
};

const toSources = (hits: Array<{ _source?: StoredMemoryDocument }>) =>
  hits.flatMap(({ _source: source }) => (source ? [source] : []));

/**
 * Finds the long-term memories that match a query, merging a lexical and a semantic search, then
 * adds the relationships of the matches and the memories at their other end.
 */
export const recallMemories = async ({
  esClient,
  spaceId,
  query,
  types = [...RECALL_MEMORY_TYPES],
  size = DEFAULT_RECALL_SIZE,
  now,
  logger,
}: RecallMemoriesRequest & {
  esClient: ElasticsearchClient;
  spaceId: string;
  now: string;
  logger: Logger;
}): Promise<RecallMemoriesResponse> => {
  const limit = Math.min(Math.max(size, 1), MAX_RECALL_SIZE);
  const filter = buildActiveLongTermFilter({ spaceId, types, now });
  const header = {
    index: LONG_TERM_MEMORY_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
  };
  const searchFor = (match: QueryDslQueryContainer): MsearchRequestItem[] => [
    header,
    { size: limit, track_total_hits: false, query: { bool: { filter, must: [match] } } },
  ];
  const { responses } = await esClient.msearch<StoredMemoryDocument>({
    searches: [
      ...searchFor({
        multi_match: { query, fields: ['title^3', 'description^2', 'content'] },
      }),
      ...searchFor({ semantic: { field: 'content.semantic', query } }),
    ],
  });
  const resultLists = responses.flatMap((response, index) => {
    if (!('error' in response)) {
      return [toSources(response.hits.hits)];
    }
    if (index === 0) {
      throw new Error(response.error.reason ?? response.error.type);
    }
    logger.debug(`Semantic memory recall failed, using lexical results: ${response.error.reason}`);
    return [];
  });
  const matches = fuseRankedResults(resultLists, limit);
  if (matches.length === 0) {
    return { memories: [], linked_memories: [], links: [] };
  }

  const matchIds = new Set(matches.map(({ id }) => id));
  const links = (
    await findLinks({ esClient, spaceId, ids: [...matchIds], now, size: MAX_RECALL_LINKS })
  ).flatMap(({ document }) => toRecalledLink(document) ?? []);
  const linkedIds = [...new Set(links.flatMap(({ from_id, to_id }) => [from_id, to_id]))].filter(
    (id) => !matchIds.has(id)
  );

  const linked =
    linkedIds.length === 0
      ? []
      : toSources(
          (
            await esClient.search<StoredMemoryDocument>({
              index: LONG_TERM_MEMORY_INDEX,
              ignore_unavailable: true,
              allow_no_indices: true,
              size: linkedIds.length,
              track_total_hits: false,
              query: {
                bool: {
                  filter: [
                    ...buildActiveLongTermFilter({ spaceId, types: RECALL_MEMORY_TYPES, now }),
                    { terms: { id: linkedIds } },
                  ],
                },
              },
            })
          ).hits.hits
        );

  const known = new Set([...matchIds, ...linked.map(({ id }) => id)]);
  return {
    memories: matches.map((memory) => toRecalledMemory(memory, true)),
    linked_memories: linked.map((memory) => toRecalledMemory(memory, false)),
    links: links.filter(({ from_id, to_id }) => known.has(from_id) && known.has(to_id)),
  };
};
