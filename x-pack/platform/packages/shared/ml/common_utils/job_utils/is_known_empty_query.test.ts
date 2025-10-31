/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isKnownEmptyQuery } from './is_known_empty_query';

describe('isKnownEmptyQuery', () => {
  test('returns true for default lens created query', () => {
    const result = isKnownEmptyQuery({
      bool: {
        filter: [],
        must: [
          {
            match_all: {},
          },
        ],
        must_not: [],
      },
    });
    expect(result).toBe(true);
  });

  test('returns true for default lens created query variation 1', () => {
    const result = isKnownEmptyQuery({
      bool: {
        must: [
          {
            match_all: {},
          },
        ],
        must_not: [],
      },
    });
    expect(result).toBe(true);
  });

  test('returns true for default lens created query variation 2', () => {
    const result = isKnownEmptyQuery({
      bool: {
        must: [
          {
            match_all: {},
          },
        ],
      },
    });
    expect(result).toBe(true);
  });

  test('returns true for QA framework created query4', () => {
    const result = isKnownEmptyQuery({
      match_all: {},
    });
    expect(result).toBe(true);
  });

  test('returns false for query with match_phrase', () => {
    const result = isKnownEmptyQuery({
      match_phrase: {
        region: 'us-east-1',
      },
    });
    expect(result).toBe(false);
  });

  test('returns false for query with match_phrase in should', () => {
    const result = isKnownEmptyQuery({
      bool: {
        should: [
          {
            match_phrase: {
              region: 'us-east-1',
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
    expect(result).toBe(false);
  });
});
