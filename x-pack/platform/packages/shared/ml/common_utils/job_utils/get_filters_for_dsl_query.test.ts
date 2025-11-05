/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore } from '@kbn/es-query';
import { getFiltersForDSLQuery } from './get_filters_for_dsl_query';

describe('getFiltersForDSLQuery', () => {
  describe('when DSL query contains match_all', () => {
    test('returns empty array when query contains a must clause that contains match_all', () => {
      const actual = getFiltersForDSLQuery(
        { bool: { must: [{ match_all: {} }] } },
        'dataview-id',
        'test-alias'
      );
      expect(actual).toEqual([]);
    });
  });

  describe('when DSL query is valid', () => {
    const query = {
      bool: {
        must: [],
        filter: [
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2007-09-29T15:05:14.509Z',
                lte: '2022-09-29T15:05:14.509Z',
              },
            },
          },
          {
            match_phrase: {
              response_code: '200',
            },
          },
        ],
        should: [],
        must_not: [],
      },
    };

    test('returns filters with alias', () => {
      const actual = getFiltersForDSLQuery(query, 'dataview-id', 'test-alias');
      expect(actual).toEqual([
        {
          $state: { store: 'appState' },
          meta: {
            alias: 'test-alias',
            disabled: false,
            index: 'dataview-id',
            negate: false,
            type: 'custom',
            value:
              '{"bool":{"must":[],"filter":[{"range":{"@timestamp":{"format":"strict_date_optional_time","gte":"2007-09-29T15:05:14.509Z","lte":"2022-09-29T15:05:14.509Z"}}},{"match_phrase":{"response_code":"200"}}],"should":[],"must_not":[]}}',
          },
          query,
        },
      ]);
    });

    test('returns filter with no alias if alias is not provided', () => {
      const actual = getFiltersForDSLQuery(query, 'dataview-id');
      expect(actual).toEqual([
        {
          $state: { store: 'appState' },
          meta: {
            disabled: false,
            index: 'dataview-id',
            negate: false,
            type: 'custom',
            value:
              '{"bool":{"must":[],"filter":[{"range":{"@timestamp":{"format":"strict_date_optional_time","gte":"2007-09-29T15:05:14.509Z","lte":"2022-09-29T15:05:14.509Z"}}},{"match_phrase":{"response_code":"200"}}],"should":[],"must_not":[]}}',
          },
          query,
        },
      ]);
    });

    test('returns global state filter when GLOBAL_STATE is specified', () => {
      const actual = getFiltersForDSLQuery(
        query,
        'dataview-id',
        undefined,
        FilterStateStore.GLOBAL_STATE
      );
      expect(actual).toEqual([
        {
          $state: { store: 'globalState' },
          meta: {
            disabled: false,
            index: 'dataview-id',
            negate: false,
            type: 'custom',
            value:
              '{"bool":{"must":[],"filter":[{"range":{"@timestamp":{"format":"strict_date_optional_time","gte":"2007-09-29T15:05:14.509Z","lte":"2022-09-29T15:05:14.509Z"}}},{"match_phrase":{"response_code":"200"}}],"should":[],"must_not":[]}}',
          },
          query,
        },
      ]);
    });
  });
});
