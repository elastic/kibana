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
import { LONG_TERM_MEMORY_INDEX } from '../../../common/memory';
import type { LongTermMemoryType } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import { buildMemorySpaceFilter } from '../memory_document';

export const MAX_CANDIDATES_PER_TYPE = 50;
/** Results per short-term memory before they are merged. */
export const CANDIDATES_PER_MEMORY = 10;
const MAX_QUERY_TEXT_LENGTH = 2000;
/** Rank fusion constant: a result at rank r scores 1 / (RANK_CONSTANT + r). */
const RANK_CONSTANT = 60;

/** Filters to live long-term memories of the given types in one space. */
export const buildActiveLongTermFilter = ({
  spaceId,
  types,
  now,
}: {
  spaceId: string;
  types: readonly LongTermMemoryType[];
  now: string;
}): QueryDslQueryContainer[] => [
  buildMemorySpaceFilter(spaceId),
  { terms: { type: [...types] } },
  {
    bool: {
      must_not: [
        { term: { 'governance.lifecycle.status': 'deleted' } },
        { range: { expires_at: { lte: now } } },
      ],
    },
  },
];

const toQueryText = ({ title, description }: StoredMemoryDocument) =>
  `${title}. ${description ?? ''}`.trim().slice(0, MAX_QUERY_TEXT_LENGTH);

const toSources = (hits: Array<{ _source?: StoredMemoryDocument }>) =>
  hits.flatMap(({ _source: source }) => (source ? [source] : []));

/** Merges ranked result lists, best first; ties go to the most recently updated. */
export const fuseRankedResults = (
  resultLists: StoredMemoryDocument[][],
  limit: number
): StoredMemoryDocument[] => {
  const fused = new Map<string, { document: StoredMemoryDocument; score: number }>();
  for (const results of resultLists) {
    results.forEach((document, rank) => {
      const entry = fused.get(document.id) ?? { document, score: 0 };
      entry.score += 1 / (RANK_CONSTANT + rank + 1);
      fused.set(document.id, entry);
    });
  }
  return [...fused.values()]
    .sort((a, b) => b.score - a.score || b.document.updated_at.localeCompare(a.document.updated_at))
    .slice(0, limit)
    .map(({ document }) => document);
};

/**
 * Finds the long-term memories a batch may change: one hybrid search per short-term memory,
 * merged by rank. Falls back to lexical search, then to the most recently updated memories.
 */
export const fetchCandidates = async ({
  esClient,
  spaceId,
  types,
  memories,
  now,
  logger,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  types: readonly LongTermMemoryType[];
  memories: StoredMemoryDocument[];
  now: string;
  logger: Logger;
  signal?: AbortSignal;
}): Promise<StoredMemoryDocument[]> => {
  const filter = buildActiveLongTermFilter({ spaceId, types, now });
  const texts = [...new Set(memories.map(toQueryText).filter((text) => text.length > 0))];
  const header = {
    index: LONG_TERM_MEMORY_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
  };

  const searchEach = async (withSemantic: boolean): Promise<StoredMemoryDocument[][]> => {
    const searches = texts.flatMap((text): MsearchRequestItem[] => {
      const should: QueryDslQueryContainer[] = [
        { multi_match: { query: text, fields: ['title^2', 'description', 'content'] } },
        ...(withSemantic ? [{ semantic: { field: 'content.semantic', query: text } }] : []),
      ];
      return [
        header,
        {
          size: CANDIDATES_PER_MEMORY,
          track_total_hits: false,
          query: { bool: { filter, should, minimum_should_match: 1 } },
        },
      ];
    });
    const { responses } = await esClient.msearch<StoredMemoryDocument>({ searches }, { signal });
    return responses.map((response) => {
      if ('error' in response) {
        throw new Error(response.error.reason ?? response.error.type);
      }
      return toSources(response.hits.hits);
    });
  };

  const searchRecent = async () => {
    const response = await esClient.search<StoredMemoryDocument>(
      {
        index: LONG_TERM_MEMORY_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: MAX_CANDIDATES_PER_TYPE,
        track_total_hits: false,
        query: { bool: { filter } },
        sort: [{ updated_at: 'desc' as const }],
      },
      { signal }
    );
    return toSources(response.hits.hits);
  };

  let matches: StoredMemoryDocument[] = [];
  if (texts.length > 0) {
    let resultLists: StoredMemoryDocument[][];
    try {
      resultLists = await searchEach(true);
    } catch (error) {
      logger.debug(
        `Hybrid candidate search failed, using lexical search: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      resultLists = await searchEach(false);
    }
    matches = fuseRankedResults(resultLists, MAX_CANDIDATES_PER_TYPE);
  }
  return matches.length > 0 ? matches : searchRecent();
};
