/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateDiskUsage, type DiskUsageResponse } from './aggregate_disk_usage';

describe('aggregateDiskUsage', () => {
  it('returns empty array for response with only _shards', () => {
    const response: DiskUsageResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
    };
    const result = aggregateDiskUsage(response);
    expect(result).toEqual([]);
  });

  it('aggregates field stats from a single index', () => {
    const response: DiskUsageResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
      'my-index-000001': {
        store_size_in_bytes: 974192723,
        all_fields: {
          total_in_bytes: 973977084,
          inverted_index: { total_in_bytes: 113128526 },
          stored_fields_in_bytes: 653819143,
          doc_values_in_bytes: 131885142,
          points_in_bytes: 62885773,
          norms_in_bytes: 2356,
          term_vectors_in_bytes: 2310,
          knn_vectors_in_bytes: 0,
        },
        fields: {
          '@timestamp': {
            total_in_bytes: 51709993,
            inverted_index: { total_in_bytes: 31172745 },
            stored_fields_in_bytes: 20537248,
            doc_values_in_bytes: 0,
            points_in_bytes: 0,
            norms_in_bytes: 0,
            term_vectors_in_bytes: 0,
            knn_vectors_in_bytes: 0,
          },
          message: {
            total_in_bytes: 30000000,
            inverted_index: { total_in_bytes: 20000000 },
            stored_fields_in_bytes: 10000000,
            doc_values_in_bytes: 0,
            points_in_bytes: 0,
            norms_in_bytes: 0,
            term_vectors_in_bytes: 0,
            knn_vectors_in_bytes: 0,
          },
        },
      },
    };

    const result = aggregateDiskUsage(response);

    expect(result).toHaveLength(2);
    // Results should be sorted by total_in_bytes descending
    expect(result[0].name).toBe('@timestamp');
    expect(result[0].total_in_bytes).toBe(51709993);
    expect(result[0].inverted_index_in_bytes).toBe(31172745);
    expect(result[0].stored_fields_in_bytes).toBe(20537248);

    expect(result[1].name).toBe('message');
    expect(result[1].total_in_bytes).toBe(30000000);
    expect(result[1].inverted_index_in_bytes).toBe(20000000);
    expect(result[1].stored_fields_in_bytes).toBe(10000000);
  });

  it('aggregates field stats across multiple indices', () => {
    const response: DiskUsageResponse = {
      _shards: { total: 2, successful: 2, failed: 0 },
      'my-index-000001': {
        store_size_in_bytes: 500000000,
        all_fields: {
          total_in_bytes: 500000000,
        },
        fields: {
          '@timestamp': {
            total_in_bytes: 50000000,
            inverted_index: { total_in_bytes: 30000000 },
            stored_fields_in_bytes: 20000000,
            doc_values_in_bytes: 0,
            points_in_bytes: 0,
            norms_in_bytes: 0,
            term_vectors_in_bytes: 0,
            knn_vectors_in_bytes: 0,
          },
        },
      },
      'my-index-000002': {
        store_size_in_bytes: 400000000,
        all_fields: {
          total_in_bytes: 400000000,
        },
        fields: {
          '@timestamp': {
            total_in_bytes: 40000000,
            inverted_index: { total_in_bytes: 25000000 },
            stored_fields_in_bytes: 15000000,
            doc_values_in_bytes: 0,
            points_in_bytes: 0,
            norms_in_bytes: 0,
            term_vectors_in_bytes: 0,
            knn_vectors_in_bytes: 0,
          },
          host: {
            total_in_bytes: 20000000,
            inverted_index: { total_in_bytes: 10000000 },
            stored_fields_in_bytes: 10000000,
            doc_values_in_bytes: 0,
            points_in_bytes: 0,
            norms_in_bytes: 0,
            term_vectors_in_bytes: 0,
            knn_vectors_in_bytes: 0,
          },
        },
      },
    };

    const result = aggregateDiskUsage(response);

    expect(result).toHaveLength(2);
    // @timestamp should be first (90MB total) and host second (20MB total)
    expect(result[0].name).toBe('@timestamp');
    expect(result[0].total_in_bytes).toBe(90000000);
    expect(result[0].inverted_index_in_bytes).toBe(55000000);
    expect(result[0].stored_fields_in_bytes).toBe(35000000);

    expect(result[1].name).toBe('host');
    expect(result[1].total_in_bytes).toBe(20000000);
    expect(result[1].inverted_index_in_bytes).toBe(10000000);
    expect(result[1].stored_fields_in_bytes).toBe(10000000);
  });

  it('handles fields with missing optional properties', () => {
    const response: DiskUsageResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
      'my-index-000001': {
        store_size_in_bytes: 100000000,
        all_fields: {
          total_in_bytes: 100000000,
        },
        fields: {
          sparse_field: {
            total_in_bytes: 20000000,
            // Only some properties defined
            stored_fields_in_bytes: 10000000,
          },
        },
      },
    };

    const result = aggregateDiskUsage(response);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('sparse_field');
    expect(result[0].total_in_bytes).toBe(20000000);
    expect(result[0].stored_fields_in_bytes).toBe(10000000);
    // Missing properties should default to 0
    expect(result[0].inverted_index_in_bytes).toBe(0);
    expect(result[0].doc_values_in_bytes).toBe(0);
    expect(result[0].points_in_bytes).toBe(0);
    expect(result[0].norms_in_bytes).toBe(0);
    expect(result[0].term_vectors_in_bytes).toBe(0);
    expect(result[0].knn_vectors_in_bytes).toBe(0);
  });

  it('sorts results by total_in_bytes descending', () => {
    const response: DiskUsageResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
      'my-index-000001': {
        store_size_in_bytes: 150000000,
        all_fields: {
          total_in_bytes: 150000000,
        },
        fields: {
          field_low: { total_in_bytes: 10000000 },
          field_high: { total_in_bytes: 90000000 },
          field_medium: { total_in_bytes: 50000000 },
        },
      },
    };

    const result = aggregateDiskUsage(response);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('field_high');
    expect(result[0].total_in_bytes).toBe(90000000);
    expect(result[1].name).toBe('field_medium');
    expect(result[1].total_in_bytes).toBe(50000000);
    expect(result[2].name).toBe('field_low');
    expect(result[2].total_in_bytes).toBe(10000000);
  });

  it('handles all disk usage components', () => {
    const response: DiskUsageResponse = {
      _shards: { total: 1, successful: 1, failed: 0 },
      'my-index-000001': {
        store_size_in_bytes: 100000000,
        all_fields: {
          total_in_bytes: 100000000,
          inverted_index: { total_in_bytes: 30000000 },
          stored_fields_in_bytes: 25000000,
          doc_values_in_bytes: 20000000,
          points_in_bytes: 15000000,
          norms_in_bytes: 5000000,
          term_vectors_in_bytes: 3000000,
          knn_vectors_in_bytes: 2000000,
        },
        fields: {
          complete_field: {
            total_in_bytes: 100000000,
            inverted_index: { total_in_bytes: 30000000 },
            stored_fields_in_bytes: 25000000,
            doc_values_in_bytes: 20000000,
            points_in_bytes: 15000000,
            norms_in_bytes: 5000000,
            term_vectors_in_bytes: 3000000,
            knn_vectors_in_bytes: 2000000,
          },
        },
      },
    };

    const result = aggregateDiskUsage(response);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'complete_field',
      total_in_bytes: 100000000,
      inverted_index_in_bytes: 30000000,
      stored_fields_in_bytes: 25000000,
      doc_values_in_bytes: 20000000,
      points_in_bytes: 15000000,
      norms_in_bytes: 5000000,
      term_vectors_in_bytes: 3000000,
      knn_vectors_in_bytes: 2000000,
    });
  });

  it('aggregates all components across multiple indices', () => {
    const response: DiskUsageResponse = {
      _shards: { total: 2, successful: 2, failed: 0 },
      'my-index-000001': {
        store_size_in_bytes: 60000000,
        all_fields: { total_in_bytes: 60000000 },
        fields: {
          message: {
            total_in_bytes: 60000000,
            inverted_index: { total_in_bytes: 20000000 },
            stored_fields_in_bytes: 15000000,
            doc_values_in_bytes: 10000000,
            points_in_bytes: 8000000,
            norms_in_bytes: 3000000,
            term_vectors_in_bytes: 2000000,
            knn_vectors_in_bytes: 2000000,
          },
        },
      },
      'my-index-000002': {
        store_size_in_bytes: 40000000,
        all_fields: { total_in_bytes: 40000000 },
        fields: {
          message: {
            total_in_bytes: 40000000,
            inverted_index: { total_in_bytes: 10000000 },
            stored_fields_in_bytes: 10000000,
            doc_values_in_bytes: 8000000,
            points_in_bytes: 6000000,
            norms_in_bytes: 2000000,
            term_vectors_in_bytes: 2000000,
            knn_vectors_in_bytes: 2000000,
          },
        },
      },
    };

    const result = aggregateDiskUsage(response);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'message',
      total_in_bytes: 100000000,
      inverted_index_in_bytes: 30000000,
      stored_fields_in_bytes: 25000000,
      doc_values_in_bytes: 18000000,
      points_in_bytes: 14000000,
      norms_in_bytes: 5000000,
      term_vectors_in_bytes: 4000000,
      knn_vectors_in_bytes: 4000000,
    });
  });
});
