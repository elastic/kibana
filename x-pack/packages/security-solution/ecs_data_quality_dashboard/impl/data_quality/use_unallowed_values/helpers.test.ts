/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';

import {
  fetchUnallowedValues,
  getUnallowedValueCount,
  getUnallowedValues,
  isBucket,
} from './helpers';
import { mockUnallowedValuesResponse } from '../mock/unallowed_values/mock_unallowed_values';
import { UnallowedValueRequestItem, UnallowedValueSearchResult } from '../types';
import { INTERNAL_API_VERSION } from '../helpers';

describe('helpers', () => {
  let originalFetch: (typeof global)['fetch'];

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('isBucket', () => {
    test('it returns true when the bucket is valid', () => {
      expect(
        isBucket({
          key: 'stop',
          doc_count: 2,
        })
      ).toBe(true);
    });

    test('it returns false when just `key` is missing', () => {
      expect(
        isBucket({
          doc_count: 2,
        })
      ).toBe(false);
    });

    test('it returns false when just `key` has an incorrect type', () => {
      expect(
        isBucket({
          key: 1234, // <-- should be a string
          doc_count: 2,
        })
      ).toBe(false);
    });

    test('it returns false when just `doc_count` is missing', () => {
      expect(
        isBucket({
          key: 'stop',
        })
      ).toBe(false);
    });

    test('it returns false when just `doc_count` has an incorrect type', () => {
      expect(
        isBucket({
          key: 'stop',
          doc_count: 'foo', // <-- should be a number
        })
      ).toBe(false);
    });

    test('it returns false when both `key` and `doc_count` are missing', () => {
      expect(isBucket({})).toBe(false);
    });

    test('it returns false when both `key` and `doc_count` have incorrect types', () => {
      expect(
        isBucket({
          key: 1234, // <-- should be a string
          doc_count: 'foo', // <-- should be a number
        })
      ).toBe(false);
    });

    test('it returns false when `maybeBucket` is undefined', () => {
      expect(isBucket(undefined)).toBe(false);
    });
  });

  describe('getUnallowedValueCount', () => {
    test('it returns the expected count', () => {
      expect(
        getUnallowedValueCount({
          key: 'stop',
          doc_count: 2,
        })
      ).toEqual({ count: 2, fieldName: 'stop' });
    });
  });

  describe('getUnallowedValues', () => {
    const requestItems: UnallowedValueRequestItem[] = [
      {
        indexName: 'auditbeat-custom-index-1',
        indexFieldName: 'event.category',
        allowedValues: [
          'authentication',
          'configuration',
          'database',
          'driver',
          'email',
          'file',
          'host',
          'iam',
          'intrusion_detection',
          'malware',
          'network',
          'package',
          'process',
          'registry',
          'session',
          'threat',
          'vulnerability',
          'web',
        ],
      },
      {
        indexName: 'auditbeat-custom-index-1',
        indexFieldName: 'event.kind',
        allowedValues: [
          'alert',
          'enrichment',
          'event',
          'metric',
          'state',
          'pipeline_error',
          'signal',
        ],
      },
      {
        indexName: 'auditbeat-custom-index-1',
        indexFieldName: 'event.outcome',
        allowedValues: ['failure', 'success', 'unknown'],
      },
      {
        indexName: 'auditbeat-custom-index-1',
        indexFieldName: 'event.type',
        allowedValues: [
          'access',
          'admin',
          'allowed',
          'change',
          'connection',
          'creation',
          'deletion',
          'denied',
          'end',
          'error',
          'group',
          'indicator',
          'info',
          'installation',
          'protocol',
          'start',
          'user',
        ],
      },
    ];

    const searchResults: UnallowedValueSearchResult[] = [
      {
        aggregations: {
          'event.category': {
            buckets: [
              {
                key: 'an_invalid_category',
                doc_count: 2,
              },
              {
                key: 'theory',
                doc_count: 1,
              },
            ],
          },
        },
      },
      {
        aggregations: {
          'event.kind': {
            buckets: [],
          },
        },
      },
      {
        aggregations: {
          'event.outcome': {
            buckets: [],
          },
        },
      },
      {
        aggregations: {
          'event.type': {
            buckets: [],
          },
        },
      },
    ];

    test('it returns the expected unallowed values', () => {
      expect(
        getUnallowedValues({
          requestItems,
          searchResults,
        })
      ).toEqual({
        'event.category': [
          { count: 2, fieldName: 'an_invalid_category' },
          { count: 1, fieldName: 'theory' },
        ],
        'event.kind': [],
        'event.outcome': [],
        'event.type': [],
      });
    });

    test('it returns an empty index when `searchResults` is null', () => {
      expect(
        getUnallowedValues({
          requestItems,
          searchResults: null,
        })
      ).toEqual({});
    });

    test('it returns an empty index when `searchResults` is not an array', () => {
      expect(
        getUnallowedValues({
          requestItems,
          // @ts-expect-error
          searchResults: 1234,
        })
      ).toEqual({});
    });

    test('it returns the expected results when `searchResults` does NOT have `aggregations`', () => {
      const noAggregations: UnallowedValueSearchResult[] = searchResults.map((x) =>
        omit('aggregations', x)
      );

      expect(
        getUnallowedValues({
          requestItems,
          searchResults: noAggregations,
        })
      ).toEqual({
        'event.category': [],
        'event.kind': [],
        'event.outcome': [],
        'event.type': [],
      });
    });

    test('it returns the expected unallowed values when SOME buckets are invalid', () => {
      const someInvalid: UnallowedValueSearchResult[] = [
        {
          aggregations: {
            'event.category': {
              buckets: [
                {
                  key: 'foo',
                  // @ts-expect-error
                  doc_count: 'this-is-an-invalid-bucket', // <-- invalid type, should be number
                },
                {
                  key: 'bar',
                  doc_count: 1,
                },
              ],
            },
          },
        },
        {
          aggregations: {
            'event.kind': {
              buckets: [],
            },
          },
        },
        {
          aggregations: {
            'event.outcome': {
              buckets: [],
            },
          },
        },
        {
          aggregations: {
            'event.type': {
              buckets: [],
            },
          },
        },
      ];

      expect(
        getUnallowedValues({
          requestItems,
          searchResults: someInvalid,
        })
      ).toEqual({
        'event.category': [{ count: 1, fieldName: 'bar' }],
        'event.kind': [],
        'event.outcome': [],
        'event.type': [],
      });
    });
  });

  describe('fetchUnallowedValues', () => {
    const requestItems: UnallowedValueRequestItem[] = [
      {
        indexName: 'auditbeat-custom-index-1',
        indexFieldName: 'event.category',
        allowedValues: [
          'authentication',
          'configuration',
          'database',
          'driver',
          'email',
          'file',
          'host',
          'iam',
          'intrusion_detection',
          'malware',
          'network',
          'package',
          'process',
          'registry',
          'session',
          'threat',
          'vulnerability',
          'web',
        ],
      },
      {
        indexName: 'auditbeat-custom-index-1',
        indexFieldName: 'event.kind',
        allowedValues: [
          'alert',
          'enrichment',
          'event',
          'metric',
          'state',
          'pipeline_error',
          'signal',
        ],
      },
      {
        indexName: 'auditbeat-custom-index-1',
        indexFieldName: 'event.outcome',
        allowedValues: ['failure', 'success', 'unknown'],
      },
      {
        indexName: 'auditbeat-custom-index-1',
        indexFieldName: 'event.type',
        allowedValues: [
          'access',
          'admin',
          'allowed',
          'change',
          'connection',
          'creation',
          'deletion',
          'denied',
          'end',
          'error',
          'group',
          'indicator',
          'info',
          'installation',
          'protocol',
          'start',
          'user',
        ],
      },
    ];

    test('it includes the expected content in the `fetch` request', async () => {
      const mockFetch = jest.fn().mockResolvedValue(mockUnallowedValuesResponse);
      const abortController = new AbortController();

      await fetchUnallowedValues({
        abortController,
        httpFetch: mockFetch,
        indexName: 'auditbeat-custom-index-1',
        requestItems,
      });

      expect(mockFetch).toBeCalledWith(
        '/internal/ecs_data_quality_dashboard/unallowed_field_values',
        {
          body: JSON.stringify(requestItems),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          signal: abortController.signal,
          version: INTERNAL_API_VERSION,
        }
      );
    });

    test('it returns the expected unallowed values', async () => {
      const mockFetch = jest.fn().mockResolvedValue(mockUnallowedValuesResponse);

      const result = await fetchUnallowedValues({
        abortController: new AbortController(),
        httpFetch: mockFetch,
        indexName: 'auditbeat-custom-index-1',
        requestItems,
      });

      expect(result).toEqual([
        {
          _shards: { failed: 0, skipped: 0, successful: 1, total: 1 },
          aggregations: {
            'event.category': {
              buckets: [
                { doc_count: 2, key: 'an_invalid_category' },
                { doc_count: 1, key: 'theory' },
              ],
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
            },
          },
          hits: { hits: [], max_score: null, total: { relation: 'eq', value: 3 } },
          status: 200,
          timed_out: false,
          took: 1,
        },
        {
          _shards: { failed: 0, skipped: 0, successful: 1, total: 1 },
          aggregations: {
            'event.kind': { buckets: [], doc_count_error_upper_bound: 0, sum_other_doc_count: 0 },
          },
          hits: { hits: [], max_score: null, total: { relation: 'eq', value: 4 } },
          status: 200,
          timed_out: false,
          took: 0,
        },
        {
          _shards: { failed: 0, skipped: 0, successful: 1, total: 1 },
          aggregations: {
            'event.outcome': {
              buckets: [],
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
            },
          },
          hits: { hits: [], max_score: null, total: { relation: 'eq', value: 4 } },
          status: 200,
          timed_out: false,
          took: 0,
        },
        {
          _shards: { failed: 0, skipped: 0, successful: 1, total: 1 },
          aggregations: {
            'event.type': { buckets: [], doc_count_error_upper_bound: 0, sum_other_doc_count: 0 },
          },
          hits: { hits: [], max_score: null, total: { relation: 'eq', value: 4 } },
          status: 200,
          timed_out: false,
          took: 0,
        },
      ]);
    });

    test('it throws the expected error when fetch fails', async () => {
      const error = 'simulated error';
      const mockFetch = jest.fn().mockImplementation(() => {
        throw new Error(error);
      });

      await expect(
        fetchUnallowedValues({
          abortController: new AbortController(),
          httpFetch: mockFetch,
          indexName: 'auditbeat-custom-index-1',
          requestItems,
        })
      ).rejects.toThrowError(
        'Error loading unallowed values for index auditbeat-custom-index-1: simulated error'
      );
    });
  });
});
