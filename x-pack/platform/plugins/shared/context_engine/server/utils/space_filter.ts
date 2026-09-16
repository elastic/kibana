/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

/**
 * Restricts a search to one space. In the default space it also matches documents written before
 * space support existed, which carry no `space` field.
 */
export const createSpaceDslFilter = (spaceId: string): QueryDslQueryContainer =>
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
