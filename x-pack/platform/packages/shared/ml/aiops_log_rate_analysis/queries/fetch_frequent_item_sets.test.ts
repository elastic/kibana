/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantTerms } from '@kbn/aiops-test-utils/artificial_logs/significant_terms';

import { getShouldClauses, getFrequentItemSetsAggFields } from './fetch_frequent_item_sets';

describe('getShouldClauses', () => {
  it('returns should clauses for the frequent item sets query', () => {
    const shouldClauses = getShouldClauses(significantTerms);

    expect(shouldClauses).toEqual([
      {
        term: {
          user: 'Peter',
        },
      },
      {
        term: {
          response_code: '500',
        },
      },
      {
        term: {
          url: 'home.php',
        },
      },
      {
        term: {
          url: 'login.php',
        },
      },
    ]);
  });
});

describe('getFrequentItemSetsAggFields', () => {
  it('returns field configurations for the frequent item sets aggregation', () => {
    const frequentItemSetsAggFields = getFrequentItemSetsAggFields(significantTerms);

    expect(frequentItemSetsAggFields).toEqual([
      {
        field: 'user',
        include: ['Peter'],
      },
      {
        field: 'response_code',
        include: ['500'],
      },
      {
        field: 'url',
        include: ['home.php', 'login.php'],
      },
    ]);
  });
});
