/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';

/**
 * Parent filter that scopes options-list aggregations to the current space, matching the executions list.
 */
export const buildSpaceFilter = (spaceId: string): Filter => ({
  meta: {
    type: FILTERS.CUSTOM,
    disabled: false,
    negate: false,
    alias: null,
  },
  query: {
    bool: {
      should: [{ term: { spaceId } }, { bool: { must_not: { exists: { field: 'spaceId' } } } }],
      minimum_should_match: 1,
    },
  },
});
