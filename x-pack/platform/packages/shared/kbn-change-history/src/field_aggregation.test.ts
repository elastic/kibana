/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildFieldTermsAggregation,
  FIELD_AGGREGATION_NAME,
  parseFieldAggregationResult,
} from './field_aggregation';

describe('field aggregation helpers', () => {
  describe('buildFieldTermsAggregation', () => {
    it('builds a terms aggregation', () => {
      expect(buildFieldTermsAggregation({ field: 'event.action', size: 25 })).toEqual({
        [FIELD_AGGREGATION_NAME]: {
          terms: {
            field: 'event.action',
            size: 25,
            order: { _count: 'desc' },
          },
        },
      });
    });
  });

  describe('parseFieldAggregationResult', () => {
    it('returns parsed buckets and sumOtherDocCount', () => {
      const result = parseFieldAggregationResult(
        {
          [FIELD_AGGREGATION_NAME]: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 3,
            buckets: [
              { key: 'alice', doc_count: 2 },
              { key: 'bob', doc_count: 1 },
            ],
          },
        },
        { field: 'user.name' }
      );

      expect(result).toEqual({
        buckets: [
          { key: 'alice', docCount: 2 },
          { key: 'bob', docCount: 1 },
        ],
        sumOtherDocCount: 3,
      });
    });

    it('returns empty buckets when aggregations are missing', () => {
      expect(parseFieldAggregationResult(undefined, { field: 'user.name' })).toEqual({
        buckets: [],
        sumOtherDocCount: 0,
      });
    });

    it('throws when aggregation shape is not string terms', () => {
      expect(() =>
        parseFieldAggregationResult(
          {
            [FIELD_AGGREGATION_NAME]: {
              value: 42,
            },
          },
          { field: 'user.name' }
        )
      ).toThrow('Expected string terms aggregation for field [user.name]');
    });

    it('throws when buckets is not an array', () => {
      expect(() =>
        parseFieldAggregationResult(
          {
            [FIELD_AGGREGATION_NAME]: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: { nested: { doc_count: 1 } },
            },
          },
          { field: 'user.name' }
        )
      ).toThrow('Expected string terms aggregation for field [user.name]');
    });

    it('throws when bucket key is not a string', () => {
      expect(() =>
        parseFieldAggregationResult(
          {
            [FIELD_AGGREGATION_NAME]: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 123, doc_count: 1 }],
            },
          },
          { field: 'user.name' }
        )
      ).toThrow('Expected string bucket key for keyword field [user.name]');
    });
  });
});
