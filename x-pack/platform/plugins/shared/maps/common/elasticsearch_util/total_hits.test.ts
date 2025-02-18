/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTotalHitsGreaterThan, TotalHits } from './total_hits';

describe('total.relation: eq', () => {
  const totalHits = {
    value: 100,
    relation: 'eq' as TotalHits['relation'],
  };

  test('total.value: 100 should be more than 90', () => {
    expect(isTotalHitsGreaterThan(totalHits, 90)).toBe(true);
  });

  test('total.value: 100 should not be more than 100', () => {
    expect(isTotalHitsGreaterThan(totalHits, 100)).toBe(false);
  });

  test('total.value: 100 should not be more than 110', () => {
    expect(isTotalHitsGreaterThan(totalHits, 110)).toBe(false);
  });
});

describe('total.relation: gte', () => {
  const totalHits = {
    value: 100,
    relation: 'gte' as TotalHits['relation'],
  };

  test('total.value: 100 should be more than 90', () => {
    expect(isTotalHitsGreaterThan(totalHits, 90)).toBe(true);
  });

  test('total.value: 100 should be more than 100', () => {
    expect(isTotalHitsGreaterThan(totalHits, 100)).toBe(true);
  });

  test('total.value: 100 should throw error when value is more than 100', () => {
    expect(() => {
      isTotalHitsGreaterThan(totalHits, 110);
    }).toThrow();
  });
});
