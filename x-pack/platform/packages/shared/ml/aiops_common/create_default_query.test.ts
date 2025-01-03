/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDefaultQuery } from './create_default_query';

describe('createDefaultQuery', () => {
  it('should create a default match_all query when no input query is provided', () => {
    const result = createDefaultQuery(undefined, 'timestamp', undefined);
    expect(result).toEqual({
      bool: {
        must: [{ match_all: {} }],
      },
    });
  });

  it('should wrap an existing match_all query in a bool must clause', () => {
    const inputQuery = { match_all: {} };
    const result = createDefaultQuery(inputQuery, 'timestamp', undefined);
    expect(result).toEqual({
      bool: {
        must: [{ match_all: {} }],
      },
    });
  });

  it('should wrap an existing query_string query in a bool must clause', () => {
    const inputQuery = { query_string: { query: '*' } };
    const result = createDefaultQuery(inputQuery, 'timestamp', undefined);
    expect(result).toEqual({
      bool: {
        must: [{ query_string: { query: '*' } }],
      },
    });
  });

  it('should wrap an existing multi_match query in a bool should clause', () => {
    const inputQuery = { multi_match: { query: 'test', fields: ['field1', 'field2'] } };
    const result = createDefaultQuery(inputQuery, 'timestamp', undefined);
    expect(result).toEqual({
      bool: {
        must: [],
        should: { multi_match: { query: 'test', fields: ['field1', 'field2'] } },
      },
    });
  });

  it('should add a time range filter to the query', () => {
    const timeRange = { from: 1609459200000, to: 1609545600000 };
    const result = createDefaultQuery(undefined, 'timestamp', timeRange);
    expect(result).toEqual({
      bool: {
        must: [
          { match_all: {} },
          {
            range: {
              timestamp: {
                gte: 1609459200000,
                lte: 1609545600000,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    });
  });

  it('should merge existing bool query with new time range filter', () => {
    const inputQuery = { bool: { must: [{ term: { field: 'value' } }] } };
    const timeRange = { from: 1609459200000, to: 1609545600000 };
    const result = createDefaultQuery(inputQuery, 'timestamp', timeRange);
    expect(result).toEqual({
      bool: {
        must: [
          { term: { field: 'value' } },
          {
            range: {
              timestamp: {
                gte: 1609459200000,
                lte: 1609545600000,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    });
  });

  it('should handle an existing bool query with must clause', () => {
    const inputQuery = { bool: { must: [{ term: { field: 'value' } }] } };
    const result = createDefaultQuery(inputQuery, 'timestamp', undefined);
    expect(result).toEqual({
      bool: {
        must: [{ term: { field: 'value' } }],
      },
    });
  });

  it('should handle an existing bool query with should clause', () => {
    const inputQuery = { bool: { should: [{ term: { field: 'value' } }] } };
    const result = createDefaultQuery(inputQuery, 'timestamp', undefined);
    expect(result).toEqual({
      bool: {
        must: [],
        should: [{ term: { field: 'value' } }],
      },
    });
  });

  it('should handle an existing bool query with must_not clause', () => {
    const inputQuery = { bool: { must_not: [{ term: { field: 'value' } }] } };
    const result = createDefaultQuery(inputQuery, 'timestamp', undefined);
    expect(result).toEqual({
      bool: {
        must: [],
        must_not: [{ term: { field: 'value' } }],
      },
    });
  });

  it('should handle an existing bool query with filter clause', () => {
    const inputQuery = { bool: { filter: [{ term: { field: 'value' } }] } };
    const result = createDefaultQuery(inputQuery, 'timestamp', undefined);
    expect(result).toEqual({
      bool: {
        must: [],
        filter: [{ term: { field: 'value' } }],
      },
    });
  });

  it('should handle an input query with multiple clauses', () => {
    const inputQuery = {
      bool: {
        must: [{ term: { field1: 'value1' } }],
        should: [{ term: { field2: 'value2' } }],
        must_not: [{ term: { field3: 'value3' } }],
        filter: [{ term: { field4: 'value4' } }],
      },
    };
    const result = createDefaultQuery(inputQuery, 'timestamp', undefined);
    expect(result).toEqual({
      bool: {
        must: [{ term: { field1: 'value1' } }],
        should: [{ term: { field2: 'value2' } }],
        must_not: [{ term: { field3: 'value3' } }],
        filter: [{ term: { field4: 'value4' } }],
      },
    });
  });
});
