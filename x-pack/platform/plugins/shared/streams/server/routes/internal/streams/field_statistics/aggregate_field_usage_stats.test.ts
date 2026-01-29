/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesFieldUsageStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import { aggregateFieldUsageStats } from './aggregate_field_usage_stats';

describe('aggregateFieldUsageStats', () => {
  it('returns empty array for empty input', () => {
    const result = aggregateFieldUsageStats([]);
    expect(result).toEqual([]);
  });

  it('returns empty array for response with only _shards', () => {
    const response: IndicesFieldUsageStatsResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
    };
    const result = aggregateFieldUsageStats([response]);
    expect(result).toEqual([]);
  });

  it('aggregates field stats from a single index with a single shard', () => {
    const response: IndicesFieldUsageStatsResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
      'my-index-000001': {
        shards: [
          {
            tracking_id: 'tracking-1',
            tracking_started_at_millis: 1234567890,
            routing: {
              state: 'STARTED',
              primary: true,
              node: 'node-1',
            },
            stats: {
              all_fields: { any: 100 },
              fields: {
                '@timestamp': {
                  any: 50,
                  inverted_index: {
                    terms: 10,
                    postings: 5,
                    proximity: 0,
                    positions: 0,
                    term_frequencies: 0,
                    offsets: 0,
                    payloads: 0,
                  },
                  stored_fields: 20,
                  doc_values: 15,
                  points: 5,
                  norms: 0,
                  term_vectors: 0,
                  knn_vectors: 0,
                },
                message: {
                  any: 30,
                  inverted_index: {
                    terms: 20,
                    postings: 10,
                    proximity: 0,
                    positions: 0,
                    term_frequencies: 0,
                    offsets: 0,
                    payloads: 0,
                  },
                  stored_fields: 10,
                  doc_values: 0,
                  points: 0,
                  norms: 0,
                  term_vectors: 0,
                  knn_vectors: 0,
                },
              },
            },
          },
        ],
      },
    };

    const result = aggregateFieldUsageStats([response]);

    expect(result).toHaveLength(2);
    // Results should be sorted by 'any' descending
    expect(result[0].name).toBe('@timestamp');
    expect(result[0].any).toBe(50);
    expect(result[0].stored_fields).toBe(20);
    expect(result[0].doc_values).toBe(15);
    expect(result[0].inverted_index.terms).toBe(10);

    expect(result[1].name).toBe('message');
    expect(result[1].any).toBe(30);
    expect(result[1].stored_fields).toBe(10);
  });

  it('aggregates field stats across multiple shards in the same index', () => {
    const response: IndicesFieldUsageStatsResponse = {
      _shards: { total: 2, successful: 2, failed: 0 },
      'my-index-000001': {
        shards: [
          {
            tracking_id: 'tracking-1',
            tracking_started_at_millis: 1234567890,
            routing: { state: 'STARTED', primary: true, node: 'node-1' },
            stats: {
              all_fields: { any: 50 },
              fields: {
                '@timestamp': {
                  any: 25,
                  stored_fields: 10,
                  doc_values: 10,
                  points: 5,
                  norms: 0,
                  term_vectors: 0,
                  knn_vectors: 0,
                },
              },
            },
          },
          {
            tracking_id: 'tracking-2',
            tracking_started_at_millis: 1234567890,
            routing: { state: 'STARTED', primary: false, node: 'node-2' },
            stats: {
              all_fields: { any: 50 },
              fields: {
                '@timestamp': {
                  any: 30,
                  stored_fields: 15,
                  doc_values: 10,
                  points: 5,
                  norms: 0,
                  term_vectors: 0,
                  knn_vectors: 0,
                },
              },
            },
          },
        ],
      },
    };

    const result = aggregateFieldUsageStats([response]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('@timestamp');
    // Values should be summed across shards
    expect(result[0].any).toBe(55);
    expect(result[0].stored_fields).toBe(25);
    expect(result[0].doc_values).toBe(20);
    expect(result[0].points).toBe(10);
  });

  it('aggregates field stats across multiple indices', () => {
    const response: IndicesFieldUsageStatsResponse = {
      _shards: { total: 2, successful: 2, failed: 0 },
      'my-index-000001': {
        shards: [
          {
            tracking_id: 'tracking-1',
            tracking_started_at_millis: 1234567890,
            routing: { state: 'STARTED', primary: true, node: 'node-1' },
            stats: {
              all_fields: { any: 100 },
              fields: {
                '@timestamp': {
                  any: 50,
                  stored_fields: 20,
                  doc_values: 20,
                  points: 10,
                  norms: 0,
                  term_vectors: 0,
                  knn_vectors: 0,
                },
              },
            },
          },
        ],
      },
      'my-index-000002': {
        shards: [
          {
            tracking_id: 'tracking-2',
            tracking_started_at_millis: 1234567890,
            routing: { state: 'STARTED', primary: true, node: 'node-1' },
            stats: {
              all_fields: { any: 80 },
              fields: {
                '@timestamp': {
                  any: 40,
                  stored_fields: 15,
                  doc_values: 15,
                  points: 10,
                  norms: 0,
                  term_vectors: 0,
                  knn_vectors: 0,
                },
                host: {
                  any: 20,
                  stored_fields: 10,
                  doc_values: 10,
                  points: 0,
                  norms: 0,
                  term_vectors: 0,
                  knn_vectors: 0,
                },
              },
            },
          },
        ],
      },
    };

    const result = aggregateFieldUsageStats([response]);

    expect(result).toHaveLength(2);
    // @timestamp should be first (90 total) and host second (20 total)
    expect(result[0].name).toBe('@timestamp');
    expect(result[0].any).toBe(90);
    expect(result[0].stored_fields).toBe(35);
    expect(result[0].doc_values).toBe(35);
    expect(result[0].points).toBe(20);

    expect(result[1].name).toBe('host');
    expect(result[1].any).toBe(20);
    expect(result[1].stored_fields).toBe(10);
  });

  it('aggregates field stats from multiple responses', () => {
    const response1: IndicesFieldUsageStatsResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
      'my-index-000001': {
        shards: [
          {
            tracking_id: 'tracking-1',
            tracking_started_at_millis: 1234567890,
            routing: { state: 'STARTED', primary: true, node: 'node-1' },
            stats: {
              all_fields: { any: 50 },
              fields: {
                '@timestamp': {
                  any: 50,
                  stored_fields: 20,
                  doc_values: 20,
                  points: 10,
                  norms: 0,
                  term_vectors: 0,
                  knn_vectors: 0,
                },
              },
            },
          },
        ],
      },
    };

    const response2: IndicesFieldUsageStatsResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
      'my-index-000002': {
        shards: [
          {
            tracking_id: 'tracking-2',
            tracking_started_at_millis: 1234567890,
            routing: { state: 'STARTED', primary: true, node: 'node-1' },
            stats: {
              all_fields: { any: 30 },
              fields: {
                '@timestamp': {
                  any: 30,
                  stored_fields: 15,
                  doc_values: 10,
                  points: 5,
                  norms: 0,
                  term_vectors: 0,
                  knn_vectors: 0,
                },
              },
            },
          },
        ],
      },
    };

    const result = aggregateFieldUsageStats([response1, response2]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('@timestamp');
    expect(result[0].any).toBe(80);
    expect(result[0].stored_fields).toBe(35);
    expect(result[0].doc_values).toBe(30);
    expect(result[0].points).toBe(15);
  });

  it('handles fields with missing optional properties', () => {
    const response: IndicesFieldUsageStatsResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
      'my-index-000001': {
        shards: [
          {
            tracking_id: 'tracking-1',
            tracking_started_at_millis: 1234567890,
            routing: { state: 'STARTED', primary: true, node: 'node-1' },
            stats: {
              all_fields: { any: 20 },
              fields: {
                sparse_field: {
                  any: 20,
                  // Only some properties defined
                  stored_fields: 10,
                },
              },
            },
          },
        ],
      },
    };

    const result = aggregateFieldUsageStats([response]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('sparse_field');
    expect(result[0].any).toBe(20);
    expect(result[0].stored_fields).toBe(10);
    // Missing properties should default to 0
    expect(result[0].doc_values).toBe(0);
    expect(result[0].points).toBe(0);
    expect(result[0].norms).toBe(0);
    expect(result[0].term_vectors).toBe(0);
    expect(result[0].knn_vectors).toBe(0);
    expect(result[0].inverted_index).toEqual({
      terms: 0,
      postings: 0,
      proximity: 0,
      positions: 0,
      term_frequencies: 0,
      offsets: 0,
      payloads: 0,
    });
  });

  it('correctly aggregates inverted_index subfields', () => {
    const response: IndicesFieldUsageStatsResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
      'my-index-000001': {
        shards: [
          {
            tracking_id: 'tracking-1',
            tracking_started_at_millis: 1234567890,
            routing: { state: 'STARTED', primary: true, node: 'node-1' },
            stats: {
              all_fields: { any: 100 },
              fields: {
                message: {
                  any: 100,
                  inverted_index: {
                    terms: 30,
                    postings: 20,
                    proximity: 10,
                    positions: 15,
                    term_frequencies: 10,
                    offsets: 5,
                    payloads: 0,
                  },
                  stored_fields: 10,
                  doc_values: 0,
                  points: 0,
                  norms: 0,
                  term_vectors: 0,
                  knn_vectors: 0,
                },
              },
            },
          },
          {
            tracking_id: 'tracking-2',
            tracking_started_at_millis: 1234567890,
            routing: { state: 'STARTED', primary: false, node: 'node-2' },
            stats: {
              all_fields: { any: 50 },
              fields: {
                message: {
                  any: 50,
                  inverted_index: {
                    terms: 15,
                    postings: 10,
                    proximity: 5,
                    positions: 10,
                    term_frequencies: 5,
                    offsets: 5,
                    payloads: 0,
                  },
                  stored_fields: 5,
                  doc_values: 0,
                  points: 0,
                  norms: 0,
                  term_vectors: 0,
                  knn_vectors: 0,
                },
              },
            },
          },
        ],
      },
    };

    const result = aggregateFieldUsageStats([response]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('message');
    expect(result[0].any).toBe(150);
    expect(result[0].stored_fields).toBe(15);
    expect(result[0].inverted_index).toEqual({
      terms: 45,
      postings: 30,
      proximity: 15,
      positions: 25,
      term_frequencies: 15,
      offsets: 10,
      payloads: 0,
    });
  });

  it('sorts results by any count descending', () => {
    const response: IndicesFieldUsageStatsResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
      'my-index-000001': {
        shards: [
          {
            tracking_id: 'tracking-1',
            tracking_started_at_millis: 1234567890,
            routing: { state: 'STARTED', primary: true, node: 'node-1' },
            stats: {
              all_fields: { any: 100 },
              fields: {
                field_low: { any: 10 },
                field_high: { any: 90 },
                field_medium: { any: 50 },
              },
            },
          },
        ],
      },
    };

    const result = aggregateFieldUsageStats([response]);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('field_high');
    expect(result[0].any).toBe(90);
    expect(result[1].name).toBe('field_medium');
    expect(result[1].any).toBe(50);
    expect(result[2].name).toBe('field_low');
    expect(result[2].any).toBe(10);
  });
});
