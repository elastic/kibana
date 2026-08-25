/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * Parameters for the ES|QL recall query and its authoritative body filter.
 *
 * Recall enforces authoritative space and user-scope filters that are
 * never overridable by tool params.
 */
export interface BuildRecallQueryParams {
  query: string;
  /** Mandatory scope filter — injected unconditionally (G3). */
  space_id: string;
  scope_kind: 'user';
  scope_id: string;
  /** Optional category filter applied on top of the belief filter. */
  category?: string;
  /** Optional exact tags; every supplied tag must be present. */
  tags?: string[];
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
 *  - `memory.scope_kind` and `memory.scope_id` (G3)
 */
const buildBeliefFilterClauses = (
  space_id: string,
  scope_kind: 'user',
  scope_id: string,
  category?: string,
  tags?: string[]
): QueryDslQueryContainer[] => {
  const now = new Date().toISOString();

  const filters: QueryDslQueryContainer[] = [
    // G3: mandatory scope filters — never optional
    { term: { space_id } },
    { term: { 'memory.scope_kind': scope_kind } },
    { term: { 'memory.scope_id': scope_id } },

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

  for (const tag of tags ?? []) {
    filters.push({ term: { tags: tag } });
  }

  return filters;
};

export const buildBeliefFilter = ({
  space_id,
  scope_kind,
  scope_id,
  category,
  tags,
}: Omit<BuildRecallQueryParams, 'query' | 'limit'>): QueryDslQueryContainer => ({
  bool: {
    filter: buildBeliefFilterClauses(space_id, scope_kind, scope_id, category, tags),
  },
});

export const buildHybridRecallPipeline = ({
  query,
  limit,
}: Pick<BuildRecallQueryParams, 'query' | 'limit'>): ComposerQuery => {
  const candidateLimit = limit * 2;

  return esql`
    FORK
      (
        WHERE MATCH(title, ${{ lexicalTitleQuery: query }}, {"boost": 2.0})
           OR MATCH(description, ${{ lexicalDescriptionQuery: query }})
        | EVAL age_days = DATE_DIFF("day", @timestamp, NOW())
        | EVAL recency_boost = CASE(age_days <= 0, 0.1, 3.0 / (30.0 + age_days))
        | EVAL _score = _score + recency_boost
        | SORT _score DESC
        | LIMIT ${candidateLimit}
      )
      (
        WHERE MATCH(content.semantic, ${{ semanticQuery: query }})
        | SORT _score DESC
        | LIMIT ${candidateLimit}
      )
    | FUSE RRF WITH {"rank_constant": 20}
    | SORT _score DESC, _id ASC
    | LIMIT ${limit}
    | EVAL category = memory.category,
           memory_type = memory.type,
           author = memory.provenance.author,
           author_kind = memory.provenance.author_kind,
           revision = memory.revision
    | KEEP _id, title, description, category, memory_type, tags, created_at,
           author, author_kind, revision
  `;
};

export const buildKeywordRecallPipeline = ({
  query,
  limit,
}: Pick<BuildRecallQueryParams, 'query' | 'limit'>): ComposerQuery =>
  esql`
    WHERE MATCH(title, ${{ lexicalTitleQuery: query }}, {"boost": 2.0})
       OR MATCH(description, ${{ lexicalDescriptionQuery: query }})
    | EVAL age_days = DATE_DIFF("day", @timestamp, NOW())
    | EVAL recency_boost = CASE(age_days <= 0, 0.1, 3.0 / (30.0 + age_days))
    | EVAL _score = _score + recency_boost
    | WHERE _score >= 1
    | SORT _score DESC, _id ASC
    | LIMIT ${limit}
    | EVAL category = memory.category,
           memory_type = memory.type,
           author = memory.provenance.author,
           author_kind = memory.provenance.author_kind,
           revision = memory.revision
    | KEEP _id, title, description, category, memory_type, tags, created_at,
           author, author_kind, revision
  `;
