/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const AI_INDEX_PRIVILEGES_PATH = 'permissions.kibana.privileges';
const SPACE_FIELD = `${AI_INDEX_PRIVILEGES_PATH}.space`;

/** Flat `copy_to` sibling of the nested `.space` leaf; the managed mappings component defines it. */
export const AI_INDEX_SPACES_FIELD = 'permissions.kibana.spaces';

/**
 * ES|QL `WHERE` equivalent of {@link buildAiIndexSpaceFilter} over the flat `copy_to` column, for
 * Elastic-managed AI indices only. A `nested` request filter is skipped on views with a processing
 * command; a `WHERE` is not.
 */
export const buildAiIndexSpaceWhere = (spaceId: string): string =>
  `WHERE ${AI_INDEX_SPACES_FIELD} IS NULL OR MV_CONTAINS(${AI_INDEX_SPACES_FIELD}, ${JSON.stringify(
    spaceId
  )}) OR MV_CONTAINS(${AI_INDEX_SPACES_FIELD}, "*")`;

/**
 * ES|QL `filter` for AI-index reads: docs with no `permissions.kibana.privileges`, or one scoped to
 * `spaceId` or `*`. Like SML `buildVisibilityFilter` minus Kibana object-privilege check; ES RBAC
 * comes from `asCurrentUser`. `ignore_unmapped` keeps indices lacking this field. Explicit
 * `minimum_should_match: 1` required for FORK filter pushdown; do not drop.
 */
export const buildAiIndexSpaceFilter = (spaceId: string): QueryDslQueryContainer => ({
  bool: {
    should: [
      {
        bool: {
          must_not: {
            nested: {
              path: AI_INDEX_PRIVILEGES_PATH,
              query: { match_all: {} },
              ignore_unmapped: true,
            },
          },
        },
      },
      {
        nested: {
          path: AI_INDEX_PRIVILEGES_PATH,
          ignore_unmapped: true,
          query: {
            bool: {
              should: [{ term: { [SPACE_FIELD]: spaceId } }, { term: { [SPACE_FIELD]: '*' } }],
              minimum_should_match: 1,
            },
          },
        },
      },
    ],
    minimum_should_match: 1,
  },
});
