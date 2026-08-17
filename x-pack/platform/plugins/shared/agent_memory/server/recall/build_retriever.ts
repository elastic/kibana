/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  RetrieverContainer,
} from '@elastic/elasticsearch/lib/api/types';

/**
 * Parameters for the hybrid RRF retriever used in recall.
 *
 * The retriever enforces G3: `space_id` AND `author` filters are mandatory
 * and are never overridable by tool params. They are injected unconditionally
 * so a crafted recall call cannot widen the scope.
 */
export interface BuildRetrieverParams {
  query: string;
  /** Mandatory scope filter — injected unconditionally (G3). */
  space_id: string;
  /** Mandatory author filter — injected unconditionally (G3). */
  author: string;
  /** Optional category filter applied on top of the belief filter. */
  category?: string;
  /** Max results to return. */
  limit: number;
}

/**
 * Mandatory belief filter applied to every recall query.
 *
 * Excludes:
 *  - tombstoned records (`deleted: true`)
 *  - records at or past their per-record `expires_at` date (D5)
 *
 * Always adds:
 *  - `space_id` scope (G3)
 *  - `author` identity scope (G3)
 */
const buildBeliefFilter = (
  space_id: string,
  author: string,
  category?: string
): QueryDslQueryContainer[] => {
  const now = new Date().toISOString();

  const filters: QueryDslQueryContainer[] = [
    // G3: mandatory scope filters — never optional
    { term: { space_id } },
    { term: { 'memory.provenance.author': author } },

    // Belief-state filters
    { term: { deleted: false } },

    // Per-record expiry (D5)
    {
      bool: {
        should: [
          { bool: { must_not: { exists: { field: 'expires_at' } } } },
          { range: { expires_at: { gt: now } } },
        ],
        minimum_should_match: 1,
      },
    },
  ];

  if (category) {
    filters.push({ term: { 'memory.category': category } });
  }

  return filters;
};

export const buildKeywordRetriever = ({
  query,
  space_id,
  author,
  category,
}: BuildRetrieverParams): RetrieverContainer => ({
  standard: {
    query: {
      multi_match: {
        query,
        fields: ['title^2', 'description'],
        type: 'best_fields',
      },
    },
    filter: {
      bool: {
        filter: buildBeliefFilter(space_id, author, category),
      },
    },
  },
});

/**
 * Builds a two-leg RRF retriever for hybrid recall.
 *
 * Legs:
 *  1. BM25 — `multi_match` on `title` + `description` (exact-text match)
 *  2. Semantic — `match` on inherited `content.semantic` wrapped in `linear`
 *
 * All legs share the same mandatory scope + belief filter via the outer RRF's
 * `filter` clause; the standard retrievers do not need their own filter.
 */
export const buildRetriever = ({
  query,
  space_id,
  author,
  category,
  limit,
}: BuildRetrieverParams): RetrieverContainer => {
  const beliefFilter = buildBeliefFilter(space_id, author, category);
  const combinedFilter: QueryDslQueryContainer = { bool: { filter: beliefFilter } };

  // Leg 1: BM25 keyword match
  const bm25Leg: RetrieverContainer = {
    standard: {
      query: {
        multi_match: {
          query,
          fields: ['title^2', 'description'],
          type: 'best_fields',
        },
      },
    },
  };

  // Leg 2: Semantic (dense vector via semantic_text inference)
  const semanticLeg: RetrieverContainer = {
    linear: {
      retrievers: [
        {
          retriever: {
            standard: {
              query: {
                match: {
                  'content.semantic': query,
                },
              },
            },
          },
          weight: 1,
          normalizer: 'minmax',
        },
      ],
      rank_window_size: limit * 2,
    },
  };

  return {
    rrf: {
      retrievers: [bm25Leg, semanticLeg],
      filter: combinedFilter,
      rank_window_size: limit * 2,
      rank_constant: 20,
    },
  };
};
