/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { findSLOParamsSchema } from './find';

const BASE_REQUEST = {
  query: {
    filters: 'irrelevant',
    kqlQuery: 'irrelevant',
    page: '1',
    perPage: '25',
    sortBy: 'error_budget_consumed',
    sortDirection: 'asc',
    hideStale: true,
  },
};

describe('FindSLO schema validation', () => {
  it.each(['not_an_array', 42, [], [42, 'ok']])(
    'returns an error when searchAfter is not a valid JSON array (%s)',
    (searchAfter) => {
      const request = merge(BASE_REQUEST, {
        query: {
          searchAfter,
        },
      });
      const result = findSLOParamsSchema.decode(request);
      expect(result._tag === 'Left').toBe(true);
    }
  );

  it('parses searchAfter correctly', () => {
    const request = merge(BASE_REQUEST, {
      query: {
        searchAfter: JSON.stringify([1, 'ok']),
      },
    });
    const result = findSLOParamsSchema.decode(request);
    expect(result._tag === 'Right').toBe(true);
  });
});
