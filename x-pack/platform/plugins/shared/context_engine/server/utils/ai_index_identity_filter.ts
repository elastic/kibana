/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { createSpaceDslFilter } from './space_filter';

/**
 * Matches the single document that identifies `(aiIndexId, spaceId)`.
 */
export const createAiIndexIdentityDslFilter = (
  aiIndexId: string,
  spaceId: string
): QueryDslQueryContainer => ({
  bool: {
    filter: [
      createSpaceDslFilter(spaceId),
      {
        bool: {
          should: [{ term: { id: aiIndexId } }, { ids: { values: [aiIndexId] } }],
          minimum_should_match: 1,
        },
      },
    ],
  },
});
